# TODOS

Deferred items captured during planning and review. Each item includes enough context
to pick up in a future session without re-deriving the motivation.

---

## Phase 2 — Before Adding Relational Fields

### N+1 guard on findAll()

**What:** Add `select` projection to `todos.service.ts:findAll()` before Phase 2 adds relational fields (tags, lists, assignments).

**Why:** N+1 queries — fetching related records one-by-one per todo instead of joining — become expensive at scale. `findMany` without a `select` or `include` will issue one extra query per todo per relation. Adding a projection now is a 2-line change; doing it after relations land requires touching every caller.

**Context:** `apps/todo-api-nestjs/src/todos/todos.service.ts` — `findAll()` currently returns Prisma's default (all scalar fields, no relations). Safe for Phase 1. When Phase 2 adds a `Tag` or `List` relation, any eager-load without explicit projection will N+1 at the service layer.

**Depends on:** Phase 2 domain work (tags, lists, or assignments landing in the schema).

---

## Phase 2 — Before Multi-Device or High-Volume Sync

### Sync queue rate limiting and retry backoff

**What:** Add per-flush rate limiting and exponential retry backoff to the `useTodoApi` queue flush handler.

**Why:** The Phase 1 flush is unbounded and sequential — on reconnect, every queued write fires immediately in order with no delay. For a single-user todo app this is fine. For multi-device or shared-list scenarios, a burst of reconnecting clients all flushing at once is a thundering herd problem that will saturate the API.

**Context:** `apps/todo-pwa-vite/src/hooks/useTodoApi.ts` — the flush handler on the `online` event. Phase 1 code comment marks this: "Unbounded sequential flush — add rate limiting before multi-user or high-volume use." Retry backoff also needed: if the API returns 429 or 503 during flush, the current handler surfaces an error and leaves the item in the queue, but doesn't back off before the next reconnect attempt.

**Depends on:** Phase 2 multi-device scope or any shared-list feature that introduces concurrent users.
