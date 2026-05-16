import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
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

const defaultProps = {
  todos: [] as UiTodo[],
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  toggleTodo: vi.fn(),
  deleteTodo: vi.fn(),
};

describe("TodoApp", () => {
  it("shows empty state when no todos provided", () => {
    render(<TodoApp {...defaultProps} />);
    expect(screen.getByText(/no to-do items/i)).toBeInTheDocument();
  });

  it("renders provided todos", () => {
    render(<TodoApp {...defaultProps} todos={[makeTodo()]} />);
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("calls createTodo with description on form submit", async () => {
    const createTodo = vi.fn();
    render(<TodoApp {...defaultProps} createTodo={createTodo} />);
    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
    expect(createTodo).toHaveBeenCalledWith("Buy groceries");
  });

  it("calls toggleTodo with id when checkbox clicked", async () => {
    const toggleTodo = vi.fn();
    render(
      <TodoApp {...defaultProps} todos={[makeTodo()]} toggleTodo={toggleTodo} />
    );
    await userEvent.click(screen.getByRole("checkbox"));
    expect(toggleTodo).toHaveBeenCalledWith("1");
  });

  it("calls deleteTodo with id when delete button clicked", async () => {
    const deleteTodo = vi.fn();
    render(
      <TodoApp {...defaultProps} todos={[makeTodo()]} deleteTodo={deleteTodo} />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(deleteTodo).toHaveBeenCalledWith("1");
  });

  it("calls updateTodo with id and new description on edit submit", async () => {
    const updateTodo = vi.fn();
    render(
      <TodoApp {...defaultProps} todos={[makeTodo()]} updateTodo={updateTodo} />
    );
    await userEvent.click(screen.getByText("Buy groceries"));
    const editInput = screen.getByRole("textbox", { name: /edit todo/i });
    await userEvent.clear(editInput);
    await userEvent.type(editInput, "Buy organic groceries{Enter}");
    expect(updateTodo).toHaveBeenCalledWith("1", "Buy organic groceries");
  });
});
