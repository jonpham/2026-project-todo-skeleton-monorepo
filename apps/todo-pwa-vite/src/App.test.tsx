import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, vi, beforeEach } from "vitest";
import App from "./App";
import type { UiTodo } from "./types/todo";

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

const mockHook = {
  todos: [mockTodo],
  createTodo: mockCreateTodo,
  updateTodo: mockUpdateTodo,
  toggleTodo: mockToggleTodo,
  deleteTodo: mockDeleteTodo,
  offline: false,
  error: null,
  isLoading: false,
};

vi.mock("./hooks/useTodos", () => ({
  useTodos: () => mockHook,
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook.offline = false;
    mockHook.error = null;
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

  test("shows offline banner when offline is true", () => {
    mockHook.offline = true;
    render(<App />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  test("does not show offline banner when online", () => {
    render(<App />);
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });

  test("shows error message when error is set", () => {
    mockHook.error = "Sync failed. Retrying...";
    render(<App />);
    expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
  });

  test("does not show error message when error is null", () => {
    render(<App />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
