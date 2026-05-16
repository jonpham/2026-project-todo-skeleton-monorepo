import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTodoWorker } from "./useTodoWorker";
import type { UiTodo } from "../types/todo";

type WorkerCommand =
  | { type: "INIT" }
  | { type: "CREATE_TODO"; payload: { description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } }
  | { type: "SET_ONLINE"; payload: { online: boolean } };

type WorkerState = {
  todos: UiTodo[];
  offline: boolean;
  error: string | null;
  isLoading?: boolean;
};

const makeTodo = (overrides: Partial<UiTodo> = {}): UiTodo => ({
  id: "todo-1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "synced",
  ...overrides,
});

class MockWorker {
  static latest: MockWorker;
  static persistedTodos: UiTodo[] = [];
  static persistedQueue: WorkerCommand[] = [];
  static online = true;
  static failNextCreate = false;

  onmessage: ((event: MessageEvent<WorkerState>) => void) | null = null;
  postMessage = vi.fn((command: WorkerCommand) => this.handle(command));
  terminate = vi.fn();
  private todos = [...MockWorker.persistedTodos];

  constructor() {
    MockWorker.latest = this;
  }

  emit(state: Partial<WorkerState> = {}) {
    this.onmessage?.({
      data: {
        todos: this.todos,
        offline: !MockWorker.online,
        error: null,
        isLoading: false,
        ...state,
      },
    } as MessageEvent<WorkerState>);
  }

  async flush() {
    const remaining: WorkerCommand[] = [];
    for (const item of MockWorker.persistedQueue) {
      if (item.type === "CREATE_TODO" && MockWorker.failNextCreate) {
        MockWorker.failNextCreate = false;
        remaining.push(item);
      } else {
        this.todos = this.todos.map((todo) =>
          item.type === "CREATE_TODO" && todo.syncStatus === "pending"
            ? { ...todo, syncStatus: "synced" }
            : todo
        );
      }
    }
    MockWorker.persistedQueue = remaining;
    MockWorker.persistedTodos = this.todos;
    this.emit({
      error: remaining.length > 0 ? "Sync failed. Will retry." : null,
    });
  }

  private handle(command: WorkerCommand) {
    if (command.type === "INIT") {
      this.emit({ isLoading: false });
      return;
    }

    if (command.type === "CREATE_TODO") {
      const todo = makeTodo({
        id: `generated-${this.todos.length + 1}`,
        description: command.payload.description,
        syncStatus: MockWorker.online ? "synced" : "pending",
      });
      this.todos = [...this.todos, todo];
      MockWorker.persistedTodos = this.todos;
      if (!MockWorker.online) {
        MockWorker.persistedQueue = [...MockWorker.persistedQueue, command];
      }
      this.emit();
      return;
    }

    if (command.type === "UPDATE_TODO") {
      this.todos = this.todos.map((todo) =>
        todo.id === command.payload.id
          ? {
              ...todo,
              description: command.payload.description,
              syncStatus: MockWorker.online ? "synced" : "pending",
            }
          : todo
      );
      MockWorker.persistedTodos = this.todos;
      if (!MockWorker.online) {
        MockWorker.persistedQueue = [...MockWorker.persistedQueue, command];
      }
      this.emit();
      return;
    }

    if (command.type === "TOGGLE_TODO") {
      this.todos = this.todos.map((todo) =>
        todo.id === command.payload.id
          ? {
              ...todo,
              completed: !todo.completed,
              syncStatus: MockWorker.online ? "synced" : "pending",
            }
          : todo
      );
      MockWorker.persistedTodos = this.todos;
      if (!MockWorker.online) {
        MockWorker.persistedQueue = [...MockWorker.persistedQueue, command];
      }
      this.emit();
      return;
    }

    if (command.type === "DELETE_TODO") {
      this.todos = this.todos.filter((todo) => todo.id !== command.payload.id);
      MockWorker.persistedTodos = this.todos;
      if (!MockWorker.online) {
        MockWorker.persistedQueue = [...MockWorker.persistedQueue, command];
      }
      this.emit();
    }
  }
}

vi.stubGlobal("Worker", MockWorker);

