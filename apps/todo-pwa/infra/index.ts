import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from repo root (three levels up from apps/todo-pwa/infra/)
// When run standalone via `pulumi up`, this makes CLOUDFLARE_API_TOKEN available
// without needing to prefix the command. When driven by infra/index.ts, the
// token is already in the environment and this is a no-op.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();

// Required secrets — set with:
//   pulumi config set cloudflareAccountId <id> --secret
//   pulumi config set cloudflareZoneId <zone-id-for-witty-m.com> --secret
const accountId = config.requireSecret("cloudflareAccountId");

// Cloudflare Pages project
const pagesProject = new cloudflare.PagesProject("todo-pwa", {
  accountId: accountId,
  name: "todo-pwa",
  productionBranch: "main",
});

// Custom domain binding — requires witty-m.com zone to be active in Cloudflare
// and nameservers delegated from NameCheap (see docs/deployment-setup-guide.md).
const pagesDomain = new cloudflare.PagesDomain("todo-pwa-domain", {
  accountId: accountId,
  projectName: pagesProject.name,
  domain: "app.todo.witty-m.com",
});

export const projectName = pagesProject.name;
export const productionUrl = pagesDomain.domain.apply((d) => `https://${d}`);
export const pagesUrl = pagesProject.subdomain.apply((s) => `https://${s}`);
