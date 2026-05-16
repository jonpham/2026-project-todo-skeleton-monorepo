import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTodos,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
} from "./todo-api-client";

const BASE = "http://localhost:3001/v1";

vi.stubGlobal("fetch", vi.fn());

function mockFetch(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

const todo = {
  id: "uuid-1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("todo-api-client", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.stubEnv("VITE_TODO_API_URL", BASE);
  });

  describe("fetchTodos", () => {
    it("GETs /todos and returns the array", async () => {
      mockFetch([todo]);
      const result = await fetchTodos();
      expect(fetch).toHaveBeenCalledWith(`${BASE}/todos`);
      expect(result).toEqual([todo]);
    });
  });

  describe("createTodo", () => {
    it("POSTs to /todos with id and description, returns created todo", async () => {
      mockFetch(todo, 201);
      const result = await createTodo("uuid-1", "Buy groceries");
      expect(fetch).toHaveBeenCalledWith(`${BASE}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "uuid-1", description: "Buy groceries" }),
      });
      expect(result).toEqual(todo);
    });
  });

  describe("updateTodo", () => {
    it("PATCHes /todos/:id with description, returns updated todo", async () => {
      const updated = { ...todo, description: "Buy organic groceries" };
      mockFetch(updated);
      const result = await updateTodo("uuid-1", "Buy organic groceries");
      expect(fetch).toHaveBeenCalledWith(`${BASE}/todos/uuid-1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Buy organic groceries" }),
      });
      expect(result).toEqual(updated);
    });
  });

  describe("toggleTodo", () => {
    it("PATCHes /todos/:id with completed, returns updated todo", async () => {
      const toggled = { ...todo, completed: true };
      mockFetch(toggled);
      const result = await toggleTodo("uuid-1", true);
      expect(fetch).toHaveBeenCalledWith(`${BASE}/todos/uuid-1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      expect(result).toEqual(toggled);
    });
  });

  describe("deleteTodo", () => {
    it("DELETEs /todos/:id", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );
      await deleteTodo("uuid-1");
      expect(fetch).toHaveBeenCalledWith(`${BASE}/todos/uuid-1`, {
        method: "DELETE",
      });
    });
  });

  describe("error handling", () => {
    it("throws when response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), { status: 404 })
      );
      await expect(fetchTodos()).rejects.toThrow("404");
    });
  });
});
