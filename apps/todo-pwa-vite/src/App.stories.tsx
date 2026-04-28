import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import App from "./App";

const meta: Meta<typeof App> = {
  component: App,
  beforeEach: () => {
    localStorage.clear();
  },
};
export default meta;

type Story = StoryObj<typeof App>;

export const Default: Story = {};

export const AddingATodo: Story = {
  play: async ({ canvasElement, userEvent: ue }) => {
    const canvas = within(canvasElement);
    await ue.type(canvas.getByRole("textbox"), "Buy groceries");
    await ue.click(canvas.getByRole("button", { name: /add/i }));
    await expect(canvas.getByRole("textbox")).toHaveValue("");
  },
};

export const TogglingAndDeleting: Story = {
  play: async ({ canvasElement, userEvent: ue }) => {
    const canvas = within(canvasElement);
    // Add an item
    await ue.type(canvas.getByRole("textbox"), "Walk the dog{Enter}");
    // Wait for the item to render before interacting
    await ue.click(await canvas.findByRole("checkbox"));
    // Delete it
    await ue.click(canvas.getByRole("button", { name: /delete/i }));
  },
};
