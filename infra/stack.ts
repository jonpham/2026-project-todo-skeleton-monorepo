import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

const config = new pulumi.Config();
const accountId = config.requireSecret("cloudflareAccountId");
config.requireSecret("cloudflareZoneId"); // Validates zone ID is set

// Bind production domain to todo-pwa-vite Pages project
const pagesDomain = new cloudflare.PagesDomain("todo-pwa-production-domain", {
  accountId: accountId,
  projectName: "todo-pwa-vite",
  domain: "app.todo.witty-m.com",
});

export const productionDomain = pagesDomain.domain;
