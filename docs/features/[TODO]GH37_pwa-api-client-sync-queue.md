---
project: "2026-project-todo-skeleton-monorepo"
phase: 6
slug: "pwa-offline-first-api-sync"
status: TODO
step_gating: false
epic_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 6 — PWA Offline-First API Sync

## Context

The Todo PWA currently stores all data locally via a Web Worker (`todo.worker.ts`). This phase
introduces a second hook implementation — `useTodoApi` — that operates offline-first: all writes
go to localStorage immediately (instant UI feedback), then sync to the NestJS API when online.
A write queue in `localStorage` handles offline scenarios and replays operations on reconnect.

The PWA always uses local storage as its source of truth. The API is the sync target, not the
primary data source. A single build supports both online and offline operation — there is no
build-time mode toggle.

`useTodoWorker` (pure local, no API) and `useTodoApi` (offline-first with sync) both implement
the shared `TodoHook` interface. `useTodos` is a module-level assignment that selects which
implementation the app uses — it is not a conditional hook call.

## Scope

**Included:**

- `src/types/todo.ts` — extend `TodoItem` with `UiTodo` (adds `syncStatus`) and `TodoHook` interface
- `src/hooks/useTodoApi.ts` — offline-first hook: local state + embedded sync queue + API calls
- Updated `src/hooks/useTodos.ts` — module-level assignment to `useTodoApi`
- Updated `src/App.tsx` (or equivalent) — offline banner driven by `hook.offline`
- `VITE_TODO_API_URL` env var in `apps/todo-pwa-vite/.env.example`
- L1 Vitest unit tests for `useTodoApi` queue logic (co-located with implementation)

**Excluded:**

- Changes to `useTodoWorker` (remains pure local, no API awareness)
- Changes to `@todo-skeleton/types` (wire types — Phase W2)
- L3 system integration tests and L4 E2E (Phase 7)
- Authentication
- Rate limiting / retry backoff (TODOS.md — Phase 2)

## Dependencies

- Phase 5 complete (NestJS API running at `localhost:3001` via Docker Compose)
- `@todo-skeleton/types` workspace package exists with `TodoItem`, `CreateTodoDto` (with `id?: string`), `UpdateTodoDto`

## Acceptance Criteria

- [ ] With API running: creating a todo persists to SQLite; refreshing the page shows the todo loaded from API on mount
- [ ] With API stopped: creating a todo succeeds locally with `syncStatus: 'pending'`; item appears in `todo-sync-queue` localStorage key
- [ ] When API comes back online: queued operations are replayed in insertion order; `todo-sync-queue` is emptied; `syncStatus` transitions to `'synced'`
- [ ] Offline banner is visible when `navigator.onLine` is false; disappears on reconnect
- [ ] API error during flush (4xx/5xx): error surfaced in UI, item remains in queue, no crash
- [ ] Client-generated UUID (from `crypto.randomUUID()`) is preserved in POST body — idempotent on replay
- [ ] Partial flush failure: if item 2 of 3 fails, items 1 and 3 succeed; item 2 remains in queue for next reconnect
- [ ] Queue persists across page reloads (localStorage survives browser refresh while offline)
- [ ] `VITE_TODO_API_URL=http://localhost:3001` documented in `apps/todo-pwa-vite/.env.example`
- [ ] All L1 Vitest tests pass for queue logic

## Steps

