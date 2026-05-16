# W3 PWA Offline-First API Sync + Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement offline-first API sync in the Vite PWA and add L3 NestJS system tests + L4 Docker Compose E2E tests, completing the W3 workstream (GH37 + GH40).

**Architecture:** `useTodoWorker` is the active data adapter and remains thin: it creates the dedicated Web Worker, sends commands with `postMessage`, and maps worker state messages into the shared `TodoHook` interface. `todo.worker.ts` is the data service. It owns IndexedDB todo persistence, IndexedDB sync queue persistence, API fetch/write/flush calls, and online/offline event handling. React does not own local persistence, queue logic, network sync, or todo ID generation. `useTodoApi` was removed because the hook-owned architecture was rejected.

**Architecture correction (2026-05-15):** Earlier sections of this implementation plan describe a superseded `useTodoApi` + `localStorage` design. GH37 has been corrected to the Web Worker + IndexedDB design above. Continue from GH40 / Task 12 for system and E2E tests; do not reintroduce `useTodoApi`.

**Tech Stack:** Vite + React 18 + TypeScript (strict) + Vitest (jsdom) + `@jonpham/2026-project-todo-types` | NestJS + Prisma + SQLite + Vitest + supertest (L3) | Playwright + Docker Compose (L4)

---

## File Map

### Phase 6 — GH37

| File                                                            | Action                                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/todo-pwa-vite/src/types/todo.ts`                          | Modify — add `SyncStatus`, `UiTodo`, `TodoHook`                                                      |
| `apps/todo-pwa-vite/src/workers/todo.worker.ts`                 | Modify — own IndexedDB persistence, queue, API calls, UUID generation, online/offline events         |
| `apps/todo-pwa-vite/src/hooks/useTodoWorker.ts`                 | Modify — thin `postMessage`/`onmessage` adapter that returns `TodoHook`                              |
| `apps/todo-pwa-vite/src/hooks/useTodoWorker.test.ts`            | Modify — assert thin adapter contract and simulate worker-owned queue/sync behavior via `MockWorker` |
| `apps/todo-pwa-vite/src/hooks/useTodos.ts`                      | Create — module-level export `= useTodoWorker`                                                       |
| `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.tsx`         | Modify — props-driven (remove hook call)                                                             |
| `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.test.tsx`    | Modify — pass mock props; remove MockWorker stub                                                     |
| `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.stories.tsx` | Modify — add required props to story                                                                 |
| `apps/todo-pwa-vite/src/components/TodoList/TodoList.tsx`       | Modify — accept `UiTodo[]`                                                                           |
| `apps/todo-pwa-vite/src/components/TodoItem/TodoItem.tsx`       | Modify — accept `UiTodo`, show sync status badge                                                     |
| `apps/todo-pwa-vite/src/App.tsx`                                | Modify — call `useTodos()`, offline banner, error state                                              |
| `apps/todo-pwa-vite/src/App.test.tsx`                           | Modify — mock `useTodos`; add offline/error tests                                                    |
| `apps/todo-pwa-vite/src/api/todo-api-client.ts`                 | Create — thin fetch wrapper over `VITE_TODO_API_URL`                                                 |
| `apps/todo-pwa-vite/src/api/todo-api-client.test.ts`            | Create — L1 unit tests (mock fetch)                                                                  |
| `apps/todo-pwa-vite/src/hooks/useTodoApi.ts`                    | Delete — rejected hook-owned data architecture                                                       |
| `apps/todo-pwa-vite/src/hooks/useTodoApi.test.ts`               | Delete — replaced by `useTodoWorker.test.ts` MockWorker coverage                                     |
| `apps/todo-pwa-vite/.env.example`                               | Modify — add `VITE_TODO_API_URL`                                                                     |

### Phase 7 — GH40

| File                                             | Action                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| `packages/todo-types/src/index.test.ts`          | **Already done** — full Zod schema coverage exists |
| `apps/todo-api-nestjs/vitest.config.ts`          | Modify — add `integration` project                 |
| `apps/todo-api-nestjs/package.json`              | Modify — add `test:system` script                  |
| `apps/todo-api-nestjs/test/todos.system.spec.ts` | Create — L3 system tests                           |
| `e2e-docker/package.json`                        | Create — Playwright dev dependency                 |
| `e2e-docker/playwright.config.ts`                | Create — L4 Playwright config                      |
| `e2e-docker/offline-sync.spec.ts`                | Create — L4 offline create → sync cycle            |
| `e2e-docker/volume-persistence.spec.ts`          | Create — L4 SQLite volume persistence              |
| `apps/todo-pwa-vite/e2e/app.spec.ts`             | Modify — add offline smoke tests                   |
| `.github/workflows/ci.yml`                       | Modify — add `system-tests` job                    |

---

## Task 1: Extend src/types/todo.ts with TodoHook, SyncStatus, UiTodo

**Files:**

- Modify: `apps/todo-pwa-vite/src/types/todo.ts`

- [ ] **Step 1: Replace file content**

```typescript
export type { TodoItem } from "@jonpham/2026-project-todo-types";

export type SyncStatus = "pending" | "synced" | "failed";

export type UiTodo = import("@jonpham/2026-project-todo-types").TodoItem & {
  syncStatus: SyncStatus;
};

export interface TodoHook {
  todos: UiTodo[];
  createTodo: (description: string) => void;
  updateTodo: (id: string, description: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  offline: boolean;
  error: string | null;
  isLoading: boolean;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter todo-pwa-vite exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/todo-pwa-vite/src/types/todo.ts
git commit -m "feat: define TodoHook interface, SyncStatus, UiTodo in types/todo.ts"
```

---

## Task 2: Update todo.worker.ts to accept client-provided id

**Files:**

- Modify: `apps/todo-pwa-vite/src/workers/todo.worker.ts`

The worker currently generates its own UUID. Change `CREATE_TODO` payload to require `id: string` so the hook controls the UUID (needed for idempotent queue replay).

- [ ] **Step 1: Replace file content**

```typescript
import type { TodoItem } from "../types/todo";

type WorkerMessage =
  | { type: "LOAD_TODOS"; payload: { todos: TodoItem[] } }
  | { type: "CREATE_TODO"; payload: { id: string; description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } };

let todos: TodoItem[] = [];

function reply(): void {
  self.postMessage({ todos });
}

self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "LOAD_TODOS":
      todos = msg.payload.todos;
      reply();
      break;

    case "CREATE_TODO":
      todos = [
        ...todos,
        {
          id: msg.payload.id,
          description: msg.payload.description,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ];
      reply();
      break;

    case "UPDATE_TODO":
      todos = todos.map((t) =>
        t.id === msg.payload.id
          ? { ...t, description: msg.payload.description }
          : t
      );
      reply();
      break;

    case "TOGGLE_TODO":
      todos = todos.map((t) =>
        t.id === msg.payload.id ? { ...t, completed: !t.completed } : t
      );
      reply();
      break;

    case "DELETE_TODO":
      todos = todos.filter((t) => t.id !== msg.payload.id);
      reply();
      break;
  }
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm --filter todo-pwa-vite exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/todo-pwa-vite/src/workers/todo.worker.ts
git commit -m "feat: accept client-provided id in worker CREATE_TODO payload"
```

---

## Task 3: Update useTodoWorker to satisfy TodoHook + generate client UUIDs

**Files:**

- Modify: `apps/todo-pwa-vite/src/hooks/useTodoWorker.ts`
- Modify: `apps/todo-pwa-vite/src/hooks/useTodoWorker.test.ts`

- [ ] **Step 1: Replace useTodoWorker.test.ts**

```typescript
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTodoWorker } from "./useTodoWorker";
import type { UiTodo } from "../types/todo";

class MockWorker {
  static latest: MockWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    MockWorker.latest = this;
  }

