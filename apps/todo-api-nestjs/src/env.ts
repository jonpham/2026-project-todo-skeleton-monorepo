import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

export function loadLocalEnv(baseDir = process.cwd()): void {
  const files = [".env.local", ".env"]
    .map((file) => resolve(baseDir, file))
    .filter((file) => existsSync(file));

  if (files.length === 0) return;

  dotenv.config({ path: files });
}
