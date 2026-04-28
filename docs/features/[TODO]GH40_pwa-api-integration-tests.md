---
project: "2026-project-todo-skeleton-monorepo"
phase: 7
slug: "pwa-api-integration-tests"
status: TODO
step_gating: false
issue: 40
epic_issue: null
parent_issue: null
upstream_repos:
  ["jonpham/2026-project-todo-pwa-vite", "jonpham/2026-project-todo-api-nestjs"]
upstream_issues:
  [
    "jonpham/2026-project-todo-pwa-vite#3",
    "jonpham/2026-project-todo-api-nestjs#2",
  ]
branch: null
pr: null
completed_at: null
---

# Phase 7 — Integration Tests & Full-Stack E2E

## Context

Phase 6 delivered `useTodoApi` with L1 unit tests for queue logic. This phase adds the remaining
test layers: L3 system integration tests for the NestJS API against a real SQLite database, and
L4 full-platform E2E tests via Docker Compose + Playwright covering the offline-first cycle
end-to-end. After this phase the Integration Phase 1 Epic is complete.

Test levels:

| Level | Name               | DB                           | Mocks                          |
| ----- | ------------------ | ---------------------------- | ------------------------------ | ------------------------------------------- |
| L1    | Unit               | none                         | fetch, localStorage, navigator |
| L2    | Inter-unit         | none                         | mocked DB                      | ← deferred (no complex component graph yet) |
| L3    | System integration | real SQLite (test.db)        | none                           |
| L4    | Full platform E2E  | real SQLite + Docker Compose | none                           |

L2 is explicitly deferred — there is no complex component interaction graph on the client surface
yet that justifies inter-unit tests beyond what L1 already covers.

## Scope

**Included:**

- `apps/todo-api-nestjs/test/todos.system.spec.ts` — L3 smoke: full CRUD against real SQLite,
  beforeAll migrate, afterEach deleteMany, no HTTP mocks
- `e2e-docker/` directory — L4 Docker Compose Playwright tests: offline create → sync cycle,
  SQLite volume persistence across compose down/up
- Updated `playwright.config.ts` in `apps/todo-pwa-vite` — use `page.context().setOffline(true)`
  for offline scenarios
- Updated `packages/todo-types` — Vitest schema validation tests for all Zod schemas

**Excluded:**

- L2 inter-unit tests (deferred to Phase 2 — no complex component graph yet)
- Performance / load tests
- Storybook API-connected stories (separate concern)
- CI pipeline changes for L4 (tracked as a step within this phase)

## Dependencies

- Phase 6 complete (`useTodoApi` implemented with L1 queue tests)
- Docker Compose stack functional (NestJS + nginx + SQLite volume)
- `@todo-skeleton/types` with Zod schemas

## Acceptance Criteria

- [ ] L3: `pnpm --filter todo-api-nestjs test:system` passes full CRUD smoke: POST → GET list → GET /:id → PATCH → DELETE → 404
- [ ] L3: POST with empty description → 400 validation error
- [ ] L3: DELETE/PATCH on non-existent ID → 404 (not 500)
- [ ] L3: POST with client UUID → 201, `response.id === client-uuid`
- [ ] L3: GET /health → 200 `{ status: 'ok' }`
- [ ] L3: each test isolated — `afterEach` deletes all rows; tests do not share state
- [ ] L4: `docker compose up`, create todo via PWA UI, verify todo persists in SQLite after `docker compose down && docker compose up`
- [ ] L4: offline create cycle — `page.context().setOffline(true)`, create todo, verify `syncStatus: 'pending'` in UI; `page.context().setOffline(false)`, verify `syncStatus: 'synced'`
- [ ] Shared types: `pnpm --filter @todo-skeleton/types test` passes Zod schema validation for `TodoItem`, `CreateTodoDto` (with and without id), `UpdateTodoDto`
- [ ] All existing L1 tests continue to pass (no regressions)

## Steps

