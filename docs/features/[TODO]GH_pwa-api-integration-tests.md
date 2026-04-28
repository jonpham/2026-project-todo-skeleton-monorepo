---
project: "2026-project-todo-skeleton-monorepo"
phase: 7
slug: "pwa-api-integration-tests"
status: TODO
step_gating: false
issue: null
parent_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 7 — PWA Integration Tests & Full-Stack E2E

## Context

Phase 6 wired the PWA to the NestJS API with an optimistic sync queue. This final phase adds automated test coverage for the new integration layer: unit tests for the API client and sync queue, updated `useTodoWorker` tests, Storybook stories with a mocked API, and Playwright E2E tests covering the full-stack flow (PWA + API running together). After this phase the Epic is complete.

## Scope

**Included:**

- `src/api/todos.api.test.ts` — unit tests for the fetch wrapper
- `src/hooks/useSyncQueue.test.ts` — unit tests for enqueue/dequeue/drain
- Updated `src/hooks/useTodoWorker.test.ts` — API integration + online event coverage
- Updated Storybook stories: API-connected and offline-mode variants
- Updated `e2e/app.spec.ts` — full CRUD via API + offline/sync E2E test
- Updated `playwright.config.ts` — optional API `webServer` for local E2E
- Updated `cd-preview.yml` — API sidecar for CI E2E

**Excluded:**

- Backend API tests (covered in Phase 4)
- Performance / load tests

## Dependencies

- Phase 6 complete (PWA API client + sync queue implemented)

## Acceptance Criteria

- [ ] `pnpm --filter todo-pwa test:unit` passes all new and updated unit tests
- [ ] `pnpm --filter todo-pwa test:storybook` passes including new API-mocked stories
- [ ] `pnpm --filter todo-pwa test:e2e` passes full-stack E2E tests with both servers running
- [ ] The offline/sync E2E test correctly intercepts network calls and verifies queue behavior
- [ ] CI `cd-preview.yml` successfully runs E2E with the API as a local sidecar service
- [ ] All existing tests continue to pass (no regressions)

## Steps

- [ ] **Step 1** — Create `src/api/todos.api.test.ts`: mock `fetch`, test all 5 API functions (URL, method, body) + `ApiError` on network failure
- [ ] **Step 2** — Create `src/hooks/useSyncQueue.test.ts`: test `enqueue`, `dequeue`, `drain` (success + network failure paths)
- [ ] **Step 3** — Update `src/hooks/useTodoWorker.test.ts`: mock `todos.api.ts`, test on-mount fetch + reconcile, mutation enqueue + API call, `online` event drain
- [ ] **Step 4** — Update `TodoApp.stories.tsx` and `TodoItem.stories.tsx`: add API-connected story (mocked `fetchTodos`) and offline-mode story (API mock throws)
- [ ] **Step 5** — Update `e2e/app.spec.ts`: add full CRUD via API test (create → reload → verify persisted → update → delete) and offline/sync test (intercept network → create → verify queue → restore → verify synced)
- [ ] **Step 6** — Update `playwright.config.ts`: conditionally add API `webServer` entry when `PLAYWRIGHT_BASE_URL` is not set
- [ ] **Step 7** — Update `.github/workflows/cd-preview.yml`: start NestJS API as local sidecar before E2E step; set `VITE_API_BASE_URL=http://localhost:3001`
- [ ] **Step 8** — Update this feature doc to DONE

## Technical Notes

- **Storybook v10 pattern (ADR-004):** Import test utilities from `storybook/test`, not `@storybook/test`.
- **Playwright network interception:** Use `page.route('**/v1/todos**', route => route.abort())` to simulate offline for the sync queue E2E test.
- **`playwright.config.ts` webServer:** Add a second `webServer` entry for the API (`command: 'pnpm --filter todo-api dev'`, `port: 3001`) when `PLAYWRIGHT_BASE_URL` is not set. This starts the API automatically for local E2E runs.
- **CI sidecar pattern:** In `cd-preview.yml`, start the API with `pnpm --filter todo-api dev &` before the E2E step, then set `VITE_API_BASE_URL=http://localhost:3001`. The API is not deployed — it runs locally in the CI runner alongside the Playwright tests.
- **`useTodoWorker` test updates:** The existing tests mock the Web Worker. New tests additionally mock `todos.api.ts` using `vi.mock('../api/todos.api.js')`.

## Test Strategy

| Layer                 | Tool                       | Scope                                          |
| --------------------- | -------------------------- | ---------------------------------------------- |
| Unit — API client     | Vitest + fetch mock        | URL construction, method, body, error handling |
| Unit — sync queue     | Vitest + localStorage mock | enqueue, dequeue, drain (success + failure)    |
| Unit — useTodoWorker  | Vitest + vi.mock           | API integration, online event, reconciliation  |
| Component — Storybook | Storybook v10 + Vitest     | API-connected + offline stories                |
| E2E — full stack      | Playwright                 | CRUD persistence + offline/sync flow           |

## Assumptions

- The Playwright offline test uses network interception (`page.route`) rather than actual network disconnection — this is more reliable in CI.
- Storybook stories mock the API at the module level using `storybook/test` `fn()` — no real HTTP calls in story tests.
- The CI sidecar API uses the same SQLite dev DB as local — data is ephemeral and resets between CI runs.

## Change Log

| Date | PR  | Status Change | Notes               |
| ---- | --- | ------------- | ------------------- |
|      |     | TODO          | Feature doc created |
