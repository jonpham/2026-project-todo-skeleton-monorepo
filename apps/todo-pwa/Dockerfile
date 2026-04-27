# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm (pinned to match packageManager in root package.json)
RUN npm install -g pnpm@10.33.0

# Copy workspace manifests first to maximise Docker layer caching.
# pnpm needs the root workspace files to resolve monorepo dependencies.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/todo-pwa/package.json ./apps/todo-pwa/

RUN pnpm install --frozen-lockfile

# Copy application source and build
COPY apps/todo-pwa/ ./apps/todo-pwa/

RUN pnpm --filter todo-pwa build

# Stage 2: Server
FROM nginx:alpine AS server

# Copy built assets from builder stage
COPY --from=builder /app/apps/todo-pwa/dist /usr/share/nginx/html

# Nginx SPA config with correct PWA cache headers
COPY apps/todo-pwa/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