describe("useTodoWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWorker.persistedTodos = [];
    MockWorker.persistedQueue = [];
    MockWorker.online = true;
    MockWorker.failNextCreate = false;
  });

  it("initializes the worker without reading localStorage in React", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    renderHook(() => useTodoWorker());

    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "INIT",
    });
    expect(getItem).not.toHaveBeenCalled();
  });

  it("maps worker state messages to TodoHook state", () => {
    const { result } = renderHook(() => useTodoWorker());
    const pending = makeTodo({ syncStatus: "pending" });

    act(() => {
      MockWorker.latest.emit({
        todos: [pending],
        offline: true,
        error: "Sync failed.",
        isLoading: false,
      });
    });

    expect(result.current.todos).toEqual([pending]);
    expect(result.current.offline).toBe(true);
    expect(result.current.error).toBe("Sync failed.");
    expect(result.current.isLoading).toBe(false);
  });

  it("sends create requests without generating ids in React", () => {
    const randomUUID = vi.fn();
    vi.stubGlobal("crypto", { randomUUID });
    const { result } = renderHook(() => useTodoWorker());

    act(() => {
      result.current.createTodo("Buy groceries");
    });

    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "CREATE_TODO",
      payload: { description: "Buy groceries" },
    });
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it("keeps offline creates pending until the worker flushes them", async () => {
    MockWorker.online = false;
    const { result } = renderHook(() => useTodoWorker());

    act(() => {
      result.current.createTodo("Buy groceries");
    });

    expect(result.current.todos[0]).toMatchObject({
      description: "Buy groceries",
      syncStatus: "pending",
    });
    expect(MockWorker.persistedQueue).toHaveLength(1);

    MockWorker.online = true;
    await act(async () => {
      await MockWorker.latest.flush();
    });

    expect(result.current.todos[0].syncStatus).toBe("synced");
    expect(MockWorker.persistedQueue).toHaveLength(0);
  });

  it("leaves failed queue entries pending for a later worker retry", async () => {
    MockWorker.online = false;
    const { result } = renderHook(() => useTodoWorker());

    act(() => {
      result.current.createTodo("Buy groceries");
    });

    MockWorker.online = true;
    MockWorker.failNextCreate = true;
    await act(async () => {
      await MockWorker.latest.flush();
    });

    expect(result.current.todos[0].syncStatus).toBe("pending");
    expect(result.current.error).toBe("Sync failed. Will retry.");
    expect(MockWorker.persistedQueue).toHaveLength(1);
  });

  it("hydrates from durable worker-owned storage after remount", () => {
    MockWorker.persistedTodos = [makeTodo({ id: "persisted" })];

    const { result } = renderHook(() => useTodoWorker());

    expect(result.current.todos).toEqual([makeTodo({ id: "persisted" })]);
  });

  it("forwards update, toggle, and delete commands to the worker", () => {
    const { result } = renderHook(() => useTodoWorker());

    act(() => {
      result.current.updateTodo("todo-1", "Updated");
      result.current.toggleTodo("todo-1");
      result.current.deleteTodo("todo-1");
    });

    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "UPDATE_TODO",
      payload: { id: "todo-1", description: "Updated" },
    });
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "TOGGLE_TODO",
      payload: { id: "todo-1" },
    });
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "DELETE_TODO",
      payload: { id: "todo-1" },
    });
  });

  it("terminates the worker on unmount", () => {
    const { unmount } = renderHook(() => useTodoWorker());

    unmount();

    expect(MockWorker.latest.terminate).toHaveBeenCalled();
  });

  it("forwards window online/offline events to the worker as SET_ONLINE", () => {
    renderHook(() => useTodoWorker());

    window.dispatchEvent(new Event("offline"));
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "SET_ONLINE",
      payload: { online: false },
    });

    window.dispatchEvent(new Event("online"));
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "SET_ONLINE",
      payload: { online: true },
    });
  });

  it("removes window online/offline listeners on unmount", () => {
    const { unmount } = renderHook(() => useTodoWorker());
    const callsBefore = MockWorker.latest.postMessage.mock.calls.length;

    unmount();
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));

    expect(MockWorker.latest.postMessage.mock.calls.length).toBe(callsBefore);
  });
});