- [ ] **Step 1** — Update `src/types/todo.ts`: define `TodoHook` interface (`todos`, `createTodo`, `updateTodo`, `toggleTodo`, `deleteTodo`, `offline: boolean`, `error: string | null`, `isLoading: boolean`) and `UiTodo = TodoItem & { syncStatus: 'pending' | 'synced' | 'failed' }`
- [ ] **Step 2** — Create `src/hooks/useTodoApi.ts`: implements `TodoHook` — on-mount fetch from API, all mutations write to local state immediately with `syncStatus: 'pending'`, enqueue to `todo-sync-queue` in localStorage, attempt API call; `online` event triggers queue drain; `offline`/`online` events update `offline` flag; client UUID from `crypto.randomUUID()`
- [ ] **Step 3** — Write L1 Vitest tests for `useTodoApi` queue logic: offline create → `syncStatus: 'pending'`; reconnect → `syncStatus: 'synced'`; partial flush failure → failed item stays in queue; idempotent flush (same UUID not duplicated); queue persists across mock page reload
- [ ] **Step 4** — Update `src/hooks/useTodos.ts`: `export const useTodos: () => TodoHook = useTodoApi` (module-level assignment, not a conditional hook call)
- [ ] **Step 5** — Update `src/App.tsx`: render offline banner when `hook.offline === true`; render `hook.error` as a non-crashing error state when non-null
- [ ] **Step 6** — Add `VITE_TODO_API_URL=http://localhost:3001` to `apps/todo-pwa-vite/.env.example`; update any existing `import.meta.env.VITE_API_BASE_URL` references to `VITE_TODO_API_URL`
- [ ] **Step 7** — Update this feature doc to DONE

## Technical Notes

- **Single build, no mode toggle:** `VITE_TODO_MODE` is eliminated. The single build always uses local storage and syncs to the API when `VITE_TODO_API_URL` is set and the network is available.
- **`TodoHook` interface:** Both `useTodoWorker` and `useTodoApi` must satisfy this interface. `useTodoWorker` returns `offline: false, error: null, isLoading: false` (always online, no API).
- **`useTodos` assignment:** `export const useTodos: () => TodoHook = useTodoApi` at module level. Do NOT use a conditional inside a function body — that would violate React rules of hooks.
- **Sync queue structure:** Each entry is `{ id: string, operation: 'CREATE'|'UPDATE'|'TOGGLE'|'DELETE', payload: object }`. The `id` field is the client-generated UUID for CREATE operations.
- **Flush behavior:** Sequential, in insertion order. If an item fails (network error, 4xx, 5xx), it remains in the queue. Non-network 4xx errors (e.g. 409 duplicate) should be dropped with `console.warn` — they indicate a stale queue entry.
- **`navigator.onLine`:** Checked on mount for initial `offline` state. Updated via `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`. Flush triggered on `online` event.
- **Playwright offline mechanism (for Phase 7):** Use `page.context().setOffline(true)` — sets `navigator.onLine = false` AND fires the `offline` event. Do NOT use `page.route()` alone — it intercepts requests but does not update `navigator.onLine`.
- **Rate limiting / backoff:** Not implemented in Phase 1. See `TODOS.md` for the Phase 2 deferred item.

## Sync Flow

```
UI mutation (e.g. createTodo)
→ generate client UUID (crypto.randomUUID())
→ optimistic write to local state with syncStatus: 'pending'
→ enqueue to todo-sync-queue in localStorage
→ attempt API call
  ✓ success → dequeue, update syncStatus to 'synced'
  ✗ network error → leave in queue; flush on next 'online' event
  ✗ 4xx/5xx → surface error in UI; item stays in queue (or dropped for 409)
```

## Test Strategy

| Level            | Tool                                           | What                                                          |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| L1 Unit          | Vitest + mocked fetch + mocked localStorage    | useTodoApi queue logic — all scenarios in Acceptance Criteria |
| L4 E2E (offline) | Playwright + `page.context().setOffline(true)` | Offline banner smoke test — Phase 7                           |

L1 tests live at `apps/todo-pwa-vite/src/hooks/useTodoApi.test.ts`. They mock `fetch` globally and mock `localStorage`. No real network calls.

## Assumptions

- `@todo-skeleton/types` is available as a workspace dependency with `TodoItem` and `CreateTodoDto { id?: string, description: string }`.
- NestJS API accepts a client-provided `id` in the POST body (via `CreateTodoDto id?` — upstream change tracked in W1 upstream issue).
- The API uses `PATCH /v1/todos/:id` for updates and `DELETE /v1/todos/:id` for deletes — same IDs as the client-generated UUIDs.
- `useTodoWorker` is not modified in this phase; it continues to return `offline: false` to satisfy `TodoHook`.

## Change Log

| Date | PR  | Status Change | Notes                                                               |
| ---- | --- | ------------- | ------------------------------------------------------------------- |
|      |     | TODO          | Rewritten for W3 offline-first architecture (eng review 2026-04-28) |