  respond(todos: UiTodo[]) {
    this.onmessage?.({ data: { todos } } as MessageEvent);
  }
}

vi.stubGlobal("Worker", MockWorker);

let mockRandomUUID: ReturnType<typeof vi.fn>;

const makeTodo = (overrides: Partial<UiTodo> = {}): UiTodo => ({
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "synced",
  ...overrides,
});

describe("useTodoWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRandomUUID = vi.fn().mockReturnValue("test-uuid-1234-5678");
    vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });
  });

  it("initializes with an empty todos array", () => {
    const { result } = renderHook(() => useTodoWorker());
    expect(result.current.todos).toEqual([]);
  });

  it("always returns offline: false, error: null, isLoading: false", () => {
    const { result } = renderHook(() => useTodoWorker());
    expect(result.current.offline).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("sends LOAD_TODOS on mount with empty array when localStorage is empty", () => {
    renderHook(() => useTodoWorker());
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "LOAD_TODOS",
      payload: { todos: [] },
    });
  });

  it("sends LOAD_TODOS on mount with saved todos from localStorage", () => {
    const saved = [makeTodo()];
    localStorage.setItem("todos", JSON.stringify(saved));
    renderHook(() => useTodoWorker());
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "LOAD_TODOS",
      payload: { todos: saved },
    });
  });

  it("updates todos state when the worker responds", () => {
    const todo = makeTodo();
    const { result } = renderHook(() => useTodoWorker());
    act(() => {
      MockWorker.latest.respond([todo]);
    });
    expect(result.current.todos).toEqual([todo]);
  });

  it("persists todos to localStorage when the worker responds", () => {
    const todo = makeTodo();
    renderHook(() => useTodoWorker());
    act(() => {
      MockWorker.latest.respond([todo]);
    });
    expect(JSON.parse(localStorage.getItem("todos") ?? "[]")).toEqual([todo]);
  });

  it("createTodo sends CREATE_TODO with a client-generated UUID and description", () => {
    const { result } = renderHook(() => useTodoWorker());
    act(() => {
      result.current.createTodo("Buy groceries");
    });
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "CREATE_TODO",
      payload: { id: "test-uuid-1234-5678", description: "Buy groceries" },
    });
  });

  it("toggleTodo sends TOGGLE_TODO with id", () => {
    const { result } = renderHook(() => useTodoWorker());
    act(() => {
      result.current.toggleTodo("1");
    });
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "TOGGLE_TODO",
      payload: { id: "1" },
    });
  });

  it("updateTodo sends UPDATE_TODO with id and description", () => {
    const { result } = renderHook(() => useTodoWorker());
    act(() => {
      result.current.updateTodo("1", "Updated text");
    });
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "UPDATE_TODO",
      payload: { id: "1", description: "Updated text" },
    });
  });

  it("deleteTodo sends DELETE_TODO with id", () => {
    const { result } = renderHook(() => useTodoWorker());
    act(() => {
      result.current.deleteTodo("1");
    });
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "DELETE_TODO",
      payload: { id: "1" },
    });
  });

  it("terminates the worker on unmount", () => {
    const { unmount } = renderHook(() => useTodoWorker());
    unmount();
    expect(MockWorker.latest.terminate).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — confirm failures**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL)" | grep useTodoWorker
```

Expected: multiple FAIL (UUID assertion and new return fields not satisfied yet)

- [ ] **Step 3: Replace useTodoWorker.ts**

```typescript
import { useEffect, useRef, useState } from "react";
import type { TodoHook, UiTodo } from "../types/todo";

const STORAGE_KEY = "todos";

function loadFromStorage(): UiTodo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useTodoWorker(): TodoHook {
  const [todos, setTodos] = useState<UiTodo[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/todo.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<{ todos: UiTodo[] }>) => {
      const updated = event.data.todos.map((t) => ({
        ...t,
        syncStatus: "synced" as const,
      }));
      setTodos(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    workerRef.current = worker;
    worker.postMessage({
      type: "LOAD_TODOS",
      payload: { todos: loadFromStorage() },
    });

    return () => {
      worker.terminate();
    };
  }, []);

  function createTodo(description: string) {
    const id = crypto.randomUUID();
    workerRef.current?.postMessage({
      type: "CREATE_TODO",
      payload: { id, description },
    });
  }

  function updateTodo(id: string, description: string) {
    workerRef.current?.postMessage({
      type: "UPDATE_TODO",
      payload: { id, description },
    });
  }

  function toggleTodo(id: string) {
    workerRef.current?.postMessage({ type: "TOGGLE_TODO", payload: { id } });
  }

  function deleteTodo(id: string) {
    workerRef.current?.postMessage({ type: "DELETE_TODO", payload: { id } });
  }

  return {
    todos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    offline: false,
    error: null,
    isLoading: false,
  };
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL)" | head -20
```

Expected: all useTodoWorker tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/todo-pwa-vite/src/hooks/useTodoWorker.ts apps/todo-pwa-vite/src/hooks/useTodoWorker.test.ts
git commit -m "feat: useTodoWorker generates client UUIDs, satisfies TodoHook interface"
```

---

## Task 4: Create useTodos.ts (temporary placeholder — points to useTodoWorker)

**Files:**

- Create: `apps/todo-pwa-vite/src/hooks/useTodos.ts`

This placeholder lets App.tsx and tests reference `useTodos` before `useTodoApi` exists. Task 10 switches it to `useTodoApi`.

- [ ] **Step 1: Create the file**

```typescript
import type { TodoHook } from "../types/todo";
import { useTodoWorker } from "./useTodoWorker";

export const useTodos: () => TodoHook = useTodoWorker;
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm --filter todo-pwa-vite exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/todo-pwa-vite/src/hooks/useTodos.ts
git commit -m "feat: create useTodos module-level export (placeholder → useTodoWorker)"
```

---

## Task 5: Refactor TodoApp.tsx to accept props + update tests

**Files:**

- Modify: `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.tsx`
- Modify: `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.test.tsx`
- Modify: `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.stories.tsx`

TodoApp currently calls `useTodoWorker()` directly. It becomes a presentational component. The hook call moves to `App.tsx` in Task 7.

- [ ] **Step 1: Replace TodoApp.test.tsx**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TodoApp } from "./TodoApp";
import type { UiTodo } from "../../types/todo";

const makeTodo = (overrides: Partial<UiTodo> = {}): UiTodo => ({
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "synced",
  ...overrides,
});

