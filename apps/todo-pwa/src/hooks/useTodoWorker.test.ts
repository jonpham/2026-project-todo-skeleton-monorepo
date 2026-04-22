import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTodoWorker } from "./useTodoWorker";
import type { TodoItem } from "../workers/todo.worker";

class MockWorker {
  static latest: MockWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    MockWorker.latest = this;
  }

  respond(todos: TodoItem[]) {
    this.onmessage?.({ data: { todos } } as MessageEvent);
  }
}

vi.stubGlobal("Worker", MockWorker);

const makeTodo = (overrides: Partial<TodoItem> = {}): TodoItem => ({
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("useTodoWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with an empty todos array", () => {
    const { result } = renderHook(() => useTodoWorker());
    expect(result.current.todos).toEqual([]);
  });

  it("requests all todos on mount", () => {
    renderHook(() => useTodoWorker());
    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "GET_ALL_TODOS",
    });
  });

  it("updates todos when the worker responds", () => {
    const todo = makeTodo();
    const { result } = renderHook(() => useTodoWorker());

    act(() => {
      MockWorker.latest.respond([todo]);
    });

    expect(result.current.todos).toEqual([todo]);
  });

  it("createTodo sends CREATE_TODO with description", () => {
    const { result } = renderHook(() => useTodoWorker());

    act(() => {
      result.current.createTodo("Buy groceries");
    });

    expect(MockWorker.latest.postMessage).toHaveBeenCalledWith({
      type: "CREATE_TODO",
      payload: { description: "Buy groceries" },
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
