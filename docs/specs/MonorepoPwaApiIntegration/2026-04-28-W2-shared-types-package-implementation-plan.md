# W2 Shared Types Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@todo-skeleton/types` as a monorepo-owned package, publish it automatically to GitHub Packages from monorepo CI on merges to `main`, and prove both upstream app repos can consume explicit published versions successfully.

**Architecture:** The monorepo is the package producer and release owner. `packages/todo-types` defines the canonical wire-contract schemas and types, GitHub Actions publishes patch bumps to GitHub Packages, and both upstream repos update to consume the published artifact rather than local workspace links. Upstream changes merge first in their own repos, then return to the monorepo via normal subtree sync.

**Tech Stack:** pnpm workspaces, TypeScript, Zod, Vitest, GitHub Actions, GitHub Packages, Vite React PWA, NestJS.

---

## File Structure Map

### Monorepo producer files

- Create: `packages/todo-types/package.json`
- Create: `packages/todo-types/tsconfig.json`
- Create: `packages/todo-types/src/index.ts`
- Create: `packages/todo-types/src/index.test.ts`
- Create: `packages/todo-types/.npmrc`
- Create: `.github/workflows/publish-todo-types.yml`
- Create: `scripts/release/bump-todo-types-version.mjs`
- Create: `docs/packages/todo-types.md`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Modify: `docs/features/[TODO]GH42_shared-types-package.md`

### Upstream PWA consumer files

- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/package.json`
- Create: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/.npmrc`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/src/types/todo.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/Dockerfile`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/README.md` if package auth or install docs are needed there

### Upstream NestJS consumer files

- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/package.json`
- Create: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/.npmrc`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/src/todos/entities/todo.entity.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/src/todos/dto/create-todo.dto.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/src/todos/dto/update-todo.dto.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/src/todos/todos.controller.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/Dockerfile`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/README.md` if package auth or install docs are needed there

### Monorepo subtree sync verification files

- Verify after sync: `apps/todo-pwa-vite/package.json`
- Verify after sync: `apps/todo-pwa-vite/src/types/todo.ts`
- Verify after sync: `apps/todo-api-nestjs/package.json`
- Verify after sync: `apps/todo-api-nestjs/src/todos/*.ts`

## Task 1: Create the Producer Package in the Monorepo

**Files:**

- Create: `packages/todo-types/package.json`
- Create: `packages/todo-types/tsconfig.json`
- Create: `packages/todo-types/src/index.ts`
- Create: `packages/todo-types/src/index.test.ts`
- Create: `packages/todo-types/.npmrc`
- Modify: `package.json`
- Test: `packages/todo-types/src/index.test.ts`

- [ ] **Step 1: Write the failing schema tests**

```ts
import { describe, expect, it } from "vitest";
import {
  CreateTodoDtoSchema,
  TodoItemSchema,
  UpdateTodoDtoSchema,
} from "./index";

describe("TodoItemSchema", () => {
  it("accepts a valid todo item", () => {
    const value = TodoItemSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      description: "Buy milk",
      completed: false,
      createdAt: "2026-04-28T00:00:00.000Z",
    });

    expect(value.description).toBe("Buy milk");
  });

  it("rejects a missing description", () => {
    expect(() =>
      TodoItemSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        completed: false,
        createdAt: "2026-04-28T00:00:00.000Z",
      })
    ).toThrow();
  });
});

describe("CreateTodoDtoSchema", () => {
  it("accepts description without id", () => {
    expect(CreateTodoDtoSchema.parse({ description: "Buy milk" })).toEqual({
      description: "Buy milk",
    });
  });

  it("accepts description with uuid id", () => {
    expect(
      CreateTodoDtoSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        description: "Buy milk",
      })
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      description: "Buy milk",
    });
  });

  it("rejects non-uuid id", () => {
    expect(() =>
      CreateTodoDtoSchema.parse({ id: "not-a-uuid", description: "Buy milk" })
    ).toThrow();
  });
});

describe("UpdateTodoDtoSchema", () => {
  it("accepts partial updates", () => {
    expect(UpdateTodoDtoSchema.parse({ completed: true })).toEqual({
      completed: true,
    });
  });
});
```

- [ ] **Step 2: Run the package test to verify it fails**

Run: `pnpm --dir /Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-skeleton-monorepo --filter @todo-skeleton/types test`

Expected: FAIL with package not found or missing source files.

- [ ] **Step 3: Create the package manifest and TypeScript config**

