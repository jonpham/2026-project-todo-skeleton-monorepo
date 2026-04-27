# Stage 1 — builder
FROM node:22-alpine AS builder

# Install pnpm pinned to 10.x
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy dependency manifests and prisma schema first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm prisma generate

# Copy remaining source and build
COPY . .
RUN pnpm build

# Stage 2 — runtime
FROM node:22-alpine AS runtime

WORKDIR /app

# Copy built artifacts and runtime dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
