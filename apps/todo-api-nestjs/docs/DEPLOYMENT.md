# Deployment — todo-api-nestjs

## Local Docker Deploy (Quick Start)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [OrbStack](https://orbstack.dev/) installed and running

### Start

```bash
pnpm deploy:local
```

This builds the image and starts the API container in detached mode. The API will be available at `http://localhost:3001`.

### Verify

```bash
curl http://localhost:3001/v1/todos
# → 200 []

curl -X POST http://localhost:3001/v1/todos \
  -H 'Content-Type: application/json' \
  -d '{"description":"test"}'
# → 201 { id, description, completed, createdAt, updatedAt }
```

### Stop

```bash
pnpm deploy:local:stop
```

### Note on SQLite (Ephemeral Data)

The container runs `prisma migrate reset --force --skip-seed` on every startup, which drops and recreates the database schema with no rows. **All data is lost on every container start, including `docker compose restart`.** This is intentional for local development — the database always starts fresh.

To validate restart-reset behavior:

```bash
# Create a todo, then restart and confirm the list is empty again
curl -X POST http://localhost:3001/v1/todos \
  -H 'Content-Type: application/json' \
  -d '{"description":"will disappear"}'
docker compose restart todo-api
curl http://localhost:3001/v1/todos
# → 200 []
```

---

## Environment Variables

| Variable | Description | Default (Docker) |
|---|---|---|
| `DATABASE_URL` | SQLite file path or connection string | `file:./dev.db` |
| `NODE_ENV` | Runtime environment | `production` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `PORT` | Port the server listens on | `3000` |

---

## Build & Run (Manual, without Docker)

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm build
node dist/main
```

---

## CI/CD

See `.github/workflows/ci.yml` for the automated lint + test + build pipeline.
