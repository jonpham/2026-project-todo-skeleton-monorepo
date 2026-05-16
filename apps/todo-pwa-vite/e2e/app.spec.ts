import { test, expect } from "@playwright/test";

test("page title is present", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Todo PWA/);
});

test("full todo flow: create → complete → edit → delete", async ({ page }) => {
  await page.goto("/");

  // Initial empty state
  await expect(page.getByText(/no to-do items/i)).toBeVisible();

  // Create
  await page.getByRole("textbox").fill("Buy groceries");
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText("Buy groceries")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("");

  // Complete
  await page.getByRole("checkbox").click();
  await expect(page.getByText("Buy groceries")).toHaveClass(/line-through/);

  // Edit — scope to the list to avoid matching the TodoInput textbox
  await page.getByText("Buy groceries").click();
  const editInput = page.getByRole("list").getByRole("textbox");
  await editInput.fill("Buy organic groceries");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Buy organic groceries")).toBeVisible();

  // Delete
  await page.getByRole("button", { name: /delete/i }).click();
  await expect(page.getByText(/no to-do items/i)).toBeVisible();
});

test("offline banner appears when context goes offline and disappears on reconnect", async ({
  page,
}) => {
  // context.setOffline(true) sets navigator.onLine = false AND fires the
  // 'offline' event, which the worker's online/offline listeners require.
  // page.route() would intercept requests but leave navigator.onLine = true,
  // so the worker would never flip its offline flag.
  await page.goto("/");
  await page.context().setOffline(true);
  await expect(page.getByText(/you are offline/i)).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByText(/you are offline/i)).not.toBeVisible();
});
