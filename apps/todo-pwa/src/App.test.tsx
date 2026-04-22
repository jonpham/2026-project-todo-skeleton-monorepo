import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "./App";
import type { TodoItem } from "./workers/todo.worker";

const mockCreateTodo = vi.fn();
const mockToggleTodo = vi.fn();
const mockUpdateTodo = vi.fn();
const mockDeleteTodo = vi.fn();

const mockTodo: TodoItem = {
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("./hooks/useTodoWorker", () => ({
  useTodoWorker: () => ({
    todos: [mockTodo],
    createTodo: mockCreateTodo,
    updateTodo: mockUpdateTodo,
    toggleTodo: mockToggleTodo,
    deleteTodo: mockDeleteTodo,
  }),
}));

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

test("renders existing todos as TodoItem components", () => {
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
