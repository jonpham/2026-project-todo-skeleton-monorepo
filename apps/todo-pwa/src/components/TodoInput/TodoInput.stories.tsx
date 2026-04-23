import type { Meta, StoryObj } from "@storybook/react-vite";
import { TodoInput } from "./TodoInput";

const meta: Meta<typeof TodoInput> = {
  component: TodoInput,
  args: { onSubmit: (value) => console.log("submitted:", value) },
};
export default meta;

type Story = StoryObj<typeof TodoInput>;

export const Default: Story = {};

export const WithPlaceholderFilled: Story = {
  play: async ({ canvas, userEvent: ue }) => {
    await ue.type(canvas.getByRole("textbox"), "Buy groceries");
  },
};
