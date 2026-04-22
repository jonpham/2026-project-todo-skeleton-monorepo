import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "./App";

const mockCreateTodo = vi.fn();

vi.mock("./hooks/useTodoWorker", () => ({
  useTodoWorker: () => ({
    todos: [],
    createTodo: mockCreateTodo,
    updateTodo: vi.fn(),
    toggleTodo: vi.fn(),
    deleteTodo: vi.fn(),
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
  await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");
  expect(mockCreateTodo).toHaveBeenCalledWith("Buy groceries");
});
