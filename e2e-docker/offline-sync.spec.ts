import { test, expect } from "@playwright/test";

// Selectors below match the current PWA UI (apps/todo-pwa-vite):
//   - Offline banner is a plain <div> containing "You are offline …" text
//     (no role="status"). Match by text.
//   - Pending sync badge is a <span aria-label="sync status: pending">.
//     Match by accessible name, not by title.
//   - Input is <input type="text"> (implicit textbox role).
//   - Submit is a <button>Add</button>.

test.describe("Offline-first sync cycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("shows offline banner when context goes offline", async ({ page }) => {
    await page.context().setOffline(true);
    await expect(page.getByText(/you are offline/i)).toBeVisible();
    await page.context().setOffline(false);
    await expect(page.getByText(/you are offline/i)).not.toBeVisible();
  });

  test("create todo offline → pending badge → sync on reconnect → no pending badge", async ({
    page,
  }) => {
    await page.context().setOffline(true);

    await page.getByRole("textbox").fill("Offline created todo");
    await page.getByRole("button", { name: /add/i }).click();

    await expect(page.getByText("Offline created todo")).toBeVisible();
    await expect(page.getByLabel(/sync status: pending/i)).toBeVisible();

    await page.context().setOffline(false);

    await expect(page.getByLabel(/sync status: pending/i)).not.toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await expect(page.getByText("Offline created todo")).toBeVisible();
  });
});
