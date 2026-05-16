---
project: "2026-project-todo-skeleton-monorepo"
phase: 6
slug: "pwa-offline-first-api-sync"
status: DONE
step_gating: false
epic_issue: null
branch: feat/GH37-GH40-w3-pwa-offline-sync
pr: null
completed_at: "2026-05-16"
---

# Phase 6 — PWA Offline-First API Sync

## Context

The Todo PWA uses a dedicated Web Worker as its data service. React calls
`useTodos()`, which resolves to `useTodoWorker()`. The hook only creates the
worker, forwards commands with `postMessage`, and maps worker state messages to
the shared `TodoHook` shape.

All data and sync behavior lives in `src/workers/todo.worker.ts`:

- durable todo storage in worker-owned IndexedDB
- durable write queue in worker-owned IndexedDB
- optimistic local updates with `syncStatus: 'pending'`
- NestJS API fetch/write/flush calls via `src/api/todo-api-client.ts`
- online/offline event handling inside the worker

This intentionally replaces the rejected `useTodoApi` hook architecture. A
Service Worker remains the production upgrade path for asset caching and richer
network interception; it is not the data service in this phase.

## Scope

**Included:**

- `src/types/todo.ts` — shared `TodoHook`, `UiTodo`, and `SyncStatus`
- `src/api/todo-api-client.ts` — thin fetch wrapper for the NestJS Todo API
- `src/workers/todo.worker.ts` — worker-owned IndexedDB persistence, sync queue,
  API calls, online/offline detection, and state emission
- `src/hooks/useTodoWorker.ts` — thin worker adapter implementing `TodoHook`
- `src/hooks/useTodos.ts` — module-level assignment to `useTodoWorker`
- `src/App.tsx` — offline banner and error state driven by hook state
- `apps/todo-pwa-vite/.env.example` — `VITE_TODO_API_URL=http://localhost:3001/v1`
- L1 Vitest coverage for API client and hook/worker message contract

**Excluded:**

- Service Worker data sync
- Authentication
- Rate limiting / retry backoff
- L3 system integration tests and L4 E2E tests (Phase 7 / GH40)

## Acceptance Criteria

- [x] With API running: worker can load synced todos from the API on init
- [x] With API stopped/offline: creating a todo succeeds locally with
      `syncStatus: 'pending'`
- [x] Queue is durable in worker-owned IndexedDB rather than `localStorage`
- [x] When online: queued operations are replayed and successful todos transition
      to `syncStatus: 'synced'`
- [x] Offline state is surfaced through `TodoHook.offline`
- [x] API/flush errors are surfaced through `TodoHook.error` without crashing UI
- [x] Client-generated UUID is owned by the worker and preserved in POST body
- [x] Failed queue entries remain queued for a later retry
- [x] Queue/todo state can hydrate after hook remount through worker-owned storage
- [x] `VITE_TODO_API_URL=http://localhost:3001/v1` documented in `.env.example`
- [x] L1 Vitest tests pass for API client and worker-hook contract

## Steps

- [x] **Step 1** — Define `TodoHook`, `UiTodo`, and `SyncStatus`
- [x] **Step 2** — Add Todo API client using `VITE_TODO_API_URL`
- [x] **Step 3** — Implement worker-owned IndexedDB todo persistence and sync queue
- [x] **Step 4** — Keep `useTodoWorker` thin: `postMessage` commands and state mapping only
- [x] **Step 5** — Wire `useTodos` to `useTodoWorker`
- [x] **Step 6** — Remove rejected `useTodoApi` hook and tests
- [x] **Step 7** — Verify TypeScript and L1 unit tests

## Technical Notes

- **Web Worker storage:** dedicated Web Workers cannot use `localStorage`, so
  durable worker-owned state uses IndexedDB.
- **React boundary:** React never reads/writes todo persistence and never creates
  todo IDs. It forwards commands only.
- **Worker state messages:** the worker emits `{ todos, offline, error,
isLoading }`; the hook maps that directly to `TodoHook`.
- **Sync queue:** each entry is persisted in IndexedDB with a generated `queueId`,
  operation type, and payload. Entries are removed only after successful API sync
  or known duplicate conflict handling.
- **Service Worker:** still useful later for production PWA asset/network strategy,
  but not used for Todo data ownership in GH37.

## Test Strategy

| Level   | Tool                       | What                                                                               |
| ------- | -------------------------- | ---------------------------------------------------------------------------------- |
| L1 Unit | Vitest + MockWorker        | Thin hook message contract, offline pending behavior, retry persistence simulation |
| L1 Unit | Vitest + mocked fetch      | Todo API client request/response/error behavior                                    |
| L3/L4   | Vitest system + Playwright | Deferred to GH40                                                                   |

## Assumptions

- IndexedDB is available in the target PWA browsers and in dedicated worker
  contexts.
- The NestJS API accepts client-provided IDs for idempotent create replay.
- `VITE_TODO_API_URL` points at the NestJS API origin.

## Change Log

| Date       | PR  | Status Change | Notes                                                              |
| ---------- | --- | ------------- | ------------------------------------------------------------------ |
| 2026-05-16 |     | DONE          | Corrected GH37 to worker-owned IndexedDB offline sync architecture |
