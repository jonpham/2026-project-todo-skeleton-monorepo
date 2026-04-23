# Architecture Decision Records (ADRs)

> This file tracks significant architecture decisions made during development.
> Each entry records the context, the decision, and the rationale.
> Add a new entry whenever a non-obvious architectural choice is made.

---

## ADR Format

```
## ADR-{N}: {Short Title}

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-{N}
**Phase:** Phase {n} (GH{n})

### Context
What situation or constraint prompted this decision?

### Decision
What was decided?

### Rationale
Why was this the right choice over alternatives?

### Consequences
What becomes easier or harder as a result?
```

---

## ADR-001: Monorepo with pnpm Workspaces + Turborepo

**Date:** 2026-04-20
**Status:** Accepted
**Phase:** Phase 1

### Context

The project vision includes multiple deployable apps (Vite PWA, NestJS API, Next.js, iOS, Android, Chrome Extension) sharing common types and infrastructure modules. A flat multi-repo approach would duplicate tooling and make cross-cutting changes painful.

### Decision

Use a single monorepo orchestrated by pnpm workspaces and Turborepo.

### Rationale

- pnpm workspaces give workspace-aware dependency hoisting without duplication
- Turborepo provides task caching and parallel pipeline execution across packages
- Both tools are well-supported in the Node.js ecosystem and align with the existing tech stack

### Consequences

- All apps and packages must be pnpm-compatible
- Turborepo pipeline tasks must be defined in `turbo.json` at the root
- Docker builds must be monorepo-aware (copy full repo context before running pnpm install)

---

## ADR-002: Claude Code Slash Commands for Workflow Orchestration

**Date:** 2026-04-20
**Status:** Accepted
**Phase:** Planning

### Context

The development workflow requires consistent phase-gating, feature doc maintenance, GitHub Issue/Project board sync, and working agreement enforcement across sessions. Relying on manual discipline alone is error-prone.

### Decision

Encode the full development workflow as Claude Code slash commands in `.claude/commands/`.

### Rationale

- Slash commands are loaded automatically and surfaced to Claude at session start
- Workflow logic lives in the repo alongside the code it governs
- Engineers can read and modify the commands as the workflow evolves

### Consequences

- Claude Code must be used as the primary development interface
- Slash command files must be kept up to date as the workflow changes
- Commands depend on `gh` CLI being authenticated — CI/CD environments may need separate handling

---

## ADR-003: Web Worker as Pure State Machine; Hook Owns localStorage

**Date:** 2026-04-21
**Status:** Accepted
**Phase:** Phase 3 (GH17)

### Context

The original design had `todo.worker.ts` reading and writing `localStorage` for persistence. In Chromium, Web Workers do not have access to `localStorage` — attempting to use it throws a `ReferenceError` at runtime and causes Storybook's Chromium-based test runner to fail.

### Decision

The worker is a pure in-memory state machine. `useTodoWorker` (main thread) owns all persistence: it reads `localStorage` on mount, sends a `LOAD_TODOS` message to hydrate the worker, and writes `localStorage` after every worker `onmessage` response.

### Rationale

- Keeps the worker portable and testable without any storage stub
- Aligns with the browser spec (workers intentionally lack access to synchronous storage APIs)
- The hook is the natural owner of I/O side-effects in the React component tree

### Consequences

- `LOAD_TODOS` replaces a hypothetical `GET_ALL_TODOS` pull — hydration is a push from the hook
- Integration tests can assert persistence by inspecting `localStorage` directly, not worker internals
- If the storage layer changes (e.g., IndexedDB), only the hook changes

---

## ADR-004: Storybook v10 — Import Test Utilities from `storybook/test`

**Date:** 2026-04-21
**Status:** Accepted
**Phase:** Phase 3 (GH17)

### Context

Storybook v10 reorganised its package exports. The `@storybook/test` package that existed in v8/v9 is no longer the correct import for test utilities; in v10 they are exported from the `storybook` package itself via `storybook/test`.

### Decision

All story files import test utilities (`fn`, `userEvent`, `expect`, etc.) from `storybook/test`, not `@storybook/test`.

### Rationale

- `@storybook/test` at v10 either doesn't exist or exports a stub — importing it caused runtime errors in the Storybook Vitest runner
- `storybook/test` is the canonical v10 path per the package's `exports` map

### Consequences

- Any story or test utility that copies v8/v9 examples from the internet will need the import corrected
- `@storybook/test` should not be listed as a dependency