describe("TodoApp", () => {
  const mockCreateTodo = vi.fn();
  const mockToggleTodo = vi.fn();
  const mockUpdateTodo = vi.fn();
  const mockDeleteTodo = vi.fn();

  const defaultProps = {
    todos: [] as UiTodo[],
    onCreateTodo: mockCreateTodo,
    onToggleTodo: mockToggleTodo,
    onUpdateTodo: mockUpdateTodo,
    onDeleteTodo: mockDeleteTodo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when todos is empty", () => {
    render(<TodoApp {...defaultProps} />);
    expect(screen.getByText(/no to-do items/i)).toBeInTheDocument();
  });

  it("renders passed todos", () => {
    render(<TodoApp {...defaultProps} todos={[makeTodo()]} />);
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("shows pending badge for syncStatus: pending", () => {
    render(
      <TodoApp {...defaultProps} todos={[makeTodo({ syncStatus: "pending" })]} />
    );
    expect(screen.getByTitle(/pending sync/i)).toBeInTheDocument();
  });

  it("calls onCreateTodo when input is submitted", async () => {
    render(<TodoApp {...defaultProps} />);
    await userEvent.type(screen.getByRole("textbox"), "New task{Enter}");
    expect(mockCreateTodo).toHaveBeenCalledWith("New task");
  });

  it("calls onToggleTodo when checkbox is clicked", async () => {
    render(<TodoApp {...defaultProps} todos={[makeTodo()]} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(mockToggleTodo).toHaveBeenCalledWith("1");
  });

  it("calls onDeleteTodo when delete is clicked", async () => {
    render(<TodoApp {...defaultProps} todos={[makeTodo()]} />);
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockDeleteTodo).toHaveBeenCalledWith("1");
  });

  it("calls onUpdateTodo when inline edit is committed", async () => {
    render(<TodoApp {...defaultProps} todos={[makeTodo()]} />);
    await userEvent.click(screen.getByText("Buy groceries"));
    const editInput = screen.getByRole("textbox", { name: /edit todo/i });
    await userEvent.clear(editInput);
    await userEvent.type(editInput, "Buy organic{Enter}");
    expect(mockUpdateTodo).toHaveBeenCalledWith("1", "Buy organic");
  });
});
```

- [ ] **Step 2: Run — confirm failures**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep "TodoApp"
```

Expected: FAIL — TodoApp does not accept these props yet

- [ ] **Step 3: Replace TodoApp.tsx**

```typescript
import type { UiTodo } from "../../types/todo";
import { TodoInput } from "../TodoInput";
import { TodoList } from "../TodoList";

interface TodoAppProps {
  todos: UiTodo[];
  onCreateTodo: (description: string) => void;
  onUpdateTodo: (id: string, description: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export function TodoApp({
  todos,
  onCreateTodo,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoAppProps) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Todo PWA</h1>
      <TodoList
        todos={todos}
        onToggle={onToggleTodo}
        onUpdate={onUpdateTodo}
        onDelete={onDeleteTodo}
      />
      <TodoInput onSubmit={onCreateTodo} />
    </>
  );
}
```

- [ ] **Step 4: Update TodoApp.stories.tsx to pass required props**

Open `apps/todo-pwa-vite/src/components/TodoApp/TodoApp.stories.tsx`. Add props to any story that renders `<TodoApp>`. The exact content depends on the existing story shape — add at minimum:

```typescript
// Example — adapt to existing story format
const defaultArgs = {
  todos: [],
  onCreateTodo: () => {},
  onUpdateTodo: () => {},
  onToggleTodo: () => {},
  onDeleteTodo: () => {},
};
```

Pass `defaultArgs` (or equivalent) wherever `<TodoApp />` is rendered in the stories file.

- [ ] **Step 5: Run tests — confirm passing (pending badge test may still fail until Task 6)**

```bash
pnpm --filter todo-pwa-vite test:unit
```

Expected: Most tests pass. The "shows pending badge" test fails until TodoItem is updated in Task 6.

- [ ] **Step 6: Commit**

```bash
git add apps/todo-pwa-vite/src/components/TodoApp/TodoApp.tsx apps/todo-pwa-vite/src/components/TodoApp/TodoApp.test.tsx apps/todo-pwa-vite/src/components/TodoApp/TodoApp.stories.tsx
git commit -m "refactor: TodoApp accepts props, removes hook call (hook moves to App.tsx)"
```

---

## Task 6: Update TodoList and TodoItem to accept UiTodo + show sync badge

**Files:**

- Modify: `apps/todo-pwa-vite/src/components/TodoList/TodoList.tsx`
- Modify: `apps/todo-pwa-vite/src/components/TodoItem/TodoItem.tsx`

- [ ] **Step 1: Replace TodoList.tsx**

```typescript
import type { UiTodo } from "../../types/todo";
import { TodoItem as TodoItemComponent } from "../TodoItem";

interface TodoListProps {
  todos: UiTodo[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, description: string) => void;
  onDelete: (id: string) => void;
}

export function TodoList({ todos, onToggle, onUpdate, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-gray-400">
        No to-do items yet. Add one above!
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {todos.map((todo) => (
        <TodoItemComponent
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Replace TodoItem.tsx**

```typescript
import { useState } from "react";
import type { UiTodo } from "../../types/todo";

interface TodoItemProps {
  todo: UiTodo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, description: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.description);

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed) onUpdate(todo.id, trimmed);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(todo.description);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") cancelEdit();
  }

  return (
    <li className="flex items-center gap-3 rounded border bg-white px-4 py-2">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        aria-label={`Toggle "${todo.description}"`}
        className="h-4 w-4 accent-indigo-500"
      />

      {editing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          autoFocus
          aria-label="Edit todo"
          className="flex-1 rounded border border-indigo-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 cursor-pointer text-sm text-gray-800 ${
            todo.completed ? "line-through text-gray-400" : ""
          }`}
        >
          {todo.description}
        </span>
      )}

      {todo.syncStatus === "pending" && (
        <span
          title="Pending sync"
          aria-label="pending"
          className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0"
        />
      )}
      {todo.syncStatus === "failed" && (
        <span
          title="Sync failed"
          aria-label="failed"
          className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0"
        />
      )}

      <button
        onClick={() => onDelete(todo.id)}
        aria-label="Delete"
        className="text-gray-400 hover:text-red-500"
      >
        ✕
      </button>
    </li>
  );
}
```

- [ ] **Step 3: Run all unit tests**

```bash
pnpm --filter todo-pwa-vite test:unit
```

Expected: All tests pass (including "shows pending badge" from Task 5)

- [ ] **Step 4: Commit**

```bash
git add apps/todo-pwa-vite/src/components/TodoList/TodoList.tsx apps/todo-pwa-vite/src/components/TodoItem/TodoItem.tsx
git commit -m "feat: TodoList and TodoItem accept UiTodo, TodoItem shows sync status badge"
```

---

## Task 7: Update App.tsx — call useTodos, offline banner, error state

**Files:**

- Modify: `apps/todo-pwa-vite/src/App.tsx`
- Modify: `apps/todo-pwa-vite/src/App.test.tsx`

- [ ] **Step 1: Replace App.test.tsx**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, test, beforeEach } from "vitest";
import { useTodos } from "./hooks/useTodos";
import App from "./App";
import type { UiTodo } from "./types/todo";

vi.mock("./hooks/useTodos");

const mockCreateTodo = vi.fn();
const mockToggleTodo = vi.fn();
const mockUpdateTodo = vi.fn();
const mockDeleteTodo = vi.fn();

const mockTodo: UiTodo = {
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "synced",
};

