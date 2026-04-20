---
project: "Project-BootStrap-Mono-Repo"
phase: 1
slug: "monorepo-setup"
status: IN-PROGRESS
step_gating: true
issue: 1
parent_issue: null
branch: feat/GH1-monorepo-setup
pr: null
completed_at: null
---

# Phase 1 — Monorepo Setup

## Context

This phase establishes the root monorepo structure
that all future phases build upon — pnpm workspaces, Turborepo task pipeline,
shared TypeScript config, and the Git/GitHub connection.

## Scope

**Included:** Git init, pnpm workspace config, Turborepo pipeline, root TypeScript
config, .gitignore, README, CLAUDE.md, GitHub remote connection, initial push.

**Excluded:** Any application code, package installations beyond root toolchain,
ESLint/Prettier/Husky (Phase 2), GitHub Issues or Project board (handled by
/project:bootstrap and /project:populate_project).

## Dependencies

- Depends on: None (this is the first phase)

## Acceptance Criteria

- [ ] `git status` shows a clean working tree after initial commit
- [ ] `pnpm -v` resolves correctly from the repo root
- [ ] `cat pnpm-workspace.yaml` shows `apps/*` and `packages/*` defined
- [ ] `turbo run build` exits without error (no-op is acceptable at this stage)
- [ ] `apps/` and `packages/` directories exist
- [ ] Repo is visible on GitHub with the initial commit pushed to `main`

## Steps

- [x] **Step 1** — Initialize Git repository (`git init`), create `.gitignore`
      for Node.js/TypeScript monorepo (node_modules, dist, .turbo, .env*, OS files)
- [ ] **Step 2** — Create root `package.json` with `"private": true`, correct
      `packageManager` field for current pnpm version, and placeholder Turborepo
      scripts: `dev`, `build`, `test`, `lint`, `format`
- [ ] **Step 3** — Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [ ] **Step 4** — Create `turbo.json` with pipeline tasks: `build`, `dev`, `test`,
      `lint`, `format`, `storybook`, `test:e2e`. Set `build` outputs, mark `dev`
      and `storybook` as persistent, set `test` to depend on `build`
- [ ] **Step 5** — Create root `tsconfig.json`: strict mode, `moduleResolution: bundler`,
      `target: ES2022`, no `include` (child packages extend and define their own)
- [ ] **Step 6** — Create `README.md` with project name and one-line description.
      Create `docs/` directory, move any planning markdown files into `docs/`.
      Ensure `CLAUDE.md` is at repo root.
- [ ] **Step 7** — Create GitHub repo using `gh repo create` (private), add remote
      origin, make initial commit, push to `main`

## Technical Notes

- The root `tsconfig.json` is a base config only — it should NOT have `include` or
  `exclude` set, so child packages can extend it cleanly with their own `include`
- `turbo.json` should use the current Turborepo v2 schema (`$schema` field)
- Do not run `pnpm install` in this phase — no packages are being added yet

## Test Strategy

- **Manual verification:** run each acceptance criterion command after Step 7
- No automated tests in this phase — the infrastructure doesn't exist yet

## Assumptions

_None yet — populated during development._

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
| | | | |
