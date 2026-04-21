import { test, expect } from "@playwright/test";

test("page title is present", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Todo PWA/);
});
