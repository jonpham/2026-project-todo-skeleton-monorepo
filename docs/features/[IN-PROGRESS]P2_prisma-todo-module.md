---
project: "todo-api-nestjs"
phase: 2
slug: "prisma-todo-module"
status: IN-PROGRESS
step_gating: false
issue: null
parent_issue: null
branch: feat/P2-prisma-todo-module
pr: null
completed_at: null
---

# Phase 2 — Prisma + SQLite + Todo CRUD Module

## Context

Phase 1 delivered a bare NestJS scaffold with no domain logic. Phase 2 adds the first real feature: a Todo resource backed by SQLite via Prisma ORM. After this phase a developer can run the API locally and perform full CRUD on todos via REST, with Swagger docs and input validation.

## Scope

**Included:**
- Prisma schema (`Todo` model) with SQLite datasource
- First migration (`init`) + Prisma client generation
- `PrismaModule` (global) + `PrismaService` (extends `PrismaClient`)
- `TodosModule` with controller, service, DTOs, and entity
- `ValidationPipe` (global, whitelist + transform)
- URI versioning (`/v1/…`)
- CORS middleware reading `CORS_ALLOWED_ORIGINS`
- Swagger UI at `/api` (non-production only)
- Unit tests: `TodosService` (8 cases) and `TodosController` (5 cases)
- CI step: `prisma generate` before lint

**Excluded:**
- Authentication / authorization
- Pagination / filtering
- E2E tests (deferred to Phase 4)
- Docker / deployment

## Dependencies

- Phase 1 complete (NestJS scaffold, TypeScript, ESLint, Prettier, Husky, Vitest, CI)

## Acceptance Criteria

- [ ] `pnpm install` completes without errors
- [ ] `pnpm prisma:generate` generates Prisma client successfully
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm test` — all unit tests pass
- [ ] `pnpm build` — TypeScript compiles without errors
- [ ] `pnpm dev` — server starts at `localhost:3000`; `GET /v1/todos` returns `[]`
- [ ] Swagger UI accessible at `http://localhost:3000/api` (when `NODE_ENV !== 'production'`)
- [ ] `prisma/migrations/` contains at least one migration folder

## Steps

- [x] **Step 1** — Preflight: add `dev` script, update `engines` + `packageManager` in `package.json`
- [x] **Step 2** — Add dependencies: `@prisma/client`, `@nestjs/swagger`, `@nestjs/mapped-types`, `class-validator`, `class-transformer` (+ `prisma` devDep); run `pnpm install`
- [x] **Step 3** — Create `prisma/schema.prisma` with SQLite datasource + `Todo` model; run `prisma migrate dev --name init`
- [x] **Step 4** — Create `src/prisma/prisma.service.ts` and `src/prisma/prisma.module.ts`
- [x] **Step 5** — Create `src/todos/` feature module: DTOs, entity, service, controller, module
- [x] **Step 6** — Update `src/app.module.ts` to import `PrismaModule` and `TodosModule`
- [x] **Step 7** — Update `src/main.ts`: versioning, validation pipe, CORS, Swagger
- [x] **Step 8** — Write unit tests: `todos.service.spec.ts` and `todos.controller.spec.ts`
- [x] **Step 9** — Add `prisma generate` step to `.github/workflows/ci.yml`
- [x] **Step 10** — Write this feature doc

## Technical Notes

- All relative imports use `.js` extensions (`NodeNext` module resolution requirement).
- `@nestjs/swagger` v11 is required for NestJS v11 compatibility (v8 only targets NestJS 9/10).
- `pnpm.onlyBuiltDependencies` added for `@prisma/client`, `@prisma/engines`, and `prisma` to allow their build scripts.
- `DATABASE_URL` must be set before running migrations; SQLite file path is `file:./dev.db`.
- `PrismaModule` is `@Global()` so `PrismaService` is available project-wide without per-module imports.
- `TodosService` performs a `findUnique` before `update`/`delete` to return a 404 rather than a Prisma P2025 error.

## Test Strategy

- **Unit tests (service):** 8 cases covering all public methods + `NotFoundException` paths
- **Unit tests (controller):** 5 cases verifying delegation to service methods
- **Integration / E2E:** Deferred to Phase 4

## Assumptions

- SQLite is sufficient for the boilerplate; no migration to Postgres until Phase 5.
- Swagger is disabled in production (`NODE_ENV === 'production'`) to reduce attack surface.
- CORS origins default to an empty array when `CORS_ALLOWED_ORIGINS` is unset (blocks all cross-origin requests).

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
| 2026-04-27 | — | TODO → IN-PROGRESS | Phase 2 implementation complete |
