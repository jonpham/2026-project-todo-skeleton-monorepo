import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TodoInput } from "./TodoInput";

describe("TodoInput", () => {
  it("renders a text input and a submit button", () => {
    render(<TodoInput onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("calls onSubmit with the input value when button is clicked", async () => {
    const onSubmit = vi.fn();
    render(<TodoInput onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole("textbox"), "Buy groceries");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(onSubmit).toHaveBeenCalledWith("Buy groceries");
  });

  it("calls onSubmit with the input value when Enter is pressed", async () => {
    const onSubmit = vi.fn();
    render(<TodoInput onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole("textbox"), "Buy groceries{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("Buy groceries");
  });

  it("clears the input after submit", async () => {
    render(<TodoInput onSubmit={vi.fn()} />);
    const input = screen.getByRole("textbox");

    await userEvent.type(input, "Buy groceries{Enter}");

    expect(input).toHaveValue("");
  });

  it("does not call onSubmit when input is empty or whitespace-only", async () => {
    const onSubmit = vi.fn();
    render(<TodoInput onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    await userEvent.type(screen.getByRole("textbox"), "   {Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