```json
{
  "name": "@todo-skeleton/types",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "dependencies": {
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.8.3",
    "vitest": "^4.1.4"
  }
}
```

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

```ini
@todo-skeleton:registry=https://npm.pkg.github.com
```

- [ ] **Step 4: Implement the minimal schema source**

```ts
import { z } from "zod";

export const TodoItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CreateTodoDtoSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1),
});

export const UpdateTodoDtoSchema = z
  .object({
    description: z.string().min(1).optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export type TodoItem = z.infer<typeof TodoItemSchema>;
export type CreateTodoDto = z.infer<typeof CreateTodoDtoSchema>;
export type UpdateTodoDto = z.infer<typeof UpdateTodoDtoSchema>;
```

- [ ] **Step 5: Register the package in root tooling**

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test"
  }
}
```

`pnpm-workspace.yaml` should continue to include:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

If `packages/*` is already present, leave it unchanged.

- [ ] **Step 6: Install dependencies and run the package tests**

Run: `pnpm install`

Expected: lockfile updates and workspace package becomes resolvable.

Run: `pnpm --filter @todo-skeleton/types test`

Expected: PASS for all schema tests.

- [ ] **Step 7: Build the package**

Run: `pnpm --filter @todo-skeleton/types build`

Expected: PASS and `packages/todo-types/dist/index.js` plus `index.d.ts` exist.

- [ ] **Step 8: Commit the producer package**

```bash
git add package.json pnpm-lock.yaml packages/todo-types
git commit -m "feat: add todo types package"
```

## Task 2: Add CI Publication to GitHub Packages

**Files:**

- Create: `.github/workflows/publish-todo-types.yml`
- Create: `scripts/release/bump-todo-types-version.mjs`
- Modify: `packages/todo-types/package.json`
- Create: `docs/packages/todo-types.md`

- [ ] **Step 1: Write the failing version-bump script test as a dry run command**

Run: `node scripts/release/bump-todo-types-version.mjs --dry-run`

Expected: FAIL because the script does not exist yet.

- [ ] **Step 2: Create the patch-bump script**

```js
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../../packages/todo-types/package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(path, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = nextVersion;
writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(nextVersion);
```

- [ ] **Step 3: Create the publish workflow**

```yaml
name: Publish Todo Types

on:
  push:
    branches: [main]
    paths:
      - "packages/todo-types/**"
      - ".github/workflows/publish-todo-types.yml"
      - "scripts/release/bump-todo-types-version.mjs"

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://npm.pkg.github.com
          scope: "@todo-skeleton"
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @todo-skeleton/types test
      - run: pnpm --filter @todo-skeleton/types build
      - run: node scripts/release/bump-todo-types-version.mjs
      - run: pnpm --filter @todo-skeleton/types publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 4: Add package workflow documentation**

```md
# `@todo-skeleton/types`

## Publish behavior

- Trigger: push to `main` when `packages/todo-types/**` changes
- Versioning: automatic patch bump
- Registry: GitHub Packages

## Consumer setup

Add to `.npmrc`:

@todo-skeleton:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:\_authToken=${GITHUB_TOKEN}
```

- [ ] **Step 5: Run the bump script locally**

Run: `node scripts/release/bump-todo-types-version.mjs`

Expected: prints the next patch version and updates `packages/todo-types/package.json`.

- [ ] **Step 6: Restore the package version before commit**

Edit `packages/todo-types/package.json` back to:

```json
{
  "version": "0.1.0"
}
```

The CI workflow is responsible for bumping on publish; the committed baseline stays at `0.1.0` until a later release-policy change.

- [ ] **Step 7: Lint the workflow YAML mentally against required permissions**

Check these exact fields exist:

```yaml
permissions:
  contents: write
  packages: write
```

Without `packages: write`, publish will fail. Without `contents: write`, later workflow adjustments cannot safely commit generated version updates if the project chooses to add that behavior.

- [ ] **Step 8: Commit the publish automation**

```bash
git add .github/workflows/publish-todo-types.yml scripts/release/bump-todo-types-version.mjs docs/packages/todo-types.md
git commit -m "feat: publish todo types to github packages"
```

## Task 3: Update the Monorepo Feature Spec for the Approved W2 Scope

**Files:**

- Modify: `docs/features/[TODO]GH42_shared-types-package.md`

- [ ] **Step 1: Replace the registry and acceptance language in `GH42`**

Use these exact adjustments:

```md
- GitHub Packages publication for `@todo-skeleton/types`
- CI publication on merges to `main`
- Automatic patch bump release behavior
- Upstream PWA repo consumes the published package
- Upstream NestJS repo consumes the published package
```

- [ ] **Step 2: Update the acceptance criteria**

Add criteria equivalent to:

```md
- [ ] A merge to monorepo `main` that changes `packages/todo-types` publishes a new version to GitHub Packages
- [ ] `2026-project-todo-pwa-vite` installs and builds against the published version
- [ ] `2026-project-todo-api-nestjs` installs and builds against the published version
```

- [ ] **Step 3: Commit the spec alignment**

```bash
git add docs/features/[TODO]GH42_shared-types-package.md
git commit -m "docs: align GH42 with published package workflow"
```

## Task 4: Prove PWA Upstream Consumer Integration

**Files:**

- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/package.json`
- Create: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/.npmrc`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/src/types/todo.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-pwa-vite/Dockerfile`

- [ ] **Step 1: Add registry config in the upstream PWA repo**

```ini
@todo-skeleton:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

- [ ] **Step 2: Add the published package dependency**

```json
{
  "dependencies": {
    "@todo-skeleton/types": "0.1.1"
  }
}
```

Use the actual version published by Task 2 instead of hard-coding `0.1.1`.

- [ ] **Step 3: Replace local wire type declarations with imports**

```ts
import type { TodoItem } from "@todo-skeleton/types";

export type TodoAction =
  | { type: "LOAD_TODOS"; payload: TodoItem[] }
  | { type: "CREATE_TODO"; payload: { description: string } }
  | { type: "UPDATE_TODO"; payload: { id: string; description: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "DELETE_TODO"; payload: { id: string } };
```

Keep any PWA-local UI types in the file. Do not move `UiTodo` or future sync-state types into the shared package.

- [ ] **Step 4: Update the PWA Dockerfile if install auth is required during build**

Use a pattern equivalent to:

```dockerfile
ARG GITHUB_TOKEN
RUN printf "@todo-skeleton:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n" "$GITHUB_TOKEN" > .npmrc
RUN pnpm install --frozen-lockfile
RUN rm .npmrc
```

If the current Docker build never installs private packages in CI or local image builds, document why no Dockerfile change is needed before skipping this step.

- [ ] **Step 5: Install and run the upstream PWA checks**

Run: `pnpm install`

Expected: PASS and `@todo-skeleton/types` resolves from GitHub Packages.

Run: `pnpm build`

Expected: PASS.

Run: `pnpm test:unit`

Expected: PASS.

- [ ] **Step 6: Commit the upstream PWA consumer update**

```bash
git add .npmrc package.json pnpm-lock.yaml src/types/todo.ts Dockerfile
git commit -m "feat: consume shared todo types package"
```

## Task 5: Prove NestJS Upstream Consumer Integration

**Files:**

- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/package.json`
- Create: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/.npmrc`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/src/todos/entities/todo.entity.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/src/todos/todos.controller.ts`
- Modify: `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/Dockerfile`

- [ ] **Step 1: Add registry config in the upstream API repo**

```ini
@todo-skeleton:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

- [ ] **Step 2: Add the published package dependency**

```json
{
  "dependencies": {
    "@todo-skeleton/types": "0.1.1"
  }
}
```

Use the actual version published by Task 2.

- [ ] **Step 3: Update the API entity/response boundary to import shared types**

```ts
import type { TodoItem } from "@todo-skeleton/types";

export class TodoEntity implements TodoItem {
  id!: string;
  description!: string;
  completed!: boolean;
  createdAt!: string;
}
```

If `createdAt` currently stays as a `Date` in the API entity layer, do not force this exact code. Instead, introduce the shared type at the controller response boundary and keep the entity class aligned with current NestJS behavior. The important outcome is that the API consumes the package without breaking its runtime contract.

- [ ] **Step 4: Update controller type annotations to use shared contracts**

```ts
import type {
  CreateTodoDto,
  TodoItem,
  UpdateTodoDto,
} from "@todo-skeleton/types";
```

Use the shared types for response typing and DTO type references where it does not conflict with NestJS decorator-based classes.

- [ ] **Step 5: Update the API Dockerfile if package auth is required during install**

Use the same temporary `.npmrc` pattern as Task 4 if the build installs private packages inside Docker.

- [ ] **Step 6: Install and run the upstream API checks**

Run: `pnpm install`

Expected: PASS and `@todo-skeleton/types` resolves from GitHub Packages.

Run: `pnpm build`

Expected: PASS.

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 7: Commit the upstream API consumer update**

```bash
git add .npmrc package.json pnpm-lock.yaml src/todos/entities/todo.entity.ts src/todos/todos.controller.ts Dockerfile
git commit -m "feat: consume shared todo types package"
```

## Task 6: Sync Upstream Consumer Changes Back into the Monorepo

**Files:**

- Verify and refresh: `apps/todo-pwa-vite/**`
- Verify and refresh: `apps/todo-api-nestjs/**`

- [ ] **Step 1: Push and merge the upstream PWA branch**

Run:

```bash
git push origin <pwa-branch>
gh pr create --fill
```

Expected: PR open in `2026-project-todo-pwa-vite`, then merged.

- [ ] **Step 2: Push and merge the upstream API branch**

Run:

```bash
git push origin <api-branch>
gh pr create --fill
```

Expected: PR open in `2026-project-todo-api-nestjs`, then merged.

- [ ] **Step 3: Pull the PWA subtree into the monorepo**

Run:

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-skeleton-monorepo subtree pull --prefix=apps/todo-pwa-vite origin-pwa main --squash
```

Replace `origin-pwa` with the configured remote name for the upstream PWA repo.

- [ ] **Step 4: Pull the API subtree into the monorepo**

Run:

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-skeleton-monorepo subtree pull --prefix=apps/todo-api-nestjs origin-api main --squash
```

Replace `origin-api` with the configured remote name for the upstream API repo.

- [ ] **Step 5: Verify the monorepo still builds with subtree updates**

Run: `pnpm --dir /Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-skeleton-monorepo build`

Expected: PASS for monorepo build targets.

- [ ] **Step 6: Commit the subtree sync**

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-skeleton-monorepo add apps/todo-pwa-vite apps/todo-api-nestjs
git -C /Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-skeleton-monorepo commit -m "chore: sync subtree consumers for shared todo types"
```

## Task 7: Final Verification and Documentation Closure

**Files:**

- Modify if needed: `docs/PROJECT_STATUS.md`
- Modify if needed: `docs/CHANGELOG.md`
- Modify if needed: `docs/features/[TODO]GH42_shared-types-package.md`

- [ ] **Step 1: Verify monorepo package tests**

Run: `pnpm --filter @todo-skeleton/types test`

Expected: PASS.

- [ ] **Step 2: Verify monorepo package build**

Run: `pnpm --filter @todo-skeleton/types build`

Expected: PASS.

- [ ] **Step 3: Verify published package is visible**

Run: `npm view @todo-skeleton/types --registry=https://npm.pkg.github.com`

Expected: PASS and shows the latest published version. If auth is required locally, set `NODE_AUTH_TOKEN` first.

- [ ] **Step 4: Mark the feature spec as done only after all acceptance checks pass**

Update `docs/features/[TODO]GH42_shared-types-package.md` to:

```md
status: DONE
completed_at: 2026-04-28
```

Rename the file to:

```text
docs/features/[DONE]GH42_shared-types-package.md
```

- [ ] **Step 5: Update project status**

Use wording equivalent to:

```md
**Last completed phase:** Phase 9 — Shared Types Package and Distribution Workflow
**Next action:** Start the next approved workstream using the published package contract
```

- [ ] **Step 6: Commit documentation closure**

```bash
git add docs/features docs/PROJECT_STATUS.md docs/CHANGELOG.md
git commit -m "docs: close W2 shared types workstream"
```

## Self-Review

### Spec coverage

- Producer package creation: covered by Task 1
- GitHub Packages publication and patch bump CI: covered by Task 2
- `GH42` scope alignment: covered by Task 3
- PWA upstream consumer proof: covered by Task 4
- NestJS upstream consumer proof: covered by Task 5
- Subtree sync and composed monorepo verification: covered by Task 6
- Final acceptance and documentation closure: covered by Task 7

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” instructions remain in the task steps
- Version example `0.1.1` is explicitly labeled as an example that must be replaced with the actual published version
- Remote names `origin-pwa` and `origin-api` are explicitly marked as values to replace with real configured remotes

### Type consistency

- Package exports are consistently named `TodoItem`, `CreateTodoDto`, and `UpdateTodoDto`
- The package path is consistently `@todo-skeleton/types`
- The release trigger is consistently “push to monorepo `main` when `packages/todo-types/**` changes”