const defaultHook = {
  todos: [mockTodo],
  createTodo: mockCreateTodo,
  updateTodo: mockUpdateTodo,
  toggleTodo: mockToggleTodo,
  deleteTodo: mockDeleteTodo,
  offline: false,
  error: null,
  isLoading: false,
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTodos).mockReturnValue(defaultHook);
  });

  test("renders without crashing", () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  test("renders the TodoInput", () => {
    render(<App />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  test("submitting TodoInput calls createTodo", async () => {
    render(<App />);
    await userEvent.type(screen.getByRole("textbox"), "New task{Enter}");
    expect(mockCreateTodo).toHaveBeenCalledWith("New task");
  });

  test("renders existing todos via TodoList", () => {
    render(<App />);
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  test("clicking a todo checkbox calls toggleTodo", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(mockToggleTodo).toHaveBeenCalledWith("1");
  });

  test("clicking delete calls deleteTodo", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(mockDeleteTodo).toHaveBeenCalledWith("1");
  });

  test("shows offline banner when hook.offline is true", () => {
    vi.mocked(useTodos).mockReturnValue({ ...defaultHook, offline: true });
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(/offline/i);
  });

  test("hides offline banner when hook.offline is false", () => {
    render(<App />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("shows error alert when hook.error is non-null", () => {
    vi.mocked(useTodos).mockReturnValue({ ...defaultHook, error: "Sync failed" });
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sync failed");
  });

  test("hides error alert when hook.error is null", () => {
    render(<App />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
```

- [ ] **Step 2: Run — confirm failures**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL)" | grep App
```

Expected: multiple FAIL (mock targets `useTodoWorker`, offline/error tests not satisfied yet)

- [ ] **Step 3: Replace App.tsx**

```typescript
import { useTodos } from "./hooks/useTodos";
import { TodoApp } from "./components/TodoApp";

function App() {
  const hook = useTodos();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-gray-50 p-8">
      {hook.offline && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-md bg-amber-100 px-4 py-2 text-sm text-amber-800"
        >
          You are offline. Changes will sync when you reconnect.
        </div>
      )}
      {hook.error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-100 px-4 py-2 text-sm text-red-800"
        >
          {hook.error}
        </div>
      )}
      <TodoApp
        todos={hook.todos}
        onCreateTodo={hook.createTodo}
        onUpdateTodo={hook.updateTodo}
        onToggleTodo={hook.toggleTodo}
        onDeleteTodo={hook.deleteTodo}
      />
    </main>
  );
}

export default App;
```

- [ ] **Step 4: Run all unit tests**

```bash
pnpm --filter todo-pwa-vite test:unit
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/todo-pwa-vite/src/App.tsx apps/todo-pwa-vite/src/App.test.tsx
git commit -m "feat: App.tsx calls useTodos, renders offline banner and error state"
```

---

## Task 8: Create todo-api-client.ts with L1 tests

**Files:**

- Create: `apps/todo-pwa-vite/src/api/todo-api-client.ts`
- Create: `apps/todo-pwa-vite/src/api/todo-api-client.test.ts`

- [ ] **Step 1: Create todo-api-client.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "./todo-api-client";

function mockResponse(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchAll", () => {
    it("GETs /v1/todos and returns parsed array", async () => {
      const todos = [
        {
          id: "1",
          description: "Test",
          completed: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ];
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse(todos));

      const result = await apiClient.fetchAll();

      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toMatch(/\/v1\/todos$/);
      expect(result).toEqual(todos);
    });

    it("throws with status code on non-2xx response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse("Not found", 404));
      await expect(apiClient.fetchAll()).rejects.toThrow("HTTP 404");
    });
  });

  describe("create", () => {
    it("POSTs to /v1/todos with body and returns created todo", async () => {
      const created = {
        id: "uuid-1",
        description: "Buy milk",
        completed: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse(created, 201));

      const result = await apiClient.create({
        id: "uuid-1",
        description: "Buy milk",
      });

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toMatch(/\/v1\/todos$/);
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({ id: "uuid-1", description: "Buy milk" })
      );
      expect(result.id).toBe("uuid-1");
    });

    it("throws on 4xx response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse("Bad request", 400));
      await expect(apiClient.create({ description: "" })).rejects.toThrow(
        "HTTP 400"
      );
    });
  });

  describe("update", () => {
    it("PATCHes /v1/todos/:id with body", async () => {
      const updated = {
        id: "1",
        description: "Updated",
        completed: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse(updated));

      await apiClient.update("1", { description: "Updated" });

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toMatch(/\/v1\/todos\/1$/);
      expect(init?.method).toBe("PATCH");
    });
  });

  describe("remove", () => {
    it("DELETEs /v1/todos/:id and resolves on 204", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse(null, 204));
      await expect(apiClient.remove("1")).resolves.toBeUndefined();
    });

    it("throws on 5xx response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse("Server error", 500));
      await expect(apiClient.remove("1")).rejects.toThrow("HTTP 500");
    });
  });
});
```

- [ ] **Step 2: Run — confirm failures**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep "todo-api-client"
```

Expected: FAIL — module does not exist

- [ ] **Step 3: Create todo-api-client.ts**

```typescript
import type {
  CreateTodoDto,
  TodoItem,
  UpdateTodoDto,
} from "@jonpham/2026-project-todo-types";

const BASE_URL = import.meta.env.VITE_TODO_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  fetchAll: () => request<TodoItem[]>("todos"),

  create: (dto: CreateTodoDto) =>
    request<TodoItem>("todos", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  update: (id: string, dto: UpdateTodoDto) =>
    request<TodoItem>(`todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),

  remove: (id: string) => request<void>(`todos/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep -E "todo-api-client" | head -20
```

Expected: All apiClient tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/todo-pwa-vite/src/api/todo-api-client.ts apps/todo-pwa-vite/src/api/todo-api-client.test.ts
git commit -m "feat: add todo-api-client.ts with fetch wrapper and L1 tests"
```

---

## Task 9: Create useTodoApi.ts with L1 Vitest tests (TDD)

**Files:**

- Create: `apps/todo-pwa-vite/src/hooks/useTodoApi.test.ts`
- Create: `apps/todo-pwa-vite/src/hooks/useTodoApi.ts`

Queue structure: `{ op: 'create'|'update'|'toggle'|'delete', id: string, payload?: object }`. Sequential flush in insertion order. Failed items (non-409) remain in queue. 409 responses are dropped with `console.warn` (stale duplicate). No rate limiting (Phase 2 deferred — add TODOS.md entry).

- [ ] **Step 1: Create useTodoApi.test.ts**

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTodoApi } from "./useTodoApi";
import type { UiTodo } from "../types/todo";

vi.mock("../api/todo-api-client", () => ({
  apiClient: {
    fetchAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { apiClient } from "../api/todo-api-client";

const QUEUE_KEY = "todo-sync-queue";

function makeTodo(overrides: Partial<UiTodo> = {}): UiTodo {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    description: "Test todo",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    syncStatus: "synced",
    ...overrides,
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

let mockRandomUUID: ReturnType<typeof vi.fn>;

describe("useTodoApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOnline(true);
    mockRandomUUID = vi.fn().mockReturnValue("client-uuid-001");
    vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });
    vi.mocked(apiClient.fetchAll).mockResolvedValue([]);
    vi.mocked(apiClient.create).mockResolvedValue(
      makeTodo({ id: "client-uuid-001", syncStatus: "synced" })
    );
    vi.mocked(apiClient.update).mockResolvedValue(
      makeTodo({ syncStatus: "synced" })
    );
    vi.mocked(apiClient.remove).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("initial state", () => {
    it("offline matches navigator.onLine on mount", async () => {
      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result } = renderHook(() => useTodoApi());
      expect(result.current.offline).toBe(true);
    });

    it("fetches todos from API on mount and sets syncStatus: synced", async () => {
      const todo = makeTodo();
      vi.mocked(apiClient.fetchAll).mockResolvedValue([todo]);
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.todos[0]).toMatchObject({
        id: todo.id,
        syncStatus: "synced",
      });
    });
  });

  describe("offline/online events", () => {
    it("sets offline: true when offline event fires", async () => {
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => window.dispatchEvent(new Event("offline")));
      expect(result.current.offline).toBe(true);
    });

    it("sets offline: false when online event fires", async () => {
      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result } = renderHook(() => useTodoApi());
      act(() => window.dispatchEvent(new Event("offline")));
      act(() => window.dispatchEvent(new Event("online")));
      expect(result.current.offline).toBe(false);
    });
  });

  describe("createTodo", () => {
    it("adds todo to local state immediately with syncStatus: pending", async () => {
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.createTodo("Buy milk"));
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0]).toMatchObject({
        id: "client-uuid-001",
        description: "Buy milk",
        syncStatus: "pending",
      });
    });

    it("writes create entry to todo-sync-queue in localStorage", async () => {
      vi.mocked(apiClient.create).mockImplementation(
        () => new Promise(() => {}) // never resolves
      );
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.createTodo("Buy milk"));
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        op: "create",
        id: "client-uuid-001",
        payload: { id: "client-uuid-001", description: "Buy milk" },
      });
    });

    it("sets syncStatus: synced and clears queue entry after API success", async () => {
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        result.current.createTodo("Buy milk");
      });
      await waitFor(() =>
        expect(result.current.todos[0]?.syncStatus).toBe("synced")
      );
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      expect(queue).toHaveLength(0);
    });

    it("does not call API when offline — item stays in queue", async () => {
      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.createTodo("Offline todo"));
      expect(apiClient.create).not.toHaveBeenCalled();
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      expect(queue).toHaveLength(1);
    });
  });

  describe("flush on reconnect", () => {
    it("flushes queued create on online event, updates syncStatus: synced", async () => {
      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.createTodo("Queued todo"));
      expect(result.current.todos[0].syncStatus).toBe("pending");

      setOnline(true);
      await act(async () => window.dispatchEvent(new Event("online")));

      await waitFor(() =>
        expect(result.current.todos[0]?.syncStatus).toBe("synced")
      );
      expect(apiClient.create).toHaveBeenCalledWith({
        id: "client-uuid-001",
        description: "Queued todo",
      });
    });

    it("preserves client UUID in create payload — same id on replay", async () => {
      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.createTodo("Idempotent"));

      setOnline(true);
      await act(async () => window.dispatchEvent(new Event("online")));
      await waitFor(() => expect(apiClient.create).toHaveBeenCalled());

      expect(vi.mocked(apiClient.create).mock.calls[0][0].id).toBe(
        "client-uuid-001"
      );
    });

    it("partial flush: failed item stays in queue, successful items removed", async () => {
      mockRandomUUID
        .mockReturnValueOnce("uuid-001")
        .mockReturnValueOnce("uuid-002");

      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.createTodo("Todo 1"); // uuid-001
        result.current.createTodo("Todo 2"); // uuid-002
      });

      // uuid-001 fails, uuid-002 succeeds
      vi.mocked(apiClient.create)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(
          makeTodo({ id: "uuid-002", syncStatus: "synced" })
        );

      setOnline(true);
      await act(async () => window.dispatchEvent(new Event("online")));

      await waitFor(() => {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
        expect(queue).toHaveLength(1);
        expect(queue[0].id).toBe("uuid-001");
      });
    });

    it("queue survives simulated page reload (localStorage persists after unmount)", async () => {
      setOnline(false);
      vi.mocked(apiClient.fetchAll).mockRejectedValue(new Error("offline"));
      const { result, unmount } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.createTodo("Persist me"));
      unmount();

      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      expect(queue).toHaveLength(1);
      expect(queue[0].payload.description).toBe("Persist me");
    });
  });

  describe("deleteTodo", () => {
    it("removes todo from local state immediately", async () => {
      vi.mocked(apiClient.fetchAll).mockResolvedValue([
        makeTodo({ id: "del-1" }),
      ]);
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.todos).toHaveLength(1));
      act(() => result.current.deleteTodo("del-1"));
      expect(result.current.todos).toHaveLength(0);
    });
  });

  describe("error state", () => {
    it("sets error when API call fails while online", async () => {
      vi.mocked(apiClient.create).mockRejectedValueOnce(
        new Error("Server error")
      );
      const { result } = renderHook(() => useTodoApi());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        result.current.createTodo("Failing create");
      });
      await waitFor(() => expect(result.current.error).toBe("Server error"));
    });
  });
});
```

- [ ] **Step 2: Run — confirm failures**

```bash
pnpm --filter todo-pwa-vite test:unit -- --reporter=verbose 2>&1 | grep "useTodoApi"
```

Expected: FAIL — module does not exist

- [ ] **Step 3: Create useTodoApi.ts**

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import type { TodoHook, UiTodo } from "../types/todo";
import type {
  CreateTodoDto,
  UpdateTodoDto,
} from "@jonpham/2026-project-todo-types";
import { apiClient } from "../api/todo-api-client";

const QUEUE_KEY = "todo-sync-queue";

type QueueEntry =
  | { op: "create"; id: string; payload: CreateTodoDto & { id: string } }
  | { op: "update"; id: string; payload: Pick<UpdateTodoDto, "description"> }
  | { op: "toggle"; id: string; payload: { completed: boolean } }
  | { op: "delete"; id: string };

function loadQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueueEntry[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useTodoApi(): TodoHook {
  const [todos, setTodos] = useState<UiTodo[]>([]);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFlushing = useRef(false);

  const flushQueue = useCallback(async () => {
    if (isFlushing.current) return;
    isFlushing.current = true;
    try {
      const queue = loadQueue();
      const remaining: QueueEntry[] = [];
      for (const entry of queue) {
        try {
          if (entry.op === "create") {
            await apiClient.create(entry.payload);
          } else if (entry.op === "update" || entry.op === "toggle") {
            await apiClient.update(entry.id, entry.payload);
          } else if (entry.op === "delete") {
            await apiClient.remove(entry.id);
          }
          setTodos((prev) =>
            prev.map((t) =>
              t.id === entry.id ? { ...t, syncStatus: "synced" as const } : t
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("409")) {
            console.warn(`Dropping duplicate queue entry for ${entry.id}`);
          } else {
            remaining.push(entry);
            setError(msg);
          }
        }
      }
      saveQueue(remaining);
    } finally {
      isFlushing.current = false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      void flushQueue();
    };
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsLoading(true);
    apiClient
      .fetchAll()
      .then((items) => {
        setTodos(items.map((t) => ({ ...t, syncStatus: "synced" as const })));
      })
      .catch(() => {
        // Network unavailable on mount — local state starts empty
      })
      .finally(() => setIsLoading(false));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue]);

  function createTodo(description: string): void {
    const id = crypto.randomUUID();
    const newTodo: UiTodo = {
      id,
      description,
      completed: false,
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
    };
    setTodos((prev) => [...prev, newTodo]);

    const entry: QueueEntry = {
      op: "create",
      id,
      payload: { id, description },
    };
    saveQueue([...loadQueue(), entry]);

    if (navigator.onLine) {
      apiClient
        .create({ id, description })
        .then(() => {
          setTodos((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, syncStatus: "synced" as const } : t
            )
          );
          saveQueue(
            loadQueue().filter((e) => !(e.op === "create" && e.id === id))
          );
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to create todo"
          );
        });
    }
  }

  function updateTodo(id: string, description: string): void {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, description, syncStatus: "pending" as const } : t
      )
    );

    const entry: QueueEntry = { op: "update", id, payload: { description } };
    saveQueue([...loadQueue(), entry]);

    if (navigator.onLine) {
      apiClient
        .update(id, { description })
        .then(() => {
          setTodos((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, syncStatus: "synced" as const } : t
            )
          );
          saveQueue(
            loadQueue().filter((e) => !(e.op === "update" && e.id === id))
          );
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to update todo"
          );
        });
    }
  }

  function toggleTodo(id: string): void {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;

    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: newCompleted, syncStatus: "pending" as const }
          : t
      )
    );

    const entry: QueueEntry = {
      op: "toggle",
      id,
      payload: { completed: newCompleted },
    };
    saveQueue([...loadQueue(), entry]);

    if (navigator.onLine) {
      apiClient
        .update(id, { completed: newCompleted })
        .then(() => {
          setTodos((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, syncStatus: "synced" as const } : t
            )
          );
          saveQueue(
            loadQueue().filter((e) => !(e.op === "toggle" && e.id === id))
          );
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to toggle todo"
          );
        });
    }
  }

  function deleteTodo(id: string): void {
    setTodos((prev) => prev.filter((t) => t.id !== id));

    const entry: QueueEntry = { op: "delete", id };
    saveQueue([...loadQueue(), entry]);

    if (navigator.onLine) {
      apiClient.remove(id).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to delete todo");
      });
    }
  }

  return {
    todos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    offline,
    error,
    isLoading,
  };
}
```

- [ ] **Step 4: Run all unit tests**

```bash
pnpm --filter todo-pwa-vite test:unit
```

Expected: All tests PASS

If a queue test fails, check `mockRandomUUID` is accessed correctly (it's a `vi.fn()` — call `.mockReturnValueOnce()` directly on it).

- [ ] **Step 5: Add TODOS.md entry for deferred rate limiting**

Create or append to `apps/todo-pwa-vite/TODOS.md`:

```markdown
## Phase 2 Deferred

