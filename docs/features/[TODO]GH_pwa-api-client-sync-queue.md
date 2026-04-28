---
project: "2026-project-todo-skeleton-monorepo"
phase: 6
slug: "pwa-api-client-sync-queue"
status: TODO
step_gating: false
issue: null
parent_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 6 — PWA API Client & Optimistic Sync Queue

## Context

The Todo PWA currently stores all data in `localStorage` via a pure in-memory Web Worker (`todo.worker.ts`). This phase wires the PWA to the NestJS API using an **optimistic local-first** pattern: writes go to `localStorage` immediately (instant UI feedback), then sync to the API. A sync queue in `localStorage` handles offline scenarios and replays operations when connectivity is restored.

## Scope

**Included:**

- `src/api/todos.api.ts` — typed fetch wrapper for all 5 CRUD operations
- `src/hooks/useSyncQueue.ts` — localStorage-backed sync queue with enqueue/dequeue/drain
- Updated `src/hooks/useTodoWorker.ts` — API integration + optimistic writes + online event listener
- Updated `src/types/todo.ts` — add `updatedAt: string` field
- `VITE_API_BASE_URL` env var in `.env.example`

**Excluded:**

- Unit/integration tests (Phase 7)
- Storybook stories for API-connected state (Phase 7)
- Playwright E2E (Phase 7)
- Authentication

## Dependencies

- Phase 5 complete (API running at `localhost:3001` via monorepo compose stack)

## Acceptance Criteria

- [ ] With API running: creating a todo persists to SQLite; refreshing the page shows the todo (loaded from API on mount)
- [ ] With API stopped: creating a todo succeeds locally; it appears in `todo-sync-queue` in `localStorage`
- [ ] When API comes back online: queued operations are replayed; `todo-sync-queue` is emptied
- [ ] Temporary client IDs are replaced with server-assigned UUIDs after successful sync
- [ ] `VITE_API_BASE_URL` is documented in `apps/todo-pwa/.env.example`
- [ ] `pnpm --filter todo-pwa dev` works with the API running alongside

## Steps

- [ ] **Step 1** — Update `src/types/todo.ts`: add `updatedAt: string` to `TodoItem`
- [ ] **Step 2** — Create `src/api/todos.api.ts`: typed fetch wrapper (`fetchTodos`, `createTodo`, `updateTodo`, `deleteTodo`) with `ApiError` class
- [ ] **Step 3** — Create `src/hooks/useSyncQueue.ts`: `enqueue`, `dequeue`, `drain` against `todo-sync-queue` localStorage key
- [ ] **Step 4** — Update `src/hooks/useTodoWorker.ts`: on-mount API fetch + reconcile, mutation enqueue + API call, `online` event drain
- [ ] **Step 5** — Add `VITE_API_BASE_URL=http://localhost:3001` to `apps/todo-pwa/.env.example`
- [ ] **Step 6** — Update this feature doc to DONE

## Technical Notes

- `VITE_API_BASE_URL` is read via `import.meta.env.VITE_API_BASE_URL` — Vite exposes only `VITE_`-prefixed vars to the browser bundle.
- The API client uses native `fetch` only — no Axios or other HTTP library.
- Sync queue entries: `{ queueId: string, operation: 'CREATE'|'UPDATE'|'TOGGLE'|'DELETE', payload: object, tempId?: string }`.
- On mount reconciliation: server state wins for IDs that exist on both sides. Todos only in `localStorage` (not yet synced) are kept with their temp IDs until the queue drains.
- `drain()` replays operations in insertion order. Non-network errors (e.g. `404` on a delete) are dropped with `console.warn` — they indicate stale queue entries.
- The Web Worker (`todo.worker.ts`) remains a pure in-memory state machine — it is NOT changed in this phase. The hook continues to use it for immediate in-memory updates.
- CORS is already configured in the API to allow `http://localhost:5173` — no Vite proxy needed.

## Sync Flow

```
UI mutation (e.g. createTodo)
→ optimistic write to localStorage + worker (immediate UI update)
→ enqueue operation in todo-sync-queue
→ attempt API call
✓ success → dequeue, replace tempId with server UUID in localStorage
✗ network error → leave in queue (drained on next "online" event)
```

## Test Strategy

- **Manual:** Run PWA + API together, create todos, verify SQLite persistence on page reload
- **Offline manual:** Stop API, create todos, verify queue in localStorage, restart API, verify sync
- **Automated:** Deferred to Phase 7

## Assumptions

- `updatedAt` is added to `TodoItem` to match the API response shape. Existing localStorage data without `updatedAt` is handled gracefully (treated as `undefined`).
- The sync queue does not implement retry backoff in this phase — operations are retried once on the next `online` event.
- If the PWA is used without an API (pure offline mode), it degrades gracefully to the existing localStorage-only behavior.

## Change Log

| Date | PR  | Status Change | Notes               |
| ---- | --- | ------------- | ------------------- |
|      |     | TODO          | Feature doc created |
