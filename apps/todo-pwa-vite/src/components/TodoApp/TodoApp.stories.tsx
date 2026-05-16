import type { Meta, StoryObj } from "@storybook/react-vite";
import { TodoApp } from "./TodoApp";

const meta: Meta<typeof TodoApp> = {
  component: TodoApp,
  args: {
    todos: [],
    createTodo: () => {},
    updateTodo: () => {},
    toggleTodo: () => {},
    deleteTodo: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof TodoApp>;

export const Empty: Story = {};

export const WithTodos: Story = {
  args: {
    todos: [
      {
        id: "1",
        description: "Buy groceries",
        completed: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        syncStatus: "synced",
      },
      {
        id: "2",
        description: "Walk the dog",
        completed: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        syncStatus: "pending",
      },
    ],
  },
};

export const FullFlow: Story = {
  play: async ({ canvas, userEvent: ue }) => {
    const input = canvas.getByRole("textbox");
    await ue.type(input, "Buy groceries{Enter}");
    await ue.type(input, "Walk the dog{Enter}");
  },
};
