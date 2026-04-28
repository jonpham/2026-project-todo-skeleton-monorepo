/**
 * Monorepo Infrastructure Orchestration
 *
 * Coordinates infrastructure for all monorepo apps:
 * 1. Deploys each app's co-located Pulumi program via Automation API
 * 2. Manages shared infrastructure (custom domains, etc.)
 *
 * The todo-pwa-vite project is created by the standalone repo's Pulumi program.
 * This orchestrator adds the production domain binding.
 *
 * Usage:
 *   cp .env.example .env  # repo root — fill in values
 *   cd infra && npm install
 *   npx ts-node index.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from repo root (one level up from infra/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as auto from "@pulumi/pulumi/automation";

const STACK_NAME = process.env.PULUMI_STACK ?? "prod";

async function deployApp(
  name: string,
  workDir: string,
  config: Record<string, auto.ConfigValue>
): Promise<auto.OutputMap> {
  console.log(`\n── Deploying ${name} (stack: ${STACK_NAME}) ──`);

  const stack = await auto.LocalWorkspace.createOrSelectStack({
    stackName: STACK_NAME,
    workDir,
  });

  // Apply shared config values into the app stack
  await stack.setAllConfig(config);

  const result = await stack.up({
    onOutput: process.stdout.write.bind(process.stdout),
  });
  console.log(`\n✓ ${name} deployed`);
  return result.outputs;
}

async function main() {
  const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflareZoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!cloudflareApiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN environment variable is required");
  }
  if (!cloudflareAccountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is required");
  }
  if (!cloudflareZoneId) {
    throw new Error(
      "CLOUDFLARE_ZONE_ID environment variable is required (zone ID for witty-m.com)"
    );
  }

  // Shared config — applied to every app stack
  const sharedConfig: Record<string, auto.ConfigValue> = {
    "cloudflare:apiToken": { value: cloudflareApiToken, secret: true },
    cloudflareAccountId: { value: cloudflareAccountId, secret: true },
    cloudflareZoneId: { value: cloudflareZoneId, secret: true },
  };

  // Deploy each app's infra in order.
  // todo-pwa-vite is now in the standalone repo but called from monorepo
  const todoPwaViteOutputs = await deployApp(
    "todo-pwa-vite",
    path.join(__dirname, "..", "apps", "todo-pwa-vite", "infra"),
    sharedConfig
  );

  console.log("\n── App deployment complete ──");
  console.log("Outputs:");
  for (const [appName, outputs] of Object.entries({
    "todo-pwa-vite": todoPwaViteOutputs,
  })) {
    for (const [key, val] of Object.entries(outputs)) {
      console.log(`  ${appName}.${key}: ${val.value}`);
    }
  }

  console.log(
    "\n── To deploy monorepo infrastructure (domain binding), run: ──"
  );
  console.log("   cd infra && pulumi up");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
