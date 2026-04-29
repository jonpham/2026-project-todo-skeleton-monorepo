# Changelog

> Updated by `/project:update-docs-and-push` after each merge to `main`.
> Entries are in reverse chronological order.
> Format: `[YYYY-MM-DD] — Phase N (GH{n}) — {Feature Name} — #{PR number}`

---

## Unreleased

### Phase 9 — Shared Types Package and Distribution Workflow (PR pending)

- Published `@jonpham/2026-project-todo-types@0.1.1` to GitHub Packages from monorepo CI
- Updated the standalone PWA and NestJS upstream repos to consume the pinned published package
- Synced both upstream consumer integrations back into `apps/todo-pwa-vite` and `apps/todo-api-nestjs`
- Added monorepo root GitHub Packages registry config so workspace installs resolve private shared packages

### Phase 3 — To-Do Feature TDD (PR pending)

- Installed `vite-plugin-pwa` v1; added `public/manifest.webmanifest` and placeholder icons; wired `<link rel="manifest">` manually in `index.html` to surface Chrome install prompt
- Added `src/workers/todo.worker.ts`: pure in-memory state machine handling `LOAD_TODOS | CREATE_TODO | UPDATE_TODO | TOGGLE_TODO | DELETE_TODO`; no localStorage in worker (Chromium blocks it)
- Added `src/hooks/useTodoWorker.ts`: hook owns localStorage persistence — reads on mount, sends `LOAD_TODOS` to hydrate worker, persists after every worker response
- Added `TodoInput`, `TodoItem`, `TodoList`, `TodoApp` components with co-located Vitest + RTL unit tests and Storybook stories; 42 unit tests + 12 Storybook tests passing
- `TodoApp` integration test uses a reactive MockWorker (mirrors worker logic in-memory) — avoids mocking `useTodoWorker` itself
- Added Playwright E2E covering full create → complete → edit → delete flow
- Layout: `TodoList` above `TodoInput` (changed mid-phase from original "input at top" plan)
- `App.tsx` is now a thin shell delegating all feature logic to `TodoApp`
- Upgraded Storybook references from `@storybook/test` to `storybook/test` (v10 API change)
- Added branch review gate to `develop.md` (Step 5.6) before PR; standardised "Next action" wording in `update-status-and-commit.md`

### Phase 2 — Vite App Bootstrap ([#30](https://github.com/jonpham/2026-project-todo-skeleton-monorepo/pull/30))

- Scaffolded `apps/todo-pwa`: Vite + React 19 + TypeScript PWA shell
- Installed and configured Tailwind CSS v4 via `@tailwindcss/vite`
- Added ESLint flat config and Prettier with root-extending app config
- Installed Husky + lint-staged at repo root (pre-commit: lint + format staged files)
- Installed Vitest + React Testing Library; configured jsdom and globals; added `App.test.tsx` smoke test
- Initialized Storybook 8 with `@storybook/addon-vitest`; added `App.stories.tsx`; split Vitest into named `unit` (jsdom) and `storybook` (Chromium) projects
- Initialized Playwright E2E; `playwright.config.ts` targets Vite dev server; `e2e/app.spec.ts` smoke test asserts page title

---

## Format Reference

```
## [YYYY-MM-DD]

### Phase N — Feature Name (#{PR})
- Brief description of what was implemented
- Notable decisions or deviations from the original plan
```
