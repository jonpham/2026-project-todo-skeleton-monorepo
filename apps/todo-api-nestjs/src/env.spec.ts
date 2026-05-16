import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLocalEnv } from "./env.js";

const managedKeys = [
  "DATABASE_URL",
  "PORT",
  "CORS_ALLOWED_ORIGINS",
  "NODE_ENV",
];

const originalEnv = new Map<string, string | undefined>();

describe("loadLocalEnv", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "todo-api-env-"));
    for (const key of managedKeys) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    for (const key of managedKeys) {
      const original = originalEnv.get(key);
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
    originalEnv.clear();
  });

  it("loads .env.local before falling back to .env", () => {
    writeFileSync(
      join(dir, ".env"),
      ["DATABASE_URL=file:./env.db", "PORT=9999", "NODE_ENV=development"].join(
        "\n"
      )
    );
    writeFileSync(
      join(dir, ".env.local"),
      [
        "DATABASE_URL=file:./local.db",
        "PORT=3001",
        "CORS_ALLOWED_ORIGINS=http://localhost:5173",
      ].join("\n")
    );

    loadLocalEnv(dir);

    expect(process.env.DATABASE_URL).toBe("file:./local.db");
    expect(process.env.PORT).toBe("3001");
    expect(process.env.CORS_ALLOWED_ORIGINS).toBe("http://localhost:5173");
    expect(process.env.NODE_ENV).toBe("development");
  });

  it("does not override developer shell values", () => {
    process.env.PORT = "4444";
    writeFileSync(join(dir, ".env.local"), "PORT=3001\n");

    loadLocalEnv(dir);

    expect(process.env.PORT).toBe("4444");
  });
});
