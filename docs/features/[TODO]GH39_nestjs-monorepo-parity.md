---
project: "2026-project-todo-skeleton-monorepo"
phase: 8
slug: "nestjs-monorepo-parity"
status: TODO
step_gating: false
issue: 39
epic_issue: null
parent_issue: null
upstream_repos: ["jonpham/2026-project-todo-api-nestjs"]
upstream_issues: ["jonpham/2026-project-todo-api-nestjs#1"]
branch: null
pr: null
completed_at: null
---

# Phase 8 — NestJS Monorepo Parity (W1)

## Context

The NestJS API (`apps/todo-api-nestjs`) is a git subtree from `jonpham/2026-project-todo-api-nestjs`. Changes
to app code must go upstream first — direct edits to `apps/todo-api-nestjs/` in the monorepo
will be overwritten on the next `git subtree pull`.

This phase delivers three upstream changes to `jonpham/2026-project-todo-api-nestjs` and the monorepo
infrastructure that wires the full stack together via Docker Compose.

**Upstream changes (must PR to `jonpham/2026-project-todo-api-nestjs` first):**

- `/health` endpoint (NestJS TerminusModule)
- `findOrFail` private helper in `todos.service.ts` (DRY — 3 callers)
- `id?: string` on `CreateTodoDto` with `@IsOptional() @IsUUID()` validation

**Monorepo-only changes:**

- Docker Compose stack (`docker-compose.yml`) with nginx proxy, NestJS API service, SQLite volume
- nginx config routing `/api` → NestJS, `/` → PWA static files
- SQLite named volume for data persistence across restarts
- `subtree-sync.sh` helper script documenting the pull/push workflow

## Scope

**Included (upstream — `jonpham/2026-project-todo-api-nestjs`):**

- `src/health/health.controller.ts` and `src/app.module.ts` — TerminusModule health check at `GET /health`
- `src/todos/todos.service.ts` — extract `findOrFail(id)` private method; used by `findOne`, `update`, `remove`
- `src/todos/dto/create-todo.dto.ts` — add `@IsOptional() @IsUUID() id?: string`

**Included (monorepo):**

- `docker-compose.yml` — services: `pwa` (nginx), `api` (NestJS), named volume `todo-db-data`
- `infra/nginx/nginx.conf` — proxy `/api/` → `http://api:3001/`, serve `/` from PWA build
- `subtree-sync.sh` — documented workflow for pulling upstream changes into monorepo

**Excluded:**

- Kubernetes / Helm (Phase W4)
- Authentication
- Multi-database support (SQLite only in Phase 1)

## Dependencies

- Phase 5 complete (subtree integration — NestJS app already in `apps/todo-api-nestjs/`)
- `jonpham/2026-project-todo-api-nestjs` upstream repo accessible via GitHub

## Acceptance Criteria

- [ ] `GET /health` returns `200 { status: 'ok' }` (NestJS TerminusModule)
- [ ] `findOrFail` extracted: `todos.service.ts` has no repeated `findUnique + NotFoundException` pattern
- [ ] POST `/v1/todos` with `{ id: "client-uuid", description: "test" }` → 201, `response.id === "client-uuid"`
- [ ] POST `/v1/todos` without `id` → 201, `response.id` is a server-generated UUID
- [ ] `docker compose up` starts PWA + API successfully; `curl http://localhost/api/health` returns `{ status: 'ok' }`
- [ ] `curl http://localhost/` serves the PWA HTML
- [ ] SQLite data persists after `docker compose down && docker compose up` (named volume)
- [ ] `subtree-sync.sh` documents the upstream pull command and is executable

## Steps

