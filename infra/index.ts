/**
 * Monorepo Infrastructure Orchestration
 *
 * Uses the Pulumi Automation API to drive each app's co-located Pulumi program.
 * Each app owns its own Pulumi program in apps/{app}/infra/ and can be deployed
 * independently. This file provides the "deploy everything" entry point for the
 * full monorepo.
 *
 * Usage:
 *   cd infra && npm install
 *   CLOUDFLARE_API_TOKEN=<token> npx ts-node index.ts
 *
 * To deploy a single app's infra directly:
 *   cd apps/todo-pwa/infra && npm install
 *   CLOUDFLARE_API_TOKEN=<token> pulumi up
 */

import * as auto from "@pulumi/pulumi/automation";
import * as path from "path";

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
  if (!cloudflareApiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN environment variable is required");
  }

  // Shared config — applied to every app stack
  const sharedConfig: Record<string, auto.ConfigValue> = {
    "cloudflare:apiToken": { value: cloudflareApiToken, secret: true },
  };

  // Deploy each app's infra in order.
  // Add entries here as new apps/* are introduced to the monorepo.
  const todoPwaOutputs = await deployApp(
    "todo-pwa",
    path.join(__dirname, "..", "apps", "todo-pwa", "infra"),
    sharedConfig
  );

  console.log("\n── Monorepo deployment complete ──");
  console.log("Outputs:");
  for (const [appName, outputs] of Object.entries({
    "todo-pwa": todoPwaOutputs,
  })) {
    for (const [key, val] of Object.entries(outputs)) {
      console.log(`  ${appName}.${key}: ${val.value}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
