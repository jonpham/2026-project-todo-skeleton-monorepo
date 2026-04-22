import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoList } from "./TodoList";
import type { TodoItem } from "../workers/todo.worker";

const makeTodo = (overrides: Partial<TodoItem> = {}): TodoItem => ({
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const defaultProps = {
  onToggle: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
};

describe("TodoList", () => {
  it("renders an empty state message when the list is empty", () => {
    render(<TodoList todos={[]} {...defaultProps} />);
    expect(screen.getByText(/no to-do items/i)).toBeInTheDocument();
  });

  it("renders one TodoItem per todo", () => {
    const todos = [
      makeTodo({ id: "1", description: "First" }),
      makeTodo({ id: "2", description: "Second" }),
    ];
    render(<TodoList todos={todos} {...defaultProps} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("does not render the empty state when todos are present", () => {
    render(<TodoList todos={[makeTodo()]} {...defaultProps} />);
    expect(screen.queryByText(/no to-do items/i)).not.toBeInTheDocument();
  });

  it("calls onToggle with the correct id", async () => {
    const onToggle = vi.fn();
    render(
      <TodoList todos={[makeTodo()]} {...defaultProps} onToggle={onToggle} />
    );
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("1");
  });

  it("calls onDelete with the correct id", async () => {
    const onDelete = vi.fn();
    render(
      <TodoList todos={[makeTodo()]} {...defaultProps} onDelete={onDelete} />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
