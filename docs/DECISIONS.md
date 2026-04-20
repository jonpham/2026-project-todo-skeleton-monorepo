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
