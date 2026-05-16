import { test, expect } from "@playwright/test";

/**
 * SQLite volume persistence test — two-phase manual execution.
 *
 * Phase 1 (create):  PERSISTENCE_PHASE=create pnpm --filter e2e-docker test:persistence
 *   → Creates a known todo. Run this BEFORE docker compose down.
 *
 * Phase 2 (verify):  PERSISTENCE_PHASE=verify pnpm --filter e2e-docker test:persistence
 *   → Verifies the todo survived. Run this AFTER docker compose down && docker compose up --wait.
 */

const TODO_TEXT = "Volume persistence — do not delete";
const PHASE = process.env.PERSISTENCE_PHASE ?? "verify";

test("phase: create — add a known todo before compose restart", async ({
  page,
}) => {
  test.skip(PHASE !== "create", "Run with PERSISTENCE_PHASE=create");

  await page.goto("/");
  await page.getByRole("textbox").fill(TODO_TEXT);
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText(TODO_TEXT)).toBeVisible();
});

test("phase: verify — todo survives docker compose down/up", async ({
  page,
}) => {
  test.skip(PHASE !== "verify", "Run with PERSISTENCE_PHASE=verify");

  await page.goto("/");
  await expect(page.getByText(TODO_TEXT)).toBeVisible();
});
