import type { Meta, StoryObj } from "@storybook/react-vite";
import { TodoApp } from "./TodoApp";

const meta: Meta<typeof TodoApp> = {
  component: TodoApp,
  beforeEach: () => {
    localStorage.clear();
  },
};
export default meta;

type Story = StoryObj<typeof TodoApp>;

export const Empty: Story = {};

export const FullFlow: Story = {
  play: async ({ canvas, userEvent: ue }) => {
    const input = canvas.getByRole("textbox");
    await ue.type(input, "Buy groceries{Enter}");
    await ue.type(input, "Walk the dog{Enter}");
    await ue.click(
      canvas.getByRole("checkbox", { name: 'Toggle "Buy groceries"' })
    );
  },
};
