---
project: "2026-project-todo-skeleton-monorepo"
phase: 9
slug: "shared-types-package"
status: TODO
step_gating: false
issue: 42
epic_issue: null
parent_issue: null
upstream_repos:
  - "jonpham/2026-project-todo-pwa-vite"
  - "jonpham/2026-project-todo-api-nestjs"
upstream_issues: []
branch: null
pr: null
completed_at: null
---

# Phase 9 — Shared Types Package `@todo-skeleton/types` (W2)

## Context

W2 is a cross-repo contract slice, not only a workspace-local refactor. The monorepo owns the
source package at `packages/todo-types`, but the deliverable also includes registry publication
and upstream consumption so the shared wire contract can be reused by the standalone repos.

The PWA and NestJS API share a wire contract: `TodoItem`, `CreateTodoDto`, and
`UpdateTodoDto` must stay aligned across implementations. This phase defines the canonical Zod
schemas and inferred TypeScript types in `@todo-skeleton/types`, publishes that package to
GitHub Packages from CI on pushes to `main` when `packages/todo-types/**` changes, and updates
both standalone consumers to depend on the published package.

The package remains intentionally narrow. It owns API wire types only. UI-specific types
such as `UiTodo` or sync metadata stay in the consumer app, and NestJS entity-to-wire mapping
stays in the API layer.

## Scope

**Included:**

- `packages/todo-types/` — source package `@todo-skeleton/types` in the monorepo
- Zod schemas for `TodoItem`, `CreateTodoDto` (with `id?: string`), `UpdateTodoDto`
- TypeScript types inferred via `z.infer<>` — no separate type declarations
- L1 Vitest schema validation tests (co-located in package)
- GitHub Packages publish configuration for `@todo-skeleton/types`
- Release workflow in GitHub Actions that runs on pushes to `main` when
  `packages/todo-types/**` changes
- Automatic patch version bump and package publication behavior in CI
- Upstream consumer integration in `2026-project-todo-pwa-vite` and
  `2026-project-todo-api-nestjs` using pinned explicit published versions of the GitHub
  Packages artifact
- Subtree sync follow-through back into the monorepo after upstream adoption
- Documentation alignment so later W2 tasks can implement release and consumer follow-through
  from this feature doc without re-scoping the work

**Excluded:**

- UI-specific types (`UiTodo`, `SyncStatus`) — stay in `apps/todo-pwa-vite/src/types/todo.ts`
- NestJS entity types (Prisma-generated) — stay in the API
- Class-validator decorators on NestJS DTO classes — NestJS may keep app-local validation
  classes even when the shared package provides the canonical wire schemas
- Major/minor release automation, changelog tooling, or manual release approval flows
- Publishing on tags, pull requests, or arbitrary workspace changes outside
  `packages/todo-types/**`
- Moving all app-local types into the shared package
- Cross-repo runtime validation infrastructure beyond consuming the published package

## Dependencies

- Monorepo pnpm workspace already set up (Phase 1)
- Both apps already exist as workspace members
- Task 1 and Task 2 completed the approved W2 planning and implementation prep for the broader
  cross-repo design
- GitHub Packages is the approved registry target for this workstream

## Acceptance Criteria

- [ ] `packages/todo-types/` exists with `package.json` name `@todo-skeleton/types`
- [ ] Zod schemas exported: `TodoItemSchema`, `CreateTodoDtoSchema`, `UpdateTodoDtoSchema`
- [ ] TypeScript types exported: `TodoItem`, `CreateTodoDto`, `UpdateTodoDto` (all via `z.infer<>`)
- [ ] `pnpm --filter @todo-skeleton/types test` passes: valid payloads pass, invalid payloads (missing description, wrong types) fail with correct Zod errors
- [ ] `packages/todo-types/package.json` is configured for GitHub Packages publication
- [ ] A GitHub Actions workflow publishes on pushes to `main` when
      `packages/todo-types/**` changes
- [ ] The committed `packages/todo-types/package.json` version remains at the baseline value;
      patch version mutation happens only inside CI for publication
- [ ] The publish job authenticates with the repository `GITHUB_TOKEN` using `contents: write`
      and `packages: write`, and emits a consumable package version for downstream repos
- [ ] Reruns for the same qualifying commit reuse the commit-reserved version and skip publish
      cleanly when that version already exists in GitHub Packages
- [ ] `2026-project-todo-pwa-vite` installs a pinned explicit published version of
      `@todo-skeleton/types` from GitHub Packages, not a floating range or tag, with scoped registry
      config and auth in place, and its build passes against that artifact
- [ ] `2026-project-todo-api-nestjs` installs a pinned explicit published version of
      `@todo-skeleton/types` from GitHub Packages, not a floating range or tag, with scoped registry
      config and auth in place, and its build passes against that artifact
- [ ] Subtree sync brings the upstream consumer integration back into the monorepo in the
      approved W2 flow
- [ ] The feature remains documented as a cross-repo W2 slice so Tasks 4-7 can implement
      release automation and upstream adoption without reopening scope questions

## Steps

- [ ] **Step 1** — Finalize `packages/todo-types` as the canonical source package:
      package metadata, build output, exports, schemas, inferred types, and package-local tests
- [ ] **Step 2** — Configure `package.json` for GitHub Packages publication, including package
      name, registry-facing metadata, and versioning expectations for CI-driven patch releases
- [ ] **Step 3** — Add a GitHub Actions workflow that triggers on pushes to `main` when
      `packages/todo-types/**` changes; build, test, patch-bump, and publish the package
- [ ] **Step 4** — Keep the committed package manifest at its baseline version and mutate the
      patch version only inside CI for publication
