---
project: "todo-api-nestjs"
phase: 1
slug: "repo-scaffold"
status: IN-PROGRESS
step_gating: true
issue: null
parent_issue: null
branch: main
pr: null
completed_at: null
---

# Phase 1 — Repo Scaffold & Toolchain

## Context

This phase stands up the `todo-api-nestjs` standalone repository from scratch. Before this phase, the repo does not exist. After this phase, a developer can clone the repo, run `pnpm install`, and have a working TypeScript NestJS project with linting, formatting, testing, and CI in place — ready for feature development in Phase 2.

## Scope

**Included:**
- Repository initialization (git, pnpm, package.json)
- TypeScript configuration (strict, ES2022, NodeNext, decorators)
- ESLint flat config with `@typescript-eslint/recommended`
- Prettier with single quotes, trailing commas, 2-space indent
- Husky + lint-staged pre-commit hook
- Vitest configuration (node environment, `src/**/*.spec.ts`)
- Minimal NestJS bootstrap (`main.ts`, `app.module.ts` — no controllers or services)
- `.env.example` with 4 environment variables
- `.gitignore`
- `CLAUDE.md` working agreement
- `docs/STACK.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md` (stub)
- `.github/workflows/ci.yml` (lint + test + build, Node 22, pnpm cached)

**Excluded:**
- Any domain logic (todos, users, auth)
- Database integration
- Docker / deployment
- API endpoints

## Dependencies

None — this is the first phase.

## Acceptance Criteria

- [x] `pnpm install` completes without errors
- [x] `pnpm build` compiles TypeScript without errors
- [x] `pnpm lint` passes with no errors
- [x] `pnpm format:check` passes
- [x] `pnpm test` runs (passes — no tests yet, zero failures)
- [x] `src/main.ts` bootstraps `AppModule` and listens on `process.env.PORT ?? 3000`
- [x] `.env.example` contains `PORT`, `NODE_ENV`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`
- [x] `.github/workflows/ci.yml` exists and includes lint + test + build steps
- [x] `docs/STACK.md` and `docs/ARCHITECTURE.md` are populated
- [x] `CLAUDE.md` is present with working agreement adapted for this repo

## Steps

- [x] **Step 1** — Initialize directory, `package.json`, `.gitignore`, `.env.example`
- [x] **Step 2** — Configure TypeScript (`tsconfig.json`, `tsconfig.build.json`)
- [x] **Step 3** — Configure ESLint flat config (`eslint.config.js`)
- [x] **Step 4** — Configure Prettier (`.prettierrc`, `.prettierignore`)
- [x] **Step 5** — Configure Husky + lint-staged (`.husky/pre-commit`, `lint-staged` in `package.json`)
- [x] **Step 6** — Configure Vitest (`vitest.config.ts`)
- [x] **Step 7** — Scaffold minimal NestJS bootstrap (`src/main.ts`, `src/app.module.ts`)
- [x] **Step 8** — Add CI workflow (`.github/workflows/ci.yml`)
- [x] **Step 9** — Write `docs/STACK.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`
- [x] **Step 10** — Write `CLAUDE.md` working agreement
- [x] **Step 11** — `git init`, initial commit `chore: initial repo scaffold`

## Technical Notes

- NestJS v11 requires Node.js ≥ 20; we target Node 22 LTS.
- NodeNext module resolution requires `.js` extensions on relative imports in source files (even though the files are `.ts`).
- `tsconfig.build.json` excludes spec files and `vitest.config.ts` from the production build.
- `strictPropertyInitialization: false` is set to allow NestJS `@InjectRepository()` patterns without definite-assignment assertions.
- Vitest is used instead of Jest for faster execution and native ESM/TypeScript support.

## Test Strategy

Phase 1 has no application logic to test. The test suite is empty but configured and passing. Phase 2 will add the first unit tests (TodosService).

- **Unit tests:** None yet — scaffold only
- **Component tests:** N/A (API, no UI)
- **E2E tests:** Deferred to Phase 4

## Assumptions

- `DATABASE_URL` uses SQLite (`sqlite://./todo.db`) as the default; TypeORM is not installed until Phase 2.
- `CORS_ALLOWED_ORIGINS` (not `JWT_SECRET`) is the correct env var per the spec; it controls allowed client origins for the CORS middleware.
- `singleQuote: true` in `.prettierrc` (differs from monorepo default of `false`) — this repo targets a Node/API style convention.
- The `eslint.config.js` uses `globals.node` (not `globals.browser`) since this is a server-side project.

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
| 2026-04-27 | — | TODO → IN-PROGRESS | Initial scaffold created |
