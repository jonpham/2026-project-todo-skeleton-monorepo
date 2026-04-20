---
project: "Project-BootStrap-Mono-Repo"
phase: 2
slug: "vite-app-bootstrap"
status: TODO
step_gating: true
issue: 9
parent_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 2 — Vite App Bootstrap

## Context

With the monorepo root in place, this phase scaffolds the first application
package: a Vite + React + TypeScript Progressive Web Application shell at
`apps/todo-web`. It also installs the full developer toolchain — linting,
formatting, git hooks, and all three test frameworks — so that Phase 3 can
develop features using a complete TDD workflow from day one.

## Scope

**Included:** Vite + React PWA shell, Tailwind CSS, ESLint, Prettier, Husky,
lint-staged, Vitest + RTL, Storybook 8, Playwright E2E config.

**Excluded:** Any To-Do feature logic or UI components (Phase 3), PWA plugin
configuration (Phase 3), Web Worker (Phase 3), Docker/CI (Phase 4).

## Dependencies

- Depends on: Phase 1 — Monorepo Setup (GH{n})

## Acceptance Criteria

- [ ] `pnpm dev` starts the Vite dev server and the app shell loads in the browser
- [ ] `pnpm lint` runs without errors from the repo root
- [ ] `pnpm format` runs Prettier across the workspace without errors
- [ ] A `git commit` triggers the Husky pre-commit hook (lint-staged runs)
- [ ] `pnpm test` runs Vitest and the App smoke test passes
- [ ] `pnpm storybook` opens Storybook at `localhost:6006` with the App story visible
- [ ] `pnpm test:e2e` runs the Playwright smoke test and it passes

## Steps

- [ ] **Step 1** — Scaffold `apps/todo-web` package: create `package.json` (extends
      root, defines `dev`, `build`, `test`, `lint`, `storybook`, `test:e2e` scripts),
      `tsconfig.json` extending root, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`,
      `src/index.css`, `index.html`. Install Vite, React 19, TypeScript as
      devDependencies in the package.
- [ ] **Step 2** — Install and configure Tailwind CSS v4 in `apps/todo-web`. Wire
      into `src/index.css` and verify a Tailwind utility class renders correctly.
- [ ] **Step 3** — Add ESLint flat config (`eslint.config.js`) to `apps/todo-web`
      that extends the root config. Add Prettier config (`.prettierrc`) inheriting
      root settings. Install as devDependencies. Add `lint` and `format` scripts.
- [ ] **Step 4** — Install Husky + lint-staged at the repo root. Configure
      `.husky/pre-commit` to run `pnpm lint-staged`. Configure `lint-staged` in root
      `package.json` for `*.{ts,tsx}` and `*.{js,json,md}` files.
- [ ] **Step 5** — Install Vitest + React Testing Library in `apps/todo-web`.
      Configure Vitest in `vite.config.ts` with jsdom test environment. Create
      `src/App.test.tsx` with a smoke test asserting the app renders without crashing.
- [ ] **Step 6** — Initialize Storybook 8 in `apps/todo-web` for Vite + React.
      Create `src/App.stories.tsx` with a Default story. Verify `pnpm storybook` opens
      and the story is visible.
- [ ] **Step 7** — Initialize Playwright in `apps/todo-web`. Create
      `playwright.config.ts` targeting the local Vite dev server. Create
      `e2e/app.spec.ts` with a smoke test that navigates to the app and asserts the
      page title is present.

## Technical Notes

- Steps 3–7 are independent of each other — order listed is recommended but not required
- Storybook init may modify `package.json` and `vite.config.ts` — review diffs carefully
- Playwright requires browsers to be installed: `pnpm --filter todo-web exec playwright install`
- Root ESLint config uses flat config format (`eslint.config.js`) — ensure app config
  extends it correctly using the flat config API, not the legacy `.eslintrc` format

## Test Strategy

- **Vitest smoke test:** `App` renders without throwing
- **Storybook story:** `App` default story renders in isolation
- **Playwright smoke test:** browser navigates to app, page title is present
- All three must pass before this phase is considered complete

## Assumptions

_None yet — populated during development._

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
| | | | |