- [ ] **Step 5** — Ensure the release flow automatically publishes the commit-scoped reserved
      patch version for each qualifying push to `main` when `packages/todo-types/**` changes, and
      reruns for the same commit reuse that reserved version and skip publish cleanly if the version
      already exists in GitHub Packages
- [ ] **Step 6** — Update `2026-project-todo-pwa-vite` to configure scoped GitHub Packages
      registry/auth, install a pinned explicit published version of `@todo-skeleton/types`, and
      switch imports to the published package contract
- [ ] **Step 7** — Update `2026-project-todo-api-nestjs` to configure scoped GitHub Packages
      registry/auth, install a pinned explicit published version of `@todo-skeleton/types`, and
      switch imports to the published package contract
- [ ] **Step 8** — Subtree sync the upstream consumer changes back into the monorepo as the
      approved W2 follow-through
- [ ] **Step 9** — Verify the publish workflow is scoped only to pushes to `main` when
      `packages/todo-types/**` changes, and verify the standalone repos can authenticate, install,
      and build against the published package
- [ ] **Step 10** — Monorepo-local consumer wiring or build checks may be used as supporting
      verification context, but they are not the primary W2 success target
- [ ] **Step 11** — Update this feature doc to DONE after Tasks 4-7 land

## Technical Notes

- **`z.infer<>` pattern:** `export type TodoItem = z.infer<typeof TodoItemSchema>`. The schema
  is the source of truth and the exported type is derived from it.
- **Registry target:** The approved publication target is GitHub Packages, not npmjs. The package
  metadata and consumer setup should assume scoped package installation from GitHub's registry.
- **Workflow trigger breadth:** The earlier plan draft had conflicting trigger scopes. The
  approved W2 design is narrower and should be implemented exactly: publish on pushes to `main`
  when `packages/todo-types/**` changes.
- **Publish auth model:** The monorepo publish job uses the repository `GITHUB_TOKEN` with
  `contents: write` and `packages: write`. Extra publish secrets are not required for this
  workflow.
- **Committed manifest invariant:** The version committed in `packages/todo-types/package.json`
  stays at the baseline value in git. Patch version mutation happens only inside CI as part of
  preparing the publish artifact.
- **Automatic patch release behavior:** W2 uses a single release model: every qualifying push to
  `main` when `packages/todo-types/**` changes publishes the commit-scoped reserved patch
  version to GitHub Packages without manual branch-side version editing. That reserved version
  makes reruns for the same commit idempotent, and reruns should skip publish cleanly when that
  version already exists in GitHub Packages. The reservation tag is an implementation detail of
  the automation.
- **Upstream dependency pinning:** The standalone repos should consume pinned explicit published
  versions of `@todo-skeleton/types`. They should not depend on floating semver ranges, dist-tags,
  or other moving references for this W2 integration.
- **Downstream registry auth:** The standalone repos also need scoped GitHub Packages registry
  configuration and authentication in their npm or pnpm setup; pinning the dependency alone is
  not sufficient.
- **Primary success target:** W2 is successful when the standalone repos consume the published
  GitHub Packages artifact and that integration is synced back via subtree flow. Monorepo-local
  workspace linking is useful for development and spot checks, but it is not the primary
  deliverable.
- **NestJS DTO classes vs Zod:** NestJS can keep class-validator-based request DTOs if needed.
  `@todo-skeleton/types` defines the wire contract and shared TS types; it does not require the
  API to replace all app-local validation classes.
- **Docker and CI auth:** Any downstream Dockerfiles or CI jobs that install
  `@todo-skeleton/types` from GitHub Packages will need registry authentication wired through the
  appropriate npm config or token injection.
- **`id?: string` in `CreateTodoDtoSchema`:** `id` remains optional and must validate as a UUID
  when present.
- **Build artifact:** `packages/todo-types` should emit `dist/` so both the publish workflow and
  consumers resolve compiled JS and declarations consistently.

## Test Strategy

| Level          | Location                                | Tool                             | Scope                                                                |
| -------------- | --------------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| L1 Unit        | `packages/todo-types/src/index.test.ts` | Vitest + Zod                     | Schema validation for the shared contract                            |
| L2 CI          | GitHub Actions publish workflow         | GitHub Actions                   | Trigger gating, build/test/publish sequence, patch bump behavior     |
| L3 Integration | Standalone PWA and API repos            | Existing repo build/test tooling | Install and compile against the published GitHub Packages artifact   |
| L3 Sync        | Monorepo subtree sync result            | Existing sync verification       | Confirm upstream consumer changes are reflected back in the monorepo |

No mocks are needed for the schema package itself. CI verification should focus on whether the
release workflow publishes only when the package changes, and whether downstream repos can install
and build against the published version. Monorepo-local consumer wiring may be checked as
supporting context only.

## Assumptions

- `pnpm` workspace protocol (`workspace:*`) resolves the local package without publishing.
- TypeScript project references are not required unless the package build order or local DX proves
  otherwise during implementation.
- The standalone repos either already have or will receive GitHub Packages auth configuration as
  part of the remaining W2 tasks.
- Automatic patch bumps can be handled entirely in CI as long as published versions are monotonic
  and discoverable by downstream consumers.
- This doc intentionally captures the full W2 slice even though Task 3 only updates documentation;
  implementation of release automation and upstream adoption is deferred to Tasks 4-7.

## Change Log

| Date       | PR  | Status Change | Notes                                                                                                                                         |
| ---------- | --- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 |     | TODO          | Scope expanded from workspace-only package to approved W2 cross-repo slice with GitHub Packages publication and upstream consumer integration |