- **Sync queue rate limiting**: `useTodoApi` uses unbounded sequential flush. Add rate limiting / exponential backoff before multi-user or high-volume use.
```

- [ ] **Step 6: Commit**

```bash
git add apps/todo-pwa-vite/src/hooks/useTodoApi.ts apps/todo-pwa-vite/src/hooks/useTodoApi.test.ts apps/todo-pwa-vite/TODOS.md
git commit -m "feat: implement useTodoApi offline-first hook with full L1 queue tests"
```

---

## Task 10: Wire useTodos → useTodoApi, update .env.example, mark GH37 DONE

**Files:**

- Modify: `apps/todo-pwa-vite/src/hooks/useTodos.ts`
- Modify: `apps/todo-pwa-vite/.env.example`
- Rename + modify: `docs/features/[TODO]GH37_pwa-api-client-sync-queue.md`

- [ ] **Step 1: Switch useTodos.ts to useTodoApi**

```typescript
import type { TodoHook } from "../types/todo";
import { useTodoApi } from "./useTodoApi";

// Unbounded sequential flush — add rate limiting before multi-user or high-volume use (Phase 2)
export const useTodos: () => TodoHook = useTodoApi;
```

- [ ] **Step 2: Run all unit tests — verify no regressions**

```bash
pnpm --filter todo-pwa-vite test:unit
```

Expected: All tests PASS (`App.test.tsx` mocks `useTodos` so it is unaffected by this change)

- [ ] **Step 3: Update .env.example**

Append to `apps/todo-pwa-vite/.env.example`:

```
# API base URL for offline-first sync
# Docker Compose (nginx strips /api prefix → todo-api-nestjs:3000):
VITE_TODO_API_URL=/api
# Local dev (NestJS running on host):
# VITE_TODO_API_URL=http://localhost:3001
# Railway production:
# VITE_TODO_API_URL=https://your-api.railway.app
```

- [ ] **Step 4: Update and rename GH37 feature doc**

In `docs/features/[TODO]GH37_pwa-api-client-sync-queue.md`:

1. Mark all steps `[x]`
2. Update frontmatter: `status: DONE`, `completed_at: 2026-05-15`
3. Rename to `[DONE]GH37_pwa-api-client-sync-queue.md`

- [ ] **Step 5: Commit**

```bash
git add apps/todo-pwa-vite/src/hooks/useTodos.ts apps/todo-pwa-vite/.env.example "docs/features/[DONE]GH37_pwa-api-client-sync-queue.md"
git rm "docs/features/[TODO]GH37_pwa-api-client-sync-queue.md"
git commit -m "feat: wire useTodos to useTodoApi; add VITE_TODO_API_URL to .env.example"
```

---

## Task 11: Add L3 integration project to NestJS vitest.config.ts

**Files:**

- Modify: `apps/todo-api-nestjs/vitest.config.ts`
- Modify: `apps/todo-api-nestjs/package.json`
- Modify: `apps/todo-api-nestjs/.gitignore`

- [ ] **Step 1: Install supertest**

```bash
pnpm --filter todo-api-nestjs add -D supertest @types/supertest
```

- [ ] **Step 2: Replace vitest.config.ts**

```typescript
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import { resolve } from "path";