- [ ] **Step 1** — Add Zod schema unit tests to `packages/todo-types/src/index.test.ts`: valid `TodoItem` passes; invalid payload (missing description, wrong types) fails with correct error; `CreateTodoDto` with and without `id` both pass
- [ ] **Step 2** — Create `apps/todo-api-nestjs/test/todos.system.spec.ts`: L3 smoke using Vitest + supertest + real SQLite (`test.db`); `beforeAll` runs `prisma migrate deploy`; `afterEach` runs `prisma.todo.deleteMany()`; covers full CRUD + validation errors + /health
- [ ] **Step 3** — Create `e2e-docker/` directory with `playwright.config.ts` and `offline-sync.spec.ts`: L4 tests using `page.context().setOffline(true/false)` for offline cycle; separate `volume-persistence.spec.ts` verifying SQLite data survives compose restart
- [ ] **Step 4** — Update `apps/todo-pwa-vite/e2e/app.spec.ts`: replace any `page.route()` offline simulation with `page.context().setOffline(true)` to correctly set `navigator.onLine` and fire the `offline` event
- [ ] **Step 5** — Add CI step for L3 in `.github/workflows/` — run `pnpm --filter todo-api-nestjs test:system` against a fresh SQLite `test.db` (not the dev DB)
- [ ] **Step 6** — Update this feature doc to DONE

## Technical Notes

- **L3 test database isolation:** Use a separate `test.db` file (`DATABASE_URL=file:./test.db` in test env). `beforeAll` calls `prisma migrate deploy` to ensure schema is current. `afterEach` calls `prisma.todo.deleteMany()` — faster than full schema teardown, safe because each test creates its own data.
- **L3 tool stack:** Vitest (not Jest) + `supertest` for HTTP layer. NestJS app initialized once in `beforeAll` with `Test.createTestingModule`. No `@nestjs/testing` mock overrides — real Prisma client, real SQLite.
- **L4 offline mechanism:** `page.context().setOffline(true)` is the only correct Playwright approach. It sets `navigator.onLine = false` AND fires the `offline` event. `page.route()` alone intercepts requests but does not update `navigator.onLine` — the `online` event listener in `useTodoApi` would never fire on reconnect.
- **L4 Docker Compose setup:** `e2e-docker/` runs against a `docker compose up` stack. Tests use `baseURL: http://localhost` (nginx port 80). SQLite volume must be named (not anonymous) to survive compose down/up — verify in `docker-compose.yml`.
- **`/health` endpoint:** Upstream change tracked in W1 upstream issue (`jonpham/2026-project-todo-api-nestjs`). L3 test for `/health` depends on that upstream PR being merged and synced into monorepo before this phase runs.
- **Shared types Zod tests:** Live at `packages/todo-types/src/index.test.ts`. Run via `pnpm --filter @todo-skeleton/types test`. No mocks — pure schema validation.

## Test Strategy

| Level     | Location                                          | Tool                             | Scope                           |
| --------- | ------------------------------------------------- | -------------------------------- | ------------------------------- |
| L1 Unit   | `apps/todo-pwa-vite/src/hooks/useTodoApi.test.ts` | Vitest + mocked fetch            | Queue logic (Phase 6)           |
| L1 Unit   | `packages/todo-types/src/index.test.ts`           | Vitest + Zod                     | Schema validation               |
| L3 System | `apps/todo-api-nestjs/test/todos.system.spec.ts`  | Vitest + supertest + real SQLite | Full CRUD + validation + health |
| L4 E2E    | `e2e-docker/offline-sync.spec.ts`                 | Playwright + Docker Compose      | Offline create → sync cycle     |
| L4 E2E    | `e2e-docker/volume-persistence.spec.ts`           | Playwright + Docker Compose      | SQLite volume survives restart  |

## Assumptions

- L4 Docker Compose tests run locally and in CI against a full stack — no mocks at any layer.
- The SQLite volume in `docker-compose.yml` uses a named volume (`todo-db-data`) so data persists across `docker compose down && docker compose up` without `-v`.
- The `/health` endpoint and `findOrFail` helper are merged upstream in `jonpham/2026-project-todo-api-nestjs` before this phase begins.
- L2 inter-unit tests are explicitly out of scope — the client has no complex component interaction graph that would benefit from L2 coverage beyond L1.

## Change Log

| Date | PR  | Status Change | Notes                                                           |
| ---- | --- | ------------- | --------------------------------------------------------------- |
|      |     | TODO          | Rewritten for 4-level test architecture (eng review 2026-04-28) |
