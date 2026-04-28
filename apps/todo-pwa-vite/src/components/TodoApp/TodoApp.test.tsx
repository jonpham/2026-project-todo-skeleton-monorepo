import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TodoApp } from "./TodoApp";
import type { TodoItem } from "../../types/todo";

// Reactive MockWorker — mirrors worker logic in-memory so the full hook + UI can be tested together
class MockWorker {
  static latest: MockWorker;
  onmessage: ((e: MessageEvent) => void) | null = null;
  terminate = vi.fn();
  private todos: TodoItem[] = [];

  constructor() {
    MockWorker.latest = this;
  }

  postMessage(msg: { type: string; payload?: Record<string, unknown> }) {
    switch (msg.type) {
      case "LOAD_TODOS":
        this.todos = (msg.payload?.todos as TodoItem[]) ?? [];
        break;
      case "CREATE_TODO":
        this.todos = [
          ...this.todos,
          {
            id: String(this.todos.length + 1),
            description: msg.payload?.description as string,
            completed: false,
            createdAt: new Date().toISOString(),
          },
        ];
        break;
      case "TOGGLE_TODO":
        this.todos = this.todos.map((t) =>
          t.id === msg.payload?.id ? { ...t, completed: !t.completed } : t
        );
        break;
      case "UPDATE_TODO":
        this.todos = this.todos.map((t) =>
          t.id === msg.payload?.id
            ? { ...t, description: msg.payload?.description as string }
            : t
        );
        break;
      case "DELETE_TODO":
        this.todos = this.todos.filter((t) => t.id !== msg.payload?.id);
        break;
    }
    this.onmessage?.({ data: { todos: this.todos } } as MessageEvent);
  }
}

vi.stubGlobal("Worker", MockWorker);

describe("TodoApp integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows empty state on first load", () => {
    render(<TodoApp />);
    expect(screen.getByText(/no to-do items/i)).toBeInTheDocument();
  });

  it("creates a todo and displays it", async () => {
    render(<TodoApp />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("clears the input after creating a todo", async () => {
    render(<TodoApp />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("marks a todo complete (strikethrough)", async () => {
    render(<TodoApp />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("Buy groceries")).toHaveClass("line-through");
  });

  it("edits a todo inline", async () => {
    render(<TodoApp />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    await userEvent.click(screen.getByText("Buy groceries"));
    const editInput = screen.getByRole("textbox", { name: /edit todo/i });
    await userEvent.clear(editInput);
    await userEvent.type(editInput, "Buy organic groceries{Enter}");
    expect(screen.getByText("Buy organic groceries")).toBeInTheDocument();
  });

  it("deletes a todo and returns to empty state", async () => {
    render(<TodoApp />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText(/no to-do items/i)).toBeInTheDocument();
  });

  it("persists todos to localStorage", async () => {
    render(<TodoApp />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
    expect(stored[0].description).toBe("Buy groceries");
  });
});
