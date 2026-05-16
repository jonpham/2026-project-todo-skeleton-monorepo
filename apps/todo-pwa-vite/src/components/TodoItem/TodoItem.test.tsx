import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoItem } from "./TodoItem";
import type { UiTodo } from "../../types/todo";

const makeTodo = (overrides: Partial<UiTodo> = {}): UiTodo => ({
  id: "1",
  description: "Buy groceries",
  completed: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  syncStatus: "synced",
  ...overrides,
});

describe("TodoItem", () => {
  it("renders the description", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("renders an unchecked checkbox when not completed", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders a checked checkbox when completed", () => {
    render(
      <TodoItem
        todo={makeTodo({ completed: true })}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("applies strikethrough styling when completed", () => {
    render(
      <TodoItem
        todo={makeTodo({ completed: true })}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Buy groceries")).toHaveClass("line-through");
  });

  it("calls onToggle with the todo id when checkbox is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={onToggle}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("1");
  });

  it("calls onDelete with the todo id when delete button is clicked", async () => {
    const onDelete = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("enters edit mode showing an input when description is clicked", async () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Buy groceries"));
    expect(screen.getByRole("textbox")).toHaveValue("Buy groceries");
  });

  it("calls onUpdate and exits edit mode when Enter is pressed", async () => {
    const onUpdate = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Buy groceries"));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Updated text{Enter}");
    expect(onUpdate).toHaveBeenCalledWith("1", "Updated text");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancels edit and restores original text when Escape is pressed", async () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Buy groceries"));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Something else{Escape}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("shows no sync badge when syncStatus is synced", () => {
    render(
      <TodoItem
        todo={makeTodo({ syncStatus: "synced" })}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/sync status/i)).not.toBeInTheDocument();
  });

  it("shows amber badge when syncStatus is pending", () => {
    render(
      <TodoItem
        todo={makeTodo({ syncStatus: "pending" })}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByLabelText("sync status: pending")).toBeInTheDocument();
  });

  it("shows red badge when syncStatus is failed", () => {
    render(
      <TodoItem
        todo={makeTodo({ syncStatus: "failed" })}
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByLabelText("sync status: failed")).toBeInTheDocument();
  });
});
