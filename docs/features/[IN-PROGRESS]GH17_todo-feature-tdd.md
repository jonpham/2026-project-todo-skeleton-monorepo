---
project: "Project-BootStrap-Mono-Repo"
phase: 3
slug: "todo-feature-tdd"
status: IN-PROGRESS
step_gating: true
issue: 17
parent_issue: null
branch: feat/GH17-todo-feature-tdd
pr: null
completed_at: null
---

# Phase 3 — To-Do Feature (TDD)

## Context

The app shell from Phase 2 is empty. This phase adds the PWA capability and
implements all To-Do product features using a strict Test-Driven Development
(TDD) workflow: tests and stories are written before or alongside implementation,
and all acceptance criteria are verified before the phase is considered complete.

## Scope

**Included:** PWA plugin + manifest, Web Worker data layer, `useTodoWorker` hook,
all To-Do UI components with co-located unit tests and Storybook stories,
Playwright E2E test covering the full To-Do user flow.

**Excluded:** Any backend API integration (future phase), authentication, user
accounts, filtering or sorting of To-Do items (future iteration).

## Dependencies

- Depends on: Phase 2 — Vite App Bootstrap (GH{n})
- Requires: Vitest + RTL, Storybook, and Playwright all passing from Phase 2

## Acceptance Criteria

- [ ] App is installable as a PWA on iOS and Android (browser shows install prompt)
- [ ] App works fully offline after first load
- [ ] User can create a To-Do item with a text description
- [ ] User can mark a To-Do item complete (checkbox; text shows strikethrough)
- [ ] User can edit a To-Do item's description inline
- [ ] User can delete a To-Do item
- [ ] To-Do items persist across browser refresh (localStorage via Web Worker)
- [ ] All unit tests pass (`pnpm test`)
- [ ] All Storybook stories render without error (`pnpm storybook`)
- [ ] Playwright E2E test covers the full create → complete → edit → delete flow

## Steps

- [ ] **Step 1** — Install and configure `vite-plugin-pwa` in `apps/todo-web`.
      Create `public/manifest.webmanifest` with correct PWA metadata (name, icons,
      display: standalone, background_color, theme_color). Configure service worker
      for offline caching of app shell assets. Verify browser shows install prompt
      on `pnpm build && pnpm preview`.
- [ ] **Step 2** — Create `src/workers/todo.worker.ts`: defines `TodoItem` type
      (`id`, `description`, `completed`, `createdAt`), handles messages for
      `CREATE_TODO`, `UPDATE_TODO`, `TOGGLE_TODO`, `DELETE_TODO`, `GET_ALL_TODOS`,
      persists to `localStorage`, posts updated list back after each operation.
      Create `src/hooks/useTodoWorker.ts`: initializes the worker, exposes `todos`,
      `createTodo`, `updateTodo`, `toggleTodo`, `deleteTodo`. Write Vitest unit
      tests for the hook using a mocked worker.
- [ ] **Step 3** — Create `src/components/TodoInput.tsx`: text input + submit button
      to create a new item. Write Vitest + RTL unit test and Storybook story.
- [ ] **Step 4** — Create `src/components/TodoItem.tsx`: checkbox, description text
      (strikethrough when complete), inline edit on click, delete button. Write
      Vitest + RTL unit test and Storybook story.
- [ ] **Step 5** — Create `src/components/TodoList.tsx`: renders a list of
      `TodoItem` components. Write Vitest + RTL unit test and Storybook story.
- [ ] **Step 6** — Create `src/components/TodoApp.tsx`: root feature component
      consuming `useTodoWorker`, composing `TodoInput` and `TodoList`. Wire into
      `src/App.tsx`. Write Vitest + RTL integration test. Write Playwright E2E test
      covering the full user flow: create → complete → edit → delete.

## Technical Notes

- Web Worker in Vite: import using `new Worker(new URL('./workers/todo.worker.ts', import.meta.url), { type: 'module' })`
- Vitest cannot run actual Web Workers in jsdom — mock the worker in unit tests
  using `vi.mock` or a manual mock in `src/__mocks__/`
- `localStorage` is available in jsdom for unit tests — test persistence behavior
  in the hook tests, not the worker tests
- Storybook stories for `TodoItem` should include states: default, completed,
  editing — use Storybook args/controls for this

## Test Strategy

- **Unit tests (Vitest + RTL):**
  - `useTodoWorker` hook — all CRUD operations with mocked worker
  - `TodoInput` — renders, submits on enter and button click, clears on submit
  - `TodoItem` — renders uncompleted, renders completed, enters edit mode, calls delete
  - `TodoList` — renders empty state, renders list of items
  - `TodoApp` — integration test: full create/complete/delete cycle
- **Storybook stories:** Default, Completed, Editing states for `TodoItem`; Empty
  and Populated states for `TodoList`; full `TodoApp` story
- **Playwright E2E:** navigate to app → create item → mark complete → edit
  description → delete item → verify empty state

## Assumptions

_None yet — populated during development._

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
| | | | |
