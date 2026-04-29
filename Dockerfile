# syntax=docker/dockerfile:1.7

# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.33.0

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=secret,id=github_token \
  GITHUB_TOKEN="$(cat /run/secrets/github_token)" \
  && printf '@jonpham:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n' "$GITHUB_TOKEN" > .npmrc \
  && pnpm install --frozen-lockfile \
  && rm .npmrc

COPY . .

RUN pnpm build

# Stage 2: Server
FROM nginx:alpine AS server

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
