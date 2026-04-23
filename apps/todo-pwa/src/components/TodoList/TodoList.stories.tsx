import type { Meta, StoryObj } from "@storybook/react-vite";
import { TodoList } from "./TodoList";

const meta: Meta<typeof TodoList> = {
  component: TodoList,
  args: {
    onToggle: (id) => console.log("toggle:", id),
    onUpdate: (id, desc) => console.log("update:", id, desc),
    onDelete: (id) => console.log("delete:", id),
  },
};
export default meta;

type Story = StoryObj<typeof TodoList>;

export const Empty: Story = {
  args: { todos: [] },
};

export const Populated: Story = {
  args: {
    todos: [
      {
        id: "1",
        description: "Buy groceries",
        completed: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        description: "Walk the dog",
        completed: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "3",
        description: "Read a book",
        completed: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
};
