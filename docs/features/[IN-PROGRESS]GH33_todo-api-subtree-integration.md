---
project: "2026-project-todo-skeleton-monorepo"
phase: 5
slug: "todo-api-subtree-integration"
status: IN-PROGRESS
step_gating: false
issue: 33
parent_issue: null
branch: feat/GH33-todo-api-subtree-integration
pr: null
completed_at: null
---

# Phase 5 — Monorepo Git Subtree Integration

## Context

Phases 1–4 delivered a complete, standalone `todo-api-nestjs` repository with a working NestJS REST API, Prisma + SQLite, Docker, and a full test suite. This phase pulls that repo into the monorepo at `apps/todo-api-nestjs/` via Git Subtree and wires it into the Turborepo pipeline and root Docker Compose stack. After this phase, `docker compose up` at the monorepo root starts both the PWA and the API.

The standalone repo remains the source of truth. The monorepo consumes it via `git subtree pull`.

## Scope

**Included:**

- One-time `git subtree add` to create `apps/todo-api-nestjs/` in the monorepo
- `turbo.json` pipeline update (build, test, lint for `todo-api-nestjs`)
- Root `docker-compose.yml` — add `todo-api-nestjs` service (port 3001, ephemeral SQLite)
- `pnpm-workspace.yaml` — add `apps/todo-api-nestjs`
- Monorepo docs: `ARCHITECTURE.md`, `STACK.md`, `README.md`
- This feature doc

**Excluded:**

- Any changes to the standalone `todo-api-nestjs` repo
- Production deployment (future Epic)
- PWA integration (Phase 6)

## Dependencies

- Phases 1–4 complete in `todo-api-nestjs`
- `todo-api-nestjs` pushed to GitHub at `https://github.com/jonpham/todo-api-nestjs`

## Acceptance Criteria

- [ ] `apps/todo-api-nestjs/` exists in the monorepo and contains the full NestJS project
- [ ] `git subtree pull --prefix=apps/todo-api-nestjs todo-api-nestjs main --squash` runs without error
- [ ] `pnpm build` from monorepo root builds both `todo-pwa` and `todo-api-nestjs`
- [ ] `pnpm lint` from monorepo root lints both apps
- [ ] `docker compose up --build` at monorepo root starts both `todo-pwa` (port 3000) and `todo-api-nestjs` (port 3001)
- [ ] `curl http://localhost:3001/v1/todos` returns `200` from the monorepo compose stack
- [ ] Monorepo docs accurately describe the subtree relationship and pull workflow

## Steps

- [ ] **Step 1** — Add `todo-api-nestjs` as a git remote and run `git subtree add --prefix=apps/todo-api-nestjs todo-api-nestjs main --squash`
- [ ] **Step 2** — Add `apps/todo-api-nestjs` to `pnpm-workspace.yaml`
- [ ] **Step 3** — Update `turbo.json` to include `todo-api-nestjs` in `build`, `test`, and `lint` pipeline tasks
- [ ] **Step 4** — Add `todo-api-nestjs` service to root `docker-compose.yml` (build context `apps/todo-api-nestjs/`, port `3001:3000`, ephemeral SQLite)
- [ ] **Step 5** — Update `docs/ARCHITECTURE.md`: add `apps/todo-api-nestjs/` to repo structure tree; add Git Subtree section
- [ ] **Step 6** — Update `docs/STACK.md`: add NestJS, Prisma, Vitest (API) rows
- [ ] **Step 7** — Update `README.md`: add Git Subtree pull instructions; add `todo-api-nestjs` to infrastructure table
- [ ] **Step 8** — Update this feature doc to DONE

## Technical Notes

- Git Subtree squash-merges the standalone repo history into a single commit — keeps monorepo history clean.
- The `todo-api-nestjs` app is NOT a pnpm workspace member in the traditional sense — it has its own `node_modules` managed by its own `pnpm install`. Add it to `pnpm-workspace.yaml` only if Turborepo needs to resolve it as a workspace package for pipeline tasks.
- Root `docker-compose.yml` build context for `todo-api-nestjs` must be `apps/todo-api-nestjs/` (not the monorepo root) since the Dockerfile is self-contained.
- `CORS_ALLOWED_ORIGINS` in the compose service should include both `http://localhost:5173` (PWA dev) and `https://app.todo.witty-m.com` (production PWA).

## Git Subtree Reference

```bash
# One-time setup (run from monorepo root)
git remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git
git subtree add --prefix=apps/todo-api-nestjs todo-api-nestjs main --squash

# Pull future updates from standalone repo
git subtree pull --prefix=apps/todo-api-nestjs todo-api-nestjs main --squash
```

## Test Strategy

- **Manual:** `docker compose up --build` → verify both services start → `curl` both ports
- **CI:** `pnpm build` and `pnpm lint` from monorepo root cover both apps via Turborepo

## Assumptions

- The standalone repo is pushed to `https://github.com/jonpham/2026-project-todo-api-nestjs` before this phase begins.
- `apps/todo-api-nestjs/` does not need to be a full pnpm workspace member — Turborepo can run tasks in it via `turbo.json` pipeline without workspace hoisting.

## Change Log

Date

PR

Status Change

Notes

TODO

Feature doc created
