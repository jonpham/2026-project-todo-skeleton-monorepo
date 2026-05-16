import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTodoApi } from "./useTodoApi";
import type { UiTodo } from "../types/todo";

vi.mock("../api/todo-api-client", () => ({
  fetchTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  toggleTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

import * as api from "../api/todo-api-client";

const TODOS_KEY = "todos";
const QUEUE_KEY = "todo-sync-queue";

const makeTodo = (overrides: Partial<UiTodo> = {}): UiTodo => ({
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "synced",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValue("uuid-test") });
  vi.mocked(api.fetchTodos).mockResolvedValue([]);
});

describe("useTodoApi — initial load", () => {
  it("fetches todos on mount and stores them as synced", async () => {
    const todo = makeTodo();
    vi.mocked(api.fetchTodos).mockResolvedValue([todo]);
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() =>
      expect(result.current.todos).toEqual([{ ...todo, syncStatus: "synced" }])
    );
  });

  it("persists fetched todos to localStorage", async () => {
    const todo = makeTodo();
    vi.mocked(api.fetchTodos).mockResolvedValue([todo]);
    renderHook(() => useTodoApi());
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(TODOS_KEY) ?? "[]");
      expect(stored[0].id).toBe("1");
    });
  });

  it("starts with isLoading: true and resolves to false", async () => {
    vi.mocked(api.fetchTodos).mockResolvedValue([]);
    const { result } = renderHook(() => useTodoApi());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("sets error when fetchTodos rejects and falls back to localStorage", async () => {
    const cached = [makeTodo({ syncStatus: "synced" })];
    localStorage.setItem(TODOS_KEY, JSON.stringify(cached));
    vi.mocked(api.fetchTodos).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.todos).toEqual(cached);
  });
});

describe("useTodoApi — offline detection", () => {
  it("starts offline=false when navigator.onLine is true", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderHook(() => useTodoApi());
    expect(result.current.offline).toBe(false);
  });

  it("starts offline=true when navigator.onLine is false", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    vi.mocked(api.fetchTodos).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useTodoApi());
    expect(result.current.offline).toBe(true);
  });

  it("sets offline=true when window fires offline event", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.offline).toBe(true);
  });

  it("sets offline=false and flushes queue when window fires online event", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    vi.mocked(api.fetchTodos).mockRejectedValue(new Error("offline"));
    vi.mocked(api.createTodo).mockResolvedValue(makeTodo());
    vi.mocked(api.fetchTodos).mockResolvedValue([makeTodo()]);

    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createTodo("Buy groceries");
    });

    vi.mocked(api.fetchTodos).mockResolvedValue([makeTodo()]);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.offline).toBe(false));
  });
});

describe("useTodoApi — createTodo", () => {
  it("adds todo optimistically with syncStatus pending", () => {
    vi.mocked(api.fetchTodos).mockResolvedValue([]);
    const { result } = renderHook(() => useTodoApi());
    act(() => {
      result.current.createTodo("Buy groceries");
    });
    expect(result.current.todos[0].description).toBe("Buy groceries");
    expect(result.current.todos[0].syncStatus).toBe("pending");
  });

  it("uses crypto.randomUUID for the new todo id", () => {
    const { result } = renderHook(() => useTodoApi());
    act(() => {
      result.current.createTodo("Buy groceries");
    });
    expect(result.current.todos[0].id).toBe("uuid-test");
  });

  it("writes CREATE_TODO to the sync queue", () => {
    const { result } = renderHook(() => useTodoApi());
    act(() => {
      result.current.createTodo("Buy groceries");
    });
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    expect(queue[0]).toMatchObject({
      type: "CREATE_TODO",
      payload: { id: "uuid-test", description: "Buy groceries" },
    });
  });

  it("calls api.createTodo immediately when online and updates syncStatus to synced", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.mocked(api.fetchTodos).mockResolvedValue([]);
    vi.mocked(api.createTodo).mockResolvedValue(makeTodo({ id: "uuid-test" }));
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.createTodo("Buy groceries");
    });
    await waitFor(() =>
      expect(result.current.todos[0].syncStatus).toBe("synced")
    );
    expect(api.createTodo).toHaveBeenCalledWith("uuid-test", "Buy groceries");
  });
});

describe("useTodoApi — deleteTodo", () => {
  it("removes the todo optimistically", async () => {
    vi.mocked(api.fetchTodos).mockResolvedValue([makeTodo()]);
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.todos).toHaveLength(1));
    act(() => {
      result.current.deleteTodo("1");
    });
    expect(result.current.todos).toHaveLength(0);
  });
});

describe("useTodoApi — toggleTodo", () => {
  it("flips completed optimistically", async () => {
    vi.mocked(api.fetchTodos).mockResolvedValue([makeTodo()]);
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.todos).toHaveLength(1));
    act(() => {
      result.current.toggleTodo("1");
    });
    expect(result.current.todos[0].completed).toBe(true);
    expect(result.current.todos[0].syncStatus).toBe("pending");
  });
});

describe("useTodoApi — updateTodo", () => {
  it("updates description optimistically", async () => {
    vi.mocked(api.fetchTodos).mockResolvedValue([makeTodo()]);
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.todos).toHaveLength(1));
    act(() => {
      result.current.updateTodo("1", "Buy organic groceries");
    });
    expect(result.current.todos[0].description).toBe("Buy organic groceries");
    expect(result.current.todos[0].syncStatus).toBe("pending");
  });
});

describe("useTodoApi — queue flush on reconnect", () => {
  it("drops CREATE_TODO from queue after 409 response", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    vi.mocked(api.fetchTodos).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useTodoApi());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createTodo("Duplicate");
    });

    vi.mocked(api.createTodo).mockRejectedValue(
      Object.assign(new Error("409"), { status: 409 })
    );
    vi.mocked(api.fetchTodos).mockResolvedValue([]);

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
      expect(queue).toHaveLength(0);
    });
  });
});
