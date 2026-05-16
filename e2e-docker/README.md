# e2e-docker

L4 full-platform Playwright tests that exercise the deployed Docker Compose
stack (PWA nginx + NestJS API + persistent SQLite volume). These are the only
tests in the repo that talk to a real production-style stack end-to-end.

## What is covered

| Spec                         | What it verifies                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `offline-sync.spec.ts`       | Offline banner toggles with `setOffline(true/false)`; create-offline → pending badge → sync clears on reconnect |
| `volume-persistence.spec.ts` | A todo created in the PWA survives `docker compose down && up` (named-volume SQLite persistence)                |

## Prerequisites

- Docker Desktop running
- `GITHUB_TOKEN` available — the API Dockerfile installs from GitHub Packages.
  Either set it explicitly (`export GITHUB_TOKEN="$(gh auth token)"`) or put it
  in the root `.env`.

## Running offline-sync

```bash
# From the monorepo root
GITHUB_TOKEN="$(gh auth token)" pnpm deploy:local
pnpm --filter e2e-docker test:offline
pnpm deploy:local:stop
```

## Running volume-persistence (two-phase)

Playwright cannot orchestrate `docker compose down/up` from within a test, so
the persistence spec is split into two phases gated by `PERSISTENCE_PHASE`.

```bash
# Phase 1 — create a known todo
GITHUB_TOKEN="$(gh auth token)" pnpm deploy:local
PERSISTENCE_PHASE=create pnpm --filter e2e-docker test:persistence

# Cycle the stack — named volume `todo-db-data` must survive
docker compose down
GITHUB_TOKEN="$(gh auth token)" docker compose up --wait

# Phase 2 — verify the todo survived
PERSISTENCE_PHASE=verify pnpm --filter e2e-docker test:persistence

pnpm deploy:local:stop
```

`docker compose down -v` (with `-v`) wipes the volume and is the right way to
reset state between unrelated test runs.

## Configuration

- **`baseURL`** defaults to `http://localhost:3000` (the PWA nginx port from
  `docker-compose.yml`). Override with `PLAYWRIGHT_BASE_URL` for a different
  stack (e.g. a preview deploy).
- All other Playwright options live in `playwright.config.ts`.

## Why these are not in `pnpm test`

`pnpm test` at the monorepo root is reserved for L1 unit tests that run in
seconds without external infra. L4 needs a live Docker stack, so it lives
behind `test:e2e` / `test:offline` / `test:persistence` scripts and is not
discovered by Turbo's default `test` task.