const swcPlugin = swc.vite({
  module: { type: "es6" },
  jsc: {
    parser: { syntax: "typescript", decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
  },
});

export default defineConfig({
  plugins: [swcPlugin],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.spec.ts"],
          environment: "node",
          coverage: {
            provider: "v8",
            reporter: ["text", "lcov", "html"],
            include: ["src/**/*.ts"],
            exclude: ["src/**/*.spec.ts", "src/main.ts"],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/**/*.system.spec.ts"],
          environment: "node",
          env: {
            DATABASE_URL: "file:./test.db",
            NODE_ENV: "test",
          },
          pool: "forks",
          poolOptions: {
            forks: { singleFork: true },
          },
        },
      },
    ],
  },
});
```

- [ ] **Step 3: Add test:system script to package.json**

In `apps/todo-api-nestjs/package.json` scripts, add:

```json
"test:system": "vitest run --project integration"
```

- [ ] **Step 4: Add test.db to .gitignore**

Add to `apps/todo-api-nestjs/.gitignore`:

```
test.db
test.db-journal
```

- [ ] **Step 5: Verify existing unit tests still pass**

```bash
pnpm --filter todo-api-nestjs test
```

Expected: unit tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/todo-api-nestjs/vitest.config.ts apps/todo-api-nestjs/package.json apps/todo-api-nestjs/.gitignore pnpm-lock.yaml
git commit -m "test: add L3 integration vitest project to NestJS"
```

