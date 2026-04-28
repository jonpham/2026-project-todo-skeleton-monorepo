# W2 Design: Shared Types Package and Distribution Workflow

**Date:** 2026-04-28
**Initiative:** MonorepoPwaApiIntegration
**Related feature spec:** `docs/features/[TODO]GH42_shared-types-package.md`
**Status:** Drafted and approved in brainstorming

## Goal

Establish a real shared-package workflow for the monorepo and its upstream app
repositories by creating a monorepo-owned `@todo-skeleton/types` package,
publishing it automatically to GitHub Packages from CI on merges to `main`, and
proving both upstream repos can consume the published artifact successfully.

This is broader than the current `GH42` draft, which is scoped mainly as a local
workspace package. W2 should prove package production, publication, and
consumption across repo boundaries.

## Why This Slice Comes First

The initiative design already treats shared types as the monorepo-owned contract
between the PWA and NestJS API. That contract should exist before deeper PWA/API
integration work so that later sync and integration-test work does not cement
duplicated wire types.

This slice also proves an important platform behavior: the monorepo is not only a
consumer of upstream repos, it is also the producer of shared artifacts those repos
depend on.

## Scope

### Included

- `packages/todo-types` in the monorepo
- Zod schemas and inferred TypeScript types for:
  - `TodoItem`
  - `CreateTodoDto`
  - `UpdateTodoDto`
- Package build and package-level unit tests
- GitHub Packages publication for `@todo-skeleton/types`
- GitHub Actions workflow that publishes on merges to monorepo `main` when
  `packages/todo-types` changes
- Deterministic package version bumping for automatic publish flow
- Upstream PWA repo updated to consume the published package
- Upstream NestJS repo updated to consume the published package
- Subtree sync back into the monorepo after upstream changes merge
- Documentation for publish and consume workflow

### Excluded

- UI-specific types such as `UiTodo` and `syncStatus`
- Shared runtime utilities beyond wire contracts
- Automated dependency bump PRs from monorepo into upstream repos
- Tag-driven or manually curated release flow
- Broader package-release tooling for future shared packages beyond what W2 needs

## Ownership Model

### Monorepo owns

- `packages/todo-types`
- Schema definitions and inferred types
- Package versioning policy
- CI publish workflow
- Package install/publish documentation

### Upstream repos own

- Their dependency declaration on `@todo-skeleton/types`
- Their registry authentication/config for GitHub Packages consumption
- Code changes needed to replace duplicated wire-contract types with imports from
  the package

### Subtree rule

App code remains upstream-owned. Consumer integration changes land in the upstream
repos first, then return to the monorepo through normal subtree sync.

## Package Design

### Package name and registry

- Package name: `@todo-skeleton/types`
- Registry: GitHub Packages
- Initial version: `0.1.0`

### Package contents

The package stays narrow and only owns wire-contract schemas and types:

- `TodoItemSchema` and `TodoItem`
- `CreateTodoDtoSchema` and `CreateTodoDto`
- `UpdateTodoDtoSchema` and `UpdateTodoDto`

Types are derived from Zod using `z.infer<>`. The schema is the source of truth.

### Boundaries

- The PWA may extend `TodoItem` locally into `UiTodo`
- The NestJS repo keeps its class-validator DTO classes for request validation
- The API continues to map Prisma entities to wire-contract types at its own boundary

## Release Model

### Trigger

Publish on merges to monorepo `main` when `packages/todo-types/**` changes.

### Versioning

Use automatic patch bumping for the first version of the workflow. Every qualifying
merge to `main` that changes the package results in a new patch version.

This is intentionally simple. If publish frequency becomes noisy, the project can
move later to explicit release tags or manual release orchestration.

### Consumer behavior

Both upstream repos consume explicit published versions. They should not depend on
floating references.

## Execution Sequence

W2 should run as one vertical slice in this order:

1. Create and validate the package in the monorepo
2. Add CI-based publication to GitHub Packages
3. Update the upstream PWA repo to consume the published package
4. Update the upstream NestJS repo to consume the published package
5. Sync both updated upstream repos back into the monorepo subtrees

This order is deliberate. It proves the producer path first, then each consumer,
then the composed monorepo state.

## Testing and Acceptance

### Package-level acceptance

- `packages/todo-types` exists and builds
- Zod schema tests pass for valid and invalid payloads
- Emitted JS and type declarations are consumable by downstream repos

### Release-level acceptance

- A merge to monorepo `main` that changes `packages/todo-types` triggers GitHub
  Actions publication
- A new package version is published successfully to GitHub Packages
- The version bump behavior is deterministic and documented

### Consumer-level acceptance

- The upstream PWA repo can authenticate to GitHub Packages, install the published
  package, replace duplicated wire-type usage, and pass its build/test checks
- The upstream NestJS repo can do the same

### Monorepo composition acceptance

- After subtree sync, the monorepo reflects upstream consumer changes cleanly
- The monorepo docs and feature spec accurately describe the package workflow

## Required Changes to GH42

The current `docs/features/[TODO]GH42_shared-types-package.md` is directionally
correct but too narrow for the approved W2 scope.

It should be updated to reflect:

- GitHub Packages as the chosen registry
- CI publication on merges to `main`
- Automatic patch bump release behavior
- Upstream consumer integration as part of W2 acceptance
- W2 as a cross-repo slice, not only a workspace-local package task

## Risks and Constraints

### Registry and auth complexity

GitHub Packages requires correct scope configuration and authentication in both CI
and consumer repos. This is the main operational risk in W2.

### Workspace success can mask publish problems

Local workspace linking is useful for package development but is not the proof
point. The package must be consumed from the registry artifact, not only from the
workspace.

### NestJS API contract timing

The shared package may define `CreateTodoDto.id?: string`, but full functional use
of that field still depends on upstream API support in the NestJS repo. W2 proves
the package workflow and consumer build path; it does not claim all later behavior
is already wired end-to-end.

## Recommended Outcome

At the end of W2, the system should have a mature-enough shared package loop:

- monorepo owns and publishes shared contract package
- CI releases the package automatically on `main`
- both upstream repos consume explicit versions from GitHub Packages
- subtree sync keeps the monorepo integration copy aligned

That outcome gives the next workstreams a stable contract and a proven distribution
pattern instead of a local-only workspace abstraction.
