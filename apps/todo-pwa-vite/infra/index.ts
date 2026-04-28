import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from standalone repo root (one level up from infra/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as cloudflare from "@pulumi/cloudflare";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is required");
}
if (!apiToken) {
  throw new Error("CLOUDFLARE_API_TOKEN environment variable is required");
}

// Cloudflare provider with API token from environment
const cfProvider = new cloudflare.Provider("cf", { apiToken });

// Cloudflare Pages project (standalone repo version)
const pagesProject = new cloudflare.PagesProject(
  "todo-pwa-vite",
  {
    accountId: accountId,
    name: "todo-pwa-vite",
    productionBranch: "main",
  },
  { provider: cfProvider }
);

export const projectName = pagesProject.name;
export const pagesUrl = pagesProject.subdomain.apply((s) => `https://${s}`);

// Note: Custom domain binding is configured in the monorepo's Pulumi stack
// to use the main todo-pwa project at app.todo.witty-m.com