---

## Task 12: Create L3 system tests for NestJS

**Files:**

- Create: `apps/todo-api-nestjs/test/todos.system.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import "reflect-metadata";
import { execSync } from "node:child_process";
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeAll, afterAll, afterEach, describe, it, expect } from "vitest";
import supertest from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env },
    stdio: "inherit",
  });

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  prisma = module.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

afterEach(async () => {
  await prisma.todo.deleteMany();
});

describe("GET /health", () => {
  it("returns 200 with status: ok", async () => {
    const res = await supertest(app.getHttpServer()).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /v1/todos", () => {
  it("returns empty array when no todos exist", async () => {
    const res = await supertest(app.getHttpServer())
      .get("/v1/todos")
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it("returns all todos", async () => {
    await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "A" })
      .expect(201);
    await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "B" })
      .expect(201);
    const res = await supertest(app.getHttpServer())
      .get("/v1/todos")
      .expect(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("POST /v1/todos", () => {
  it("creates a todo and returns 201", async () => {
    const res = await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "Buy milk" })
      .expect(201);
    expect(res.body).toMatchObject({
      description: "Buy milk",
      completed: false,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it("preserves client-provided UUID as id", async () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    const res = await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ id: clientId, description: "Idempotent" })
      .expect(201);
    expect(res.body.id).toBe(clientId);
  });

  it("returns 400 when description is empty", async () => {
    await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "" })
      .expect(400);
  });

  it("returns 400 when description is missing", async () => {
    await supertest(app.getHttpServer()).post("/v1/todos").send({}).expect(400);
  });
});

describe("GET /v1/todos/:id", () => {
  it("returns the todo when found", async () => {
    const { body: created } = await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "Findable" })
      .expect(201);
    const res = await supertest(app.getHttpServer())
      .get(`/v1/todos/${created.id}`)
      .expect(200);
    expect(res.body.id).toBe(created.id);
  });

  it("returns 404 for non-existent id", async () => {
    await supertest(app.getHttpServer())
      .get("/v1/todos/non-existent-id")
      .expect(404);
  });
});

describe("PATCH /v1/todos/:id", () => {
  it("updates description", async () => {
    const { body: created } = await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "Old" })
      .expect(201);
    const res = await supertest(app.getHttpServer())
      .patch(`/v1/todos/${created.id}`)
      .send({ description: "New" })
      .expect(200);
    expect(res.body.description).toBe("New");
  });

  it("toggles completed", async () => {
    const { body: created } = await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "Toggle me" })
      .expect(201);
    const res = await supertest(app.getHttpServer())
      .patch(`/v1/todos/${created.id}`)
      .send({ completed: true })
      .expect(200);
    expect(res.body.completed).toBe(true);
  });

  it("returns 404 for non-existent id", async () => {
    await supertest(app.getHttpServer())
      .patch("/v1/todos/non-existent-id")
      .send({ description: "Nope" })
      .expect(404);
  });
});

describe("DELETE /v1/todos/:id", () => {
  it("deletes todo and returns 204", async () => {
    const { body: created } = await supertest(app.getHttpServer())
      .post("/v1/todos")
      .send({ description: "Delete me" })
      .expect(201);
    await supertest(app.getHttpServer())
      .delete(`/v1/todos/${created.id}`)
      .expect(204);
    await supertest(app.getHttpServer())
      .get(`/v1/todos/${created.id}`)
      .expect(404);
  });

  it("returns 404 for non-existent id", async () => {
    await supertest(app.getHttpServer())
      .delete("/v1/todos/non-existent-id")
      .expect(404);
  });
});
```

- [ ] **Step 2: Run L3 tests**

```bash
pnpm --filter todo-api-nestjs test:system
```

Expected: All L3 tests PASS

If migration fails, ensure `DATABASE_URL=file:./test.db` is in the vitest integration project env (it is — set in `vitest.config.ts` Task 11).

- [ ] **Step 3: Commit**

```bash
git add apps/todo-api-nestjs/test/todos.system.spec.ts
git commit -m "test: L3 system integration tests for NestJS API — full CRUD + validation"
```

---

## Task 13: Set up e2e-docker/ directory

**Files:**

- Create: `e2e-docker/package.json`
- Create: `e2e-docker/playwright.config.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Create e2e-docker/package.json**

```json
{
  "name": "e2e-docker",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:offline": "playwright test offline-sync.spec.ts",
    "test:persistence": "playwright test volume-persistence.spec.ts"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0"
  }
}
```

- [ ] **Step 2: Create e2e-docker/playwright.config.ts**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost",
    headless: true,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
```

- [ ] **Step 3: Add e2e-docker to pnpm-workspace.yaml**