- [ ] **Step 1 (UPSTREAM)** — PR to `jonpham/2026-project-todo-api-nestjs`: add `GET /health` via `@nestjs/terminus`; add `findOrFail` private helper to `todos.service.ts`; add `id?: string` to `CreateTodoDto` with `@IsOptional() @IsUUID()`
- [ ] **Step 2** — After upstream PR is merged: `git subtree pull --prefix=apps/todo-api-nestjs git@github.com:jonpham/2026-project-todo-api-nestjs.git main --squash` to sync changes into monorepo
- [ ] **Step 3** — Create `docker-compose.yml`: `pwa` service (nginx, builds from `apps/todo-pwa-vite`), `api` service (NestJS, builds from `apps/todo-api-nestjs`), named volume `todo-db-data` mounted at `/data` in the API container
- [ ] **Step 4** — Create `infra/nginx/nginx.conf`: proxy `location /api/` → `http://api:3001/`; serve `location /` from `/usr/share/nginx/html` (PWA build output)
- [ ] **Step 5** — Create `subtree-sync.sh`: documents `git subtree pull` and `git subtree push` commands for each upstream app; mark executable (`chmod +x`)
- [ ] **Step 6** — Verify full stack: `docker compose up --build`, create a todo via PWA at `http://localhost`, verify it persists in SQLite after `docker compose restart api`
- [ ] **Step 7** — Update this feature doc to DONE

## Technical Notes

- **UPSTREAM FIRST:** Steps marked `(UPSTREAM)` cannot be executed directly in `apps/todo-api-nestjs/` in the monorepo. They must be PRed to `jonpham/2026-project-todo-api-nestjs` and merged, then synced via `git subtree pull`. Editing subtree-owned files directly in the monorepo will cause conflicts on the next sync.
- **SQLite volume path:** NestJS `DATABASE_URL` in production should be `file:/data/prod.db`. The Docker Compose `todo-db-data` volume mounts to `/data`. The `docker-compose.yml` sets `DATABASE_URL=file:/data/prod.db` via environment.
- **nginx proxy trailing slash:** `location /api/` with trailing slash is required to strip the `/api` prefix before forwarding to NestJS. Without trailing slash, requests arrive at NestJS with `/api/v1/todos` instead of `/v1/todos`.
- **`findOrFail` pattern:** `private async findOrFail(id: string): Promise<Todo> { const todo = await this.prisma.todo.findUnique({ where: { id } }); if (!todo) throw new NotFoundException(\`Todo \${id} not found\`); return todo; }` — replaces three identical try/catch blocks.
- **`CreateTodoDto id?`:** Prisma passes through client-provided `id` if present in create data — `@id @default(uuid())` only applies when no id is supplied. No schema migration needed.

## Upstream Issue Routing

Steps 1–2 are tracked in `jonpham/2026-project-todo-api-nestjs` (see `upstream_issues` in frontmatter once
created). Steps 3–7 are monorepo-only and tracked in this issue. The monorepo parent issue body
references the upstream issue for visibility.

## Test Strategy

| Level     | Location                                         | Tool                             | Scope                                                     |
| --------- | ------------------------------------------------ | -------------------------------- | --------------------------------------------------------- |
| L3 System | `apps/todo-api-nestjs/test/todos.system.spec.ts` | Vitest + supertest + real SQLite | /health, findOrFail behavior, CreateTodoDto id? — Phase 7 |
| L4 E2E    | `e2e-docker/volume-persistence.spec.ts`          | Playwright + Docker Compose      | Full stack smoke + volume persistence — Phase 7           |

Upstream changes are covered by the L3 system tests in Phase 7. No new test files in this phase —
tests ship in Phase 7 which depends on this phase being complete.

## Assumptions

- `jonpham/2026-project-todo-api-nestjs` uses NestJS v10+ (TerminusModule compatible).
- The PWA build output directory is `apps/todo-pwa-vite/dist` — nginx Dockerfile copies from there.
- Docker Compose v2 syntax (`docker compose`, not `docker-compose`).
- The `/data` directory inside the API container is writable by the NestJS process user.

## Change Log

| Date | PR  | Status Change | Notes                                             |
| ---- | --- | ------------- | ------------------------------------------------- |
|      |     | TODO          | Created for W1 workstream (eng review 2026-04-28) |
