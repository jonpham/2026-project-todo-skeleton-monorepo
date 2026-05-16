import { test, expect, request as pwRequest } from "@playwright/test";

/**
 * SQLite volume persistence test — two-phase manual execution.
 *
 * Phase 1 (create):  PERSISTENCE_PHASE=create pnpm --filter e2e-docker test:persistence
 *   → Creates a known todo via the PWA UI. Run this BEFORE docker compose down.
 *
 * Phase 2 (verify):  PERSISTENCE_PHASE=verify pnpm --filter e2e-docker test:persistence
 *   → Verifies the todo survived. Run this AFTER docker compose down && docker compose up --wait.
 *
 * Verify hits the API directly, not the UI, because the PWA worker also
 * persists todos in IndexedDB inside the browser. A UI-only assertion can
 * pass even if the SQLite volume was wiped, since IndexedDB survives reloads
 * and isn't touched by docker compose. The API call is the only signal that
 * actually proves SQLite persisted.
 */

const TODO_TEXT = "Volume persistence — do not delete";
const PHASE = process.env.PERSISTENCE_PHASE ?? "verify";
const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://localhost:3001";

test("phase: create — add a known todo before compose restart", async ({
  page,
}) => {
  test.skip(PHASE !== "create", "Run with PERSISTENCE_PHASE=create");

  await page.goto("/");
  await page.getByRole("textbox").fill(TODO_TEXT);
  await page.getByRole("button", { name: /add/i }).click();
  await expect(page.getByText(TODO_TEXT)).toBeVisible();
});

test("phase: verify — todo survives docker compose down/up", async () => {
  test.skip(PHASE !== "verify", "Run with PERSISTENCE_PHASE=verify");

  const api = await pwRequest.newContext();
  const response = await api.get(`${API_BASE}/v1/todos`);
  expect(response.ok()).toBeTruthy();

  const todos = (await response.json()) as { description: string }[];
  expect(todos.some((todo) => todo.description === TODO_TEXT)).toBe(true);

  await api.dispose();
});