Open `pnpm-workspace.yaml` and add `e2e-docker` to the packages list:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "e2e-docker"
```

- [ ] **Step 4: Install and get Playwright browsers**

```bash
pnpm install && pnpm --filter e2e-docker exec playwright install chromium
```

- [ ] **Step 5: Commit**

```bash
git add e2e-docker/package.json e2e-docker/playwright.config.ts pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore: scaffold e2e-docker Playwright project for L4 Docker Compose tests"
```

---

## Task 14: Create e2e-docker/offline-sync.spec.ts

**Files:**

- Create: `e2e-docker/offline-sync.spec.ts`

Prerequisite: Run `docker compose up --wait` before executing. The stack must be healthy (`curl http://localhost/` returns HTML, `curl http://localhost:3001/health` returns `{"status":"ok"}`).

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Offline-first sync cycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("shows offline banner when context goes offline", async ({ page }) => {
    await page.context().setOffline(true);
    await expect(page.getByRole("status")).toContainText(/offline/i);
    await page.context().setOffline(false);
    await expect(page.getByRole("status")).not.toBeVisible();
  });

  test("create todo offline → pending badge → sync on reconnect → no pending badge", async ({
    page,
  }) => {
    await page.context().setOffline(true);

    await page.getByRole("textbox").fill("Offline created todo");
    await page.getByRole("button", { name: /add/i }).click();

    await expect(page.getByText("Offline created todo")).toBeVisible();
    await expect(page.locator('[title="Pending sync"]')).toBeVisible();

    await page.context().setOffline(false);

    await expect(page.locator('[title="Pending sync"]')).not.toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await expect(page.getByText("Offline created todo")).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e-docker/offline-sync.spec.ts
git commit -m "test: L4 offline-sync Playwright spec for Docker Compose stack"
```

---

## Task 15: Create e2e-docker/volume-persistence.spec.ts

**Files:**

- Create: `e2e-docker/volume-persistence.spec.ts`

This test is split into two phases run manually with different env vars. It cannot automate `docker compose down/up` from within Playwright.

- [ ] **Step 1: Create the spec**

```typescript
import { test, expect } from "@playwright/test";

/**
 * SQLite volume persistence test — two-phase manual execution.
 *
 * Phase 1 (create):  PERSISTENCE_PHASE=create pnpm --filter e2e-docker test:persistence
 *   → Creates a known todo. Run this BEFORE docker compose down.
 *
 * Phase 2 (verify):  PERSISTENCE_PHASE=verify pnpm --filter e2e-docker test:persistence
 *   → Verifies the todo survived. Run this AFTER docker compose down && docker compose up --wait.
 */

const TODO_TEXT = "Volume persistence — do not delete";
const PHASE = process.env.PERSISTENCE_PHASE ?? "verify";

test("phase: create — add a known todo before compose restart", async ({
  page,
}) => {
  test.skip(PHASE !== "create", "Run with PERSISTENCE_PHASE=create");

  await page.goto("/");
  await page.getByRole("textbox").fill(TODO_TEXT);
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText(TODO_TEXT)).toBeVisible();
});

test("phase: verify — todo survives docker compose down/up", async ({
  page,
}) => {
  test.skip(PHASE !== "verify", "Run with PERSISTENCE_PHASE=verify");

  await page.goto("/");
  await expect(page.getByText(TODO_TEXT)).toBeVisible();
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e-docker/volume-persistence.spec.ts
git commit -m "test: L4 SQLite volume persistence spec (two-phase manual execution)"
```

---

## Task 16: Add offline smoke tests to PWA e2e/app.spec.ts

**Files:**

- Modify: `apps/todo-pwa-vite/e2e/app.spec.ts`

Note: `page.context().setOffline(true)` sets `navigator.onLine = false` AND fires the `offline` event — required for `useTodoApi`'s event listeners. Do not use `page.route()` for offline simulation.

The sync-banner disappearance test requires a running NestJS API (`VITE_TODO_API_URL` set). If running PWA e2e without the API, skip it with `.skip`.

- [ ] **Step 1: Append to e2e/app.spec.ts**

```typescript
test("offline banner appears when context goes offline and disappears on reconnect", async ({
  page,
}) => {
  await page.goto("/");
  await page.context().setOffline(true);
  await expect(page.getByRole("status")).toContainText(/offline/i);
  await page.context().setOffline(false);
  await expect(page.getByRole("status")).not.toBeVisible();
});

test("todo created offline shows pending badge", async ({ page }) => {
  await page.goto("/");
  await page.context().setOffline(true);

  await page.getByRole("textbox").fill("Offline todo");
  await page.getByRole("button", { name: /add/i }).click();

  await expect(page.getByText("Offline todo")).toBeVisible();
  await expect(page.locator('[title="Pending sync"]')).toBeVisible();

  await page.context().setOffline(false);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/todo-pwa-vite/e2e/app.spec.ts
git commit -m "test: add offline banner and pending badge smoke tests to PWA e2e"
```

---

## Task 17: Add L3 CI job + mark GH40 DONE + update PROJECT_STATUS

**Files:**

- Modify: `.github/workflows/ci.yml`
- Rename + modify: `docs/features/[TODO]GH40_pwa-api-integration-tests.md`
- Modify: `docs/PROJECT_STATUS.md`

- [ ] **Step 1: Add system-tests job to ci.yml**

After the closing `ci:` job block, add a parallel job:

```yaml
system-tests:
  name: L3 System Tests
  runs-on: ubuntu-latest

  steps:
    - uses: actions/checkout@v4

    - uses: pnpm/action-setup@v4
      with:
        version: "10.33.0"

    - uses: actions/setup-node@v4
      with:
        node-version: "22"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Run L3 system tests
      working-directory: apps/todo-api-nestjs
      run: pnpm test:system
      env:
        DATABASE_URL: file:./test.db
```

- [ ] **Step 2: Update and rename GH40 feature doc**

In `docs/features/[TODO]GH40_pwa-api-integration-tests.md`:

1. Mark Step 1 `[x]` — Zod tests already done before this spec
2. Mark Steps 2-5 `[x]`
3. Update frontmatter: `status: DONE`, `completed_at: 2026-05-15`
4. Rename to `[DONE]GH40_pwa-api-integration-tests.md`

- [ ] **Step 3: Update docs/PROJECT_STATUS.md**

```markdown
**Last completed phase:** Phase 7 — Integration Tests + E2E (GH40, merged PR #TBD)
**Active feature doc:** None
**Current step:** None
**Known blockers:** None
**Next action:** Begin Phase 10 — K8s/Helm Deploy (GH47)
```

Update the Phase Summary table: mark Phase 6 (GH37) and Phase 7 (GH40) as `✅ Done`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml "docs/features/[DONE]GH40_pwa-api-integration-tests.md" docs/PROJECT_STATUS.md
git rm "docs/features/[TODO]GH40_pwa-api-integration-tests.md"
git commit -m "ci: add L3 system test job; mark GH37 and GH40 complete"
```

---

## Self-Review

### Spec Coverage

| GH37 Requirement                      | Task        |
| ------------------------------------- | ----------- |
| `TodoHook` interface                  | Task 1      |
| `UiTodo` with `syncStatus`            | Task 1      |
| `useTodoWorker` satisfies `TodoHook`  | Task 3      |
| `useTodoWorker` generates client UUID | Task 3      |
| `useTodos` module-level assignment    | Tasks 4, 10 |
| `App.tsx` as hook call site           | Task 7      |
| `TodoApp` props-driven                | Task 5      |
| Offline banner                        | Task 7      |
| Error state                           | Task 7      |
| `useTodoApi` implementation           | Task 9      |
| Sync status badge in UI               | Task 6      |
| Queue persists in localStorage        | Task 9      |
| Flush on reconnect                    | Task 9      |
| Partial flush failure                 | Task 9      |
| Client UUID idempotency               | Task 9      |
| `VITE_TODO_API_URL` in `.env.example` | Task 10     |

| GH40 Requirement                           | Task                            |
| ------------------------------------------ | ------------------------------- |
| Zod schema tests (Step 1)                  | Already done — noted in Task 17 |
| L3 system tests — full CRUD                | Task 12                         |
| L3 test isolation (`afterEach deleteMany`) | Task 12                         |
| L3 client UUID preserved                   | Task 12                         |
| L3 validation 400                          | Task 12                         |
| L3 404 on missing id                       | Task 12                         |
| L3 `/health`                               | Task 12                         |
| L4 e2e-docker setup                        | Task 13                         |
| L4 offline create → sync                   | Task 14                         |
| L4 volume persistence                      | Task 15                         |
| PWA e2e offline smoke                      | Task 16                         |
| CI step for L3                             | Task 17                         |

No gaps found.

### Placeholder Scan

No TBD, no "fill in", no "similar to Task N", no steps without code. All code blocks are complete.

### Type Consistency

- `TodoHook.todos: UiTodo[]` — defined Task 1, returned in Tasks 3 and 9 ✓
- `TodoHook.createTodo(description: string): void` — consistent Tasks 3, 5, 7, 9 ✓
- `QueueEntry.op` values (`create | update | toggle | delete`) — consistent between Task 9 test and impl ✓
- `apiClient.create(dto: CreateTodoDto)` — defined Task 8, called in Task 9 ✓
- `UiTodo.syncStatus: SyncStatus` — defined Task 1, used Tasks 3, 5, 6, 9 ✓
- `TodoAppProps.onCreateTodo` (Task 5) matches `hook.createTodo` (Task 7) ✓
- `TodoListProps.todos: UiTodo[]` (Task 6) matches `TodoAppProps.todos: UiTodo[]` (Task 5) ✓
