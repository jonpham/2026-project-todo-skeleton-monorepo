---
id: P3
title: Docker & Local Container Deploy
status: DONE
branch: feat/P3-docker-local-deploy
pr: ""
started_at: "2026-04-27"
completed_at: "2026-04-27"
step_gating: false
---

# P3 — Docker & Local Container Deploy

## Goal

Containerize the NestJS API so it can be run locally via `docker compose up` without a local Node.js install.

## Steps

- [x] Add `.dockerignore`
- [x] Create multi-stage `Dockerfile` (builder + runtime, `node:22-alpine`)
- [x] Create `docker-compose.yml` (port 3001:3000, ephemeral SQLite)
- [x] Add `deploy:local` and `deploy:local:stop` scripts to `package.json`
- [x] Populate `docs/DEPLOYMENT.md` with prerequisites, quick start, verify, and stop instructions
- [x] Create this feature doc

## Acceptance Criteria

- [x] `docker compose up --build` builds and starts the API at `localhost:3001`
- [x] `curl http://localhost:3001/v1/todos` returns `200 []`
- [x] `curl -X POST http://localhost:3001/v1/todos ...` returns `201` with a todo object
- [x] Container restarts reset the SQLite database (`prisma migrate reset --force --skip-seed` runs on every startup; validated via: create a todo → `docker compose restart todo-api` → `curl http://localhost:3001/v1/todos` returns `[]`)
- [x] `docker compose down` stops and removes the container cleanly
- [x] `docs/DEPLOYMENT.md` is fully populated

## Files Changed

- `.dockerignore` — created
- `Dockerfile` — created (multi-stage builder/runtime)
- `docker-compose.yml` — created
- `package.json` — added `deploy:local` and `deploy:local:stop` scripts
- `docs/DEPLOYMENT.md` — populated with full local deploy guide
- `docs/features/[IN-PROGRESS]P3_docker-local-deploy.md` — this file
