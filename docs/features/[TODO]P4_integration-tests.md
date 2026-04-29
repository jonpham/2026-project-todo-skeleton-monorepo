---
project: "todo-api-nestjs"
phase: 4
slug: "integration-tests"
status: TODO
step_gating: false
issue: null
parent_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 4 — Integration & E2E Test Suite (Supertest)

## Context

Phase 3 delivered a fully containerized API. Phase 4 adds a full HTTP-level integration/E2E test suite using Vitest + Supertest against a real NestJS app instance with an isolated test SQLite database. After this phase the test pyramid is complete: unit tests (Phase 2), Docker smoke test (Phase 3), and now automated HTTP integration tests.

## Scope

**Included:**
- `supertest` + `@types/supertest` dev dependencies
- Separate Vitest integration config targeting `test/**/*.e2e-spec.ts`
- Test DB lifecycle: create on `beforeAll`, truncate on `beforeEach`, delete on `afterAll`
- `test/todos.e2e-spec.ts` — 9 HTTP-level test cases covering all CRUD paths
- `test:e2e` and `test:all` scripts in `package.json`
- CI update: `test:e2e` step added after `pnpm test`

**Excluded:**
- Authentication / authorization tests
- Load / performance tests
- Docker-level E2E (manual smoke test only)

## Dependencies

- Phase 3 complete (Docker + local deploy working)

## Acceptance Criteria

- [ ] `pnpm test:e2e` passes all integration tests against an isolated test SQLite DB
- [ ] Each test is independent — no shared state between tests
- [ ] `test.db` is cleaned up after the suite completes
- [ ] `pnpm test` (unit only) still passes and remains fast
- [ ] `pnpm test:all` runs both unit and integration suites
- [ ] CI workflow runs both `pnpm test` and `pnpm test:e2e` and both pass

## Steps

- [ ] **Step 1** — Install `supertest` and `@types/supertest` as dev dependencies
- [ ] **Step 2** — Create `vitest.integration.config.ts` targeting `test/**/*.e2e-spec.ts` with isolated `DATABASE_URL=./test.db`
- [ ] **Step 3** — Add `test:e2e` and `test:all` scripts to `package.json`
- [ ] **Step 4** — Create `test/todos.e2e-spec.ts` with full lifecycle setup (`beforeAll` / `beforeEach` / `afterAll`) and 9 test cases
- [ ] **Step 5** — Add `test:e2e` step to `.github/workflows/ci.yml` after `pnpm test`
- [ ] **Step 6** — Update this feature doc to DONE

## Technical Notes

- Use `DATABASE_URL=./test.db` for the integration suite — never the dev DB.
- `beforeAll`: instantiate NestJS app via `Test.createTestingModule`, run `prisma migrate deploy` against test DB.
- `beforeEach`: `prisma.todo.deleteMany()` to truncate between tests.
- `afterAll`: `app.close()`, then `fs.unlinkSync('./test.db')`.
- Supertest wraps the NestJS HTTP adapter — no real port binding needed (`request(app.getHttpServer())`).
- `vitest.integration.config.ts` must set `NODE_ENV=test` and `DATABASE_URL` via `process.env` before the app boots.

## Test Cases (`test/todos.e2e-spec.ts`)

| # | Method | Path | Scenario | Expected |
|---|---|---|---|---|
| 1 | GET | `/v1/todos` | Fresh DB | `200 []` |
| 2 | POST | `/v1/todos` | Valid body | `201` with todo shape |
| 3 | POST | `/v1/todos` | Missing `description` | `400` with validation error |
| 4 | GET | `/v1/todos/:id` | Existing ID | `200` with todo |
| 5 | GET | `/v1/todos/:id` | Unknown ID | `404` |
| 6 | PATCH | `/v1/todos/:id` | Update description | `200` with updated todo |
| 7 | PATCH | `/v1/todos/:id` | Toggle `completed: true` | `200` with `completed: true` |
| 8 | DELETE | `/v1/todos/:id` | Existing ID | `204` |
| 9 | Full flow | — | Create → read → update → delete | All steps pass in sequence |

## Test Strategy

- **Unit tests:** Already in place (Phase 2) — service + controller mocked
- **Integration/E2E:** This phase — full HTTP stack, real Prisma + SQLite
- **Docker E2E:** Manual smoke test (Phase 3)

## Assumptions

- `prisma migrate deploy` is safe to run against a fresh test DB (no data loss risk).
- `test.db` is gitignored (already covered by `*.db` in `.gitignore`).
- The integration suite is intentionally slower than unit tests — kept separate so `pnpm test` stays fast in the inner dev loop.

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
|  |  | TODO | Feature doc created |
