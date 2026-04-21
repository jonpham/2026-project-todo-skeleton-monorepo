# Changelog

> Updated by `/project:update-docs-and-push` after each merge to `main`.
> Entries are in reverse chronological order.
> Format: `[YYYY-MM-DD] — Phase N (GH{n}) — {Feature Name} — #{PR number}`

---

## Unreleased

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
