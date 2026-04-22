import type { Meta, StoryObj } from "@storybook/react-vite";
import { TodoItem } from "./TodoItem";

const meta: Meta<typeof TodoItem> = {
  component: TodoItem,
  args: {
    onToggle: (id) => console.log("toggle:", id),
    onUpdate: (id, desc) => console.log("update:", id, desc),
    onDelete: (id) => console.log("delete:", id),
  },
};
export default meta;

type Story = StoryObj<typeof TodoItem>;

export const Default: Story = {
  args: {
    todo: {
      id: "1",
      description: "Buy groceries",
      completed: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
};

export const Completed: Story = {
  args: {
    todo: {
      id: "2",
      description: "Buy groceries",
      completed: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
};

export const Editing: Story = {
  args: {
    todo: {
      id: "3",
      description: "Buy groceries",
      completed: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
  play: async ({ canvas, userEvent: ue }) => {
    await ue.click(canvas.getByText("Buy groceries"));
  },
};
