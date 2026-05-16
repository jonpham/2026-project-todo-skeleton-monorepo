import { defineConfig } from "@playwright/test";

// PWA nginx is exposed at host port 3000 by docker-compose.yml.
// Override with PLAYWRIGHT_BASE_URL when targeting a different stack.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  use: {
    baseURL,
    headless: true,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
