---
project: "2026-project-todo-skeleton-monorepo"
phase: 9
slug: "shared-types-package"
status: TODO
step_gating: false
epic_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 9 — Shared Types Package `@todo-skeleton/types` (W2)

## Context

The PWA and NestJS API share a wire contract — the shape of TodoItem, CreateTodoDto, and
UpdateTodoDto must match across both apps. Today that contract is duplicated. This phase
creates `packages/todo-types` as an npm workspace package that owns the canonical Zod schemas
and TypeScript types, consumed by both apps.

The package is narrow: it owns API wire types only. UI-specific types (e.g. `UiTodo` with
`syncStatus`) live in the app that needs them. NestJS entity-to-wire mapping stays in the API.

## Scope

**Included:**

- `packages/todo-types/` — new workspace package `@todo-skeleton/types`
- Zod schemas for `TodoItem`, `CreateTodoDto` (with `id?: string`), `UpdateTodoDto`
- TypeScript types inferred via `z.infer<>` — no separate type declarations
- `pnpm-workspace.yaml` update to include `packages/*`
- Workspace links in both `apps/todo-pwa-vite/package.json` and `apps/todo-api-nestjs/package.json`
- L1 Vitest schema validation tests (co-located in package)
- npm publish configuration (`publishConfig.access: public`) for eventual public release

**Excluded:**

- UI-specific types (`UiTodo`, `SyncStatus`) — stay in `apps/todo-pwa-vite/src/types/todo.ts`
- NestJS entity types (Prisma-generated) — stay in the API
- Class-validator decorators on DTOs — NestJS uses its own DTO classes; `@todo-skeleton/types` provides Zod schemas that NestJS can optionally use for validation pipe

## Dependencies

- Monorepo pnpm workspace already set up (Phase 1)
- Both apps exist as workspace members

## Acceptance Criteria

- [ ] `packages/todo-types/` exists with `package.json` name `@todo-skeleton/types`
- [ ] Zod schemas exported: `TodoItemSchema`, `CreateTodoDtoSchema`, `UpdateTodoDtoSchema`
- [ ] TypeScript types exported: `TodoItem`, `CreateTodoDto`, `UpdateTodoDto` (all via `z.infer<>`)
- [ ] `pnpm --filter @todo-skeleton/types test` passes: valid payloads pass, invalid payloads (missing description, wrong types) fail with correct Zod errors
- [ ] `apps/todo-pwa-vite` imports `TodoItem` from `@todo-skeleton/types`; TypeScript compiles without errors
- [ ] `apps/todo-api-nestjs` imports `TodoItem` from `@todo-skeleton/types`; TypeScript compiles without errors
- [ ] `pnpm --filter todo-pwa-vite build` and `pnpm --filter todo-api-nestjs build` both pass with the workspace dependency

## Steps

- [ ] **Step 1** — Create `packages/todo-types/package.json`: name `@todo-skeleton/types`, version `0.1.0`, `main: dist/index.js`, `types: dist/index.d.ts`, `publishConfig: { access: public }`; add `zod` as dependency; add Vitest as dev dependency
- [ ] **Step 2** — Create `packages/todo-types/src/index.ts`: define `TodoItemSchema`, `CreateTodoDtoSchema`, `UpdateTodoDtoSchema` using Zod; export inferred types via `z.infer<>`
- [ ] **Step 3** — Write L1 Vitest schema tests at `packages/todo-types/src/index.test.ts`: valid `TodoItem` passes; missing `description` fails; `description` as number fails; `CreateTodoDto` with and without `id` both pass; `id` as non-UUID fails
- [ ] **Step 4** — Update `pnpm-workspace.yaml` to include `packages/*` if not already present; run `pnpm install` to link the workspace package
- [ ] **Step 5** — Update `apps/todo-pwa-vite/package.json`: add `"@todo-skeleton/types": "workspace:*"`; update `src/types/todo.ts` to import `TodoItem` from `@todo-skeleton/types` and keep `UiTodo` local
- [ ] **Step 6** — Update `apps/todo-api-nestjs/package.json`: add `"@todo-skeleton/types": "workspace:*"`; update response type annotations in `todos.controller.ts` to use `TodoItem` from `@todo-skeleton/types`
- [ ] **Step 7** — Verify both apps build: `pnpm --filter todo-pwa-vite build` and `pnpm --filter todo-api-nestjs build`
- [ ] **Step 8** — Update this feature doc to DONE

## Technical Notes

- **`z.infer<>` pattern:** `export type TodoItem = z.infer<typeof TodoItemSchema>` — no separate interface declarations. The schema is the single source of truth; the type is derived.
- **NestJS DTO classes vs Zod:** NestJS uses class-validator decorators on DTO classes for request validation. `@todo-skeleton/types` provides Zod schemas for cross-app type safety, not to replace class-validator. The NestJS `CreateTodoDto` class keeps its decorators and imports `CreateTodoDto` type from `@todo-skeleton/types` only for type annotation.
- **Workspace link in Docker:** For Docker builds, the `packages/todo-types` source must be available. The Dockerfile context must include `packages/` alongside `apps/todo-api-nestjs/`. Update the API Dockerfile `COPY` commands accordingly.
- **`id?: string` in `CreateTodoDtoSchema`:** `id: z.string().uuid().optional()` — validates format when present, allows absence.
- **Build step for package:** `packages/todo-types` needs a `build` script (`tsc`) and `tsconfig.json`. The `dist/` output is what the workspace consumers import. Run `pnpm --filter @todo-skeleton/types build` before building consumer apps.

## Test Strategy

| Level   | Location                                | Tool         | Scope                                          |
| ------- | --------------------------------------- | ------------ | ---------------------------------------------- |
| L1 Unit | `packages/todo-types/src/index.test.ts` | Vitest + Zod | Schema validation — all types, valid + invalid |

No mocks needed — pure schema validation. Tests run in `packages/todo-types` context only.

## Assumptions

- `pnpm` workspace protocol (`workspace:*`) resolves the local package without publishing.
- TypeScript project references are not required for this phase — a simple `paths` alias in each app's `tsconfig.json` is sufficient if `tsc` build order needs coordinating.
- The package will eventually be published to npm as `@todo-skeleton/types` for use outside the monorepo.

## Change Log

| Date | PR  | Status Change | Notes                                             |
| ---- | --- | ------------- | ------------------------------------------------- |
|      |     | TODO          | Created for W2 workstream (eng review 2026-04-28) |
