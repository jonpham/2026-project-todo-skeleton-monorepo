# W1 — NestJS Monorepo Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the NestJS API full monorepo parity — health endpoint, DRY service layer, client-UUID support, NestJS sync workflow, nginx proxy, SQLite named volume, and a working `docker compose up` that routes the PWA through nginx to the API.

**Architecture:** Two separate bodies of work: (1) upstream changes to `jonpham/2026-project-todo-api-nestjs` (health, findOrFail, CreateTodoDto id?) must be PRed and merged before the monorepo subtree pull in Task 10; (2) monorepo changes (sync workflow, nginx, docker-compose) can be built in parallel and merged independently. Tasks 1–4 run in the upstream repo at `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/`. Tasks 5–9 run in the monorepo worktree at `/Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity/`. Task 10 depends on the upstream PR being merged.

**Tech Stack:** NestJS v11, @nestjs/terminus, Prisma, Docker Compose v2, nginx:alpine, pnpm, Vitest, GitHub Actions

---

## File Map

### Upstream repo (`2026-project-todo-api-nestjs`)

| Action | Path |
|--------|------|
| Create | `src/health/health.controller.ts` |
| Modify | `src/app.module.ts` |
| Modify | `src/todos/todos.service.ts` |
| Modify | `src/todos/dto/create-todo.dto.ts` |
| Modify | `src/todos/todos.service.spec.ts` |

### Monorepo worktree (`worktree-w1-nestjs-parity`)

| Action | Path |
|--------|------|
| Create | `.github/workflows/sync-nestjs-subtree.yml` |
| Create | `infra/nginx/nginx.conf` |
| Modify | `docker-compose.yml` |
| Create | `subtree-sync.sh` |

---

## Part A — Upstream Repo Changes

> All tasks in Part A run in `/Users/jp/code/_boilerplate/2026-project-todo/2026-project-todo-api-nestjs/`.
> These changes must be PRed to `jonpham/2026-project-todo-api-nestjs` and merged before Task 10.

---

### Task 1: Add `/health` endpoint (TerminusModule)

**Files:**
- Create: `src/health/health.controller.ts`
- Modify: `src/app.module.ts`
- Modify: `package.json` (add @nestjs/terminus)

- [ ] **Step 1: Install @nestjs/terminus**

```bash
pnpm add @nestjs/terminus
```

Expected: `@nestjs/terminus` appears in `package.json` dependencies.

- [ ] **Step 2: Create health controller**

Create `src/health/health.controller.ts`:

```typescript
import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";

@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
```

> `version: VERSION_NEUTRAL` is required because `main.ts` calls `app.enableVersioning({ type: VersioningType.URI })`. Without it, the endpoint would be unreachable (no version prefix and no neutral flag = not routed).

- [ ] **Step 3: Register TerminusModule and HealthController in AppModule**

Replace `src/app.module.ts` with:

```typescript
import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health/health.controller.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { TodosModule } from "./todos/todos.module.js";

@Module({
  imports: [PrismaModule, TodosModule, TerminusModule],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Run the dev server and verify the endpoint**

```bash
pnpm dev
```

In a second terminal:
```bash
curl http://localhost:3000/health
```

Expected output:
```json
{"status":"ok","info":{},"error":{},"details":{}}
```

Kill the dev server with `Ctrl+C`.

- [ ] **Step 5: Commit**

```bash
git add src/health/health.controller.ts src/app.module.ts package.json pnpm-lock.yaml
git commit -m "feat: add /health endpoint via TerminusModule"
```

---

### Task 2: Extract `findOrFail` helper in TodosService

**Files:**
- Modify: `src/todos/todos.service.ts`
- Modify: `src/todos/todos.service.spec.ts`

- [ ] **Step 1: Write the failing test for findOrFail behavior**

Open `src/todos/todos.service.spec.ts`. Add this describe block after the existing tests:

```typescript
describe("findOrFail (via findOne)", () => {
  it("returns the todo when it exists", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(mockTodo);
    const result = await service.findOne("uuid-1");
    expect(result).toEqual(mockTodo);
    expect(mockPrismaService.todo.findUnique).toHaveBeenCalledWith({
      where: { id: "uuid-1" },
    });
  });

  it("throws NotFoundException when todo does not exist", async () => {
    mockPrismaService.todo.findUnique.mockResolvedValue(null);
    await expect(service.findOne("missing-id")).rejects.toThrow(
      "Todo missing-id not found"
    );
  });
});
```

- [ ] **Step 2: Run the tests to confirm current behavior (should pass)**

```bash
pnpm test
```

Expected: all existing tests pass (the service already has this logic — we're verifying before refactoring).

- [ ] **Step 3: Refactor todos.service.ts to use findOrFail**

Replace `src/todos/todos.service.ts` with:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Todo } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateTodoDto } from "./dto/create-todo.dto.js";
import { UpdateTodoDto } from "./dto/update-todo.dto.js";

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.todo.findMany();
  }

  async findOne(id: string) {
    return this.findOrFail(id);
  }

  create(dto: CreateTodoDto) {
    return this.prisma.todo.create({ data: dto });
  }

  async update(id: string, dto: UpdateTodoDto) {
    await this.findOrFail(id);
    return this.prisma.todo.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    return this.prisma.todo.delete({ where: { id } });
  }

  private async findOrFail(id: string): Promise<Todo> {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    return todo;
  }
}
```

- [ ] **Step 4: Run tests and verify they still pass**

```bash
pnpm test
```

Expected: all tests pass, including the new `findOrFail` describe block added in Step 1.

- [ ] **Step 5: Commit**

```bash
git add src/todos/todos.service.ts src/todos/todos.service.spec.ts
git commit -m "refactor: extract findOrFail helper in TodosService"
```

---

### Task 3: Add `id?` to CreateTodoDto

**Files:**
- Modify: `src/todos/dto/create-todo.dto.ts`

- [ ] **Step 1: Write a failing test for client-UUID passthrough**

Add this describe block to `src/todos/todos.service.spec.ts`, inside the existing `TodosService` describe:

```typescript
describe("create", () => {
  it("passes client-provided id to Prisma", async () => {
    const clientId = "550e8400-e29b-41d4-a716-446655440000";
    const dto = { id: clientId, description: "Test todo" };
    mockPrismaService.todo.create.mockResolvedValue({ ...mockTodo, id: clientId });

    const result = await service.create(dto);

    expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
      data: { id: clientId, description: "Test todo" },
    });
    expect(result.id).toBe(clientId);
  });

  it("creates todo without id (server generates UUID)", async () => {
    const dto = { description: "Test todo" };
    mockPrismaService.todo.create.mockResolvedValue(mockTodo);

    await service.create(dto);

    expect(mockPrismaService.todo.create).toHaveBeenCalledWith({
      data: { description: "Test todo" },
    });
  });
});
```

- [ ] **Step 2: Run the test — it fails because CreateTodoDto doesn't accept id yet**

```bash
pnpm test
```

Expected: TypeScript error or test fails — `id` is not a known property of `CreateTodoDto`.

- [ ] **Step 3: Update CreateTodoDto to accept optional id**

Replace `src/todos/dto/create-todo.dto.ts` with:

```typescript
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTodoDto {
  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: "Buy milk" })
  @IsString()
  @IsNotEmpty()
  description: string;
}
```

> Prisma's `@id @default(uuid())` only generates a UUID when no `id` is supplied in the create data. When `id` is present in `dto`, Prisma uses it directly — no schema migration needed.

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/todos/dto/create-todo.dto.ts src/todos/todos.service.spec.ts
git commit -m "feat: accept optional client-generated id in CreateTodoDto"
```

---

### Task 4: Open upstream PR

- [ ] **Step 1: Create a branch and push**

```bash
git checkout -b feat/nestjs-monorepo-parity-w1
git push -u origin feat/nestjs-monorepo-parity-w1
```

- [ ] **Step 2: Open PR via gh CLI**

```bash
gh pr create \
  --repo jonpham/2026-project-todo-api-nestjs \
  --base main \
  --head feat/nestjs-monorepo-parity-w1 \
  --title "feat: health endpoint, findOrFail helper, CreateTodoDto id?" \
  --body "$(cat <<'EOF'
## Changes

- **GET /health** — TerminusModule health check at `VERSION_NEUTRAL` path. Returns `{ status: 'ok' }`. Required by Docker Compose healthcheck and L3 smoke tests.
- **findOrFail helper** — Private method in `TodosService` that replaces three identical `findUnique + NotFoundException` blocks. Callers: `findOne`, `update`, `remove`.
- **CreateTodoDto id?** — Optional `@IsUUID()` field. Prisma uses client-provided UUID for idempotent sync queue flush; falls back to `@default(uuid())` when omitted.

## Why upstream first

These files live in `apps/todo-api-nestjs/` in the monorepo via git subtree. Direct edits in the monorepo would be overwritten on next `git subtree pull`. Changes must merge here first, then sync into the monorepo.

## Test coverage

- `todos.service.spec.ts`: new `findOrFail` and `create` describe blocks verify behavior
- L3 system tests (`todos.system.spec.ts`) ship in Phase 7 (integration tests phase)
EOF
)"
```

Expected: PR URL printed. Note the PR number — needed to track merge status.

- [ ] **Step 3: Wait for upstream PR to be reviewed and merged**

Once merged, proceed to Task 10 (subtree pull). Tasks 5–9 can run in parallel while waiting.

---

## Part B — Monorepo Changes

> All tasks in Part B run in `/Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity/`.
> These can be built and committed while the upstream PR is still open.

---

### Task 5: Add NestJS subtree sync workflow

**Files:**
- Create: `.github/workflows/sync-nestjs-subtree.yml`

- [ ] **Step 1: Create the sync workflow (mirrors sync-pwa-subtree.yml)**

Create `.github/workflows/sync-nestjs-subtree.yml`:

```yaml
name: Sync NestJS API Subtree

on:
  repository_dispatch:
    types: [nestjs-api-updated]

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.PAT_TOKEN }}

      - name: Configure git
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"

      - name: Create sync branch
        run: |
          BRANCH="chore/sync-nestjs-api-$(date +%s)"
          git checkout -b "$BRANCH"
          echo "$BRANCH" >> /tmp/branch_name

      - name: Add subtree remote
        run: git remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git || true

      - uses: pnpm/action-setup@v4
        with:
          version: 10.33.0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Pull subtree update
        run: ./scripts/subtree-pull.sh todo-api-nestjs main

      - name: Update lockfile
        run: pnpm install --no-frozen-lockfile

      - name: Stage lockfile update
        run: |
          git add pnpm-lock.yaml
          git diff --cached --quiet || git commit -m "chore: update pnpm lockfile after nestjs-api sync"

      - name: Push branch
        run: |
          BRANCH=$(cat /tmp/branch_name)
          git push -u origin "$BRANCH"

      - name: Open PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          BRANCH=$(cat /tmp/branch_name)
          cat <<'EOF' > /tmp/pr_body.md
          Automated sync of `apps/todo-api-nestjs` subtree from upstream repository.

          This PR will:
          - Run CI (lint + type-check)
          - Allow manual review before merging to main

          Triggered by NestJS API repo push to main
          EOF
          gh pr create \
            --head "$BRANCH" \
            --base main \
            --title "chore: sync NestJS API subtree with latest changes" \
            --body-file /tmp/pr_body.md
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/sync-nestjs-subtree.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-nestjs-subtree.yml
git commit -m "ci: add NestJS API subtree sync workflow"
```

---

### Task 6: Create monorepo nginx config

**Files:**
- Create: `infra/nginx/nginx.conf`

- [ ] **Step 1: Create the nginx config**

Create `infra/nginx/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Proxy API requests to NestJS. The trailing slash on proxy_pass strips the
    # /api prefix before forwarding — /api/v1/todos → /v1/todos at NestJS.
    # Service name "api" resolves inside Docker network only.
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Service worker and Workbox runtime: must never be cached so PWA updates
    # are detected immediately.
    location ~* (sw\.js|workbox-[^/]+\.js)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        try_files $uri =404;
    }

    # Static assets with content-hash filenames: cache aggressively.
    location ~* \.(?:js|css|woff2?|ico|png|svg|webmanifest)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback: all unmatched routes → index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Verify nginx config syntax (requires docker)**

```bash
docker run --rm -v "$(pwd)/infra/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

- [ ] **Step 3: Commit**

```bash
git add infra/nginx/nginx.conf
git commit -m "feat: add monorepo nginx config with /api/ proxy for Docker Compose"
```

---

### Task 7: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

Current state: two services (`todo-pwa`, `todo-api-nestjs`), no named volume, SQLite in working dir, no nginx proxy, healthcheck uses `/v1/todos`.

Changes: rename services, add `todo-db-data` volume, mount monorepo nginx config, fix SQLite path, update healthcheck to `/health`, add service dependency.

- [ ] **Step 1: Replace docker-compose.yml**

```yaml
services:
  pwa:
    build:
      context: apps/todo-pwa-vite
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    volumes:
      # Override standalone nginx.conf with monorepo version that proxies /api/
      - ./infra/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s

  api:
    build:
      context: apps/todo-api-nestjs
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    volumes:
      - todo-db-data:/data
    environment:
      - DATABASE_URL=file:/data/prod.db
      - PORT=3000
      - CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:3000,http://localhost:5173,https://app.todo.witty-m.com
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

volumes:
  todo-db-data:
```

> **Why the healthcheck uses `/health` (no `/v1/` prefix):** The health endpoint is registered with `VERSION_NEUTRAL` in the upstream change — it responds at `/health`, not `/v1/health`. The previous healthcheck polled `/v1/todos` which creates a DB read on every health check; `/health` is cheaper.

> **Why `start_period: 15s` on the API:** The NestJS container runs `prisma migrate deploy` before starting. On first boot this can take 5–10 seconds. `start_period` gives the container time to complete migrations before Docker starts counting healthcheck retries.

> **Why `CORS_ALLOWED_ORIGINS` includes `http://localhost`:** In Docker Compose, the PWA is served via nginx at port 3000 mapped to host port 3000. The browser sees the PWA at `http://localhost:3000` — but with the nginx proxy, API calls go through nginx (`/api/`) so CORS headers from NestJS are never seen by the browser. The value is set defensively; the nginx proxy is the primary integration path.

- [ ] **Step 2: Verify docker-compose.yml is valid**

```bash
docker compose config --quiet && echo "Compose config valid"
```

Expected: `Compose config valid`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: update docker-compose with nginx proxy, SQLite volume, health checks"
```

---

### Task 8: Create subtree-sync.sh

**Files:**
- Create: `subtree-sync.sh`

- [ ] **Step 1: Create the script**

Create `subtree-sync.sh` at the monorepo root:

```bash
#!/usr/bin/env bash
# subtree-sync.sh — Pull upstream changes from a subtree remote into this monorepo.
#
# Usage:
#   ./subtree-sync.sh <package> [branch]
#
# Examples:
#   ./subtree-sync.sh todo-pwa-vite              # pull todo-pwa-vite@main
#   ./subtree-sync.sh todo-api-nestjs            # pull todo-api-nestjs@main
#   ./subtree-sync.sh todo-api-nestjs feat/foo   # pull a feature branch
#
# Prerequisites:
#   The remote must be added before first use:
#     git remote add todo-pwa-vite https://github.com/jonpham/2026-project-todo-pwa-vite.git
#     git remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git
#
# After running this script:
#   1. Resolve any merge conflicts
#   2. Run: pnpm install --no-frozen-lockfile  (lockfile may need updating)
#   3. Open a PR — do NOT commit subtree syncs directly to main
#
# To push a change back upstream (rare):
#   git subtree push --prefix=apps/<package> <remote> <branch>
#
set -euo pipefail

PACKAGE="${1:?Usage: ./subtree-sync.sh <package> [branch]}"
BRANCH="${2:-main}"

# Ensure the remote exists
if ! git remote get-url "$PACKAGE" &>/dev/null; then
  echo "ERROR: remote '$PACKAGE' not found."
  echo "Add it with: git remote add $PACKAGE https://github.com/jonpham/$PACKAGE.git"
  exit 1
fi

./scripts/subtree-pull.sh "$PACKAGE" "$BRANCH"
echo ""
echo "Sync complete: apps/$PACKAGE updated from $PACKAGE@$BRANCH"
echo "Next: pnpm install --no-frozen-lockfile && git add pnpm-lock.yaml && git commit -m 'chore: update lockfile after $PACKAGE sync'"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x subtree-sync.sh
```

- [ ] **Step 3: Test it prints the error message for unknown remote**

```bash
./subtree-sync.sh unknown-package 2>&1 | grep "ERROR"
```

Expected: `ERROR: remote 'unknown-package' not found.`

- [ ] **Step 4: Commit**

```bash
git add subtree-sync.sh
git commit -m "chore: add subtree-sync.sh helper for pulling upstream changes"
```

---

### Task 9: Push monorepo branch and open PR

- [ ] **Step 1: Verify clean working tree**

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity status --short
```

Expected: no output (clean).

- [ ] **Step 2: Push the branch**

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity push -u origin feat/w1-nestjs-monorepo-parity
```

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --repo jonpham/2026-project-todo-skeleton-monorepo \
  --base main \
  --head feat/w1-nestjs-monorepo-parity \
  --title "feat: W1 NestJS monorepo parity — sync workflow, nginx proxy, SQLite volume" \
  --body "$(cat <<'EOF'
## W1 — NestJS Monorepo Parity

Monorepo-side changes for Workstream 1. Upstream changes (health endpoint, findOrFail, CreateTodoDto id?) are tracked in jonpham/2026-project-todo-api-nestjs and will be pulled via Task 10 after that PR merges.

## Changes

- **`.github/workflows/sync-nestjs-subtree.yml`** — mirrors `sync-pwa-subtree.yml`; triggered by `repository_dispatch: nestjs-api-updated`
- **`infra/nginx/nginx.conf`** — proxies `/api/` → `http://api:3000/` (strips prefix via trailing slash); serves PWA from `/usr/share/nginx/html`
- **`docker-compose.yml`** — renamed services to `pwa`/`api`; nginx config mounted as volume override; `todo-db-data` named volume at `/data`; healthcheck updated to `/health`; `pwa` depends on `api` being healthy before starting
- **`subtree-sync.sh`** — documents pull workflow with remote existence check and next-step guidance

## Acceptance criteria

- [ ] `docker compose config` passes
- [ ] `nginx -t` passes on `infra/nginx/nginx.conf`
- [ ] Sync workflow YAML is valid
- [ ] Task 10 (subtree pull) can run once upstream PR merges

## Blocked by

jonpham/2026-project-todo-api-nestjs upstream PR (health + findOrFail + CreateTodoDto id?) must merge before Task 10 (full-stack verification).
EOF
)"
```

---

## Part C — After Upstream PR Merges

> Run these tasks once the `jonpham/2026-project-todo-api-nestjs` upstream PR is merged.

---

### Task 10: Pull upstream changes into monorepo

**Files:**
- Modify: `apps/todo-api-nestjs/` (subtree pull — many files updated)

- [ ] **Step 1: Ensure the remote is registered**

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity remote -v | grep todo-api-nestjs
```

If not present:
```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git
```

- [ ] **Step 2: Pull the subtree**

```bash
cd /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity
./subtree-sync.sh todo-api-nestjs main
```

Expected: subtree pull completes, squash commit created with message `chore: sync apps/todo-api-nestjs from todo-api-nestjs@main`.

- [ ] **Step 3: Update lockfile**

```bash
pnpm install --no-frozen-lockfile
git add pnpm-lock.yaml
git diff --cached --quiet || git commit -m "chore: update pnpm lockfile after todo-api-nestjs sync"
```

- [ ] **Step 4: Verify upstream changes landed**

```bash
grep -n "findOrFail" /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity/apps/todo-api-nestjs/src/todos/todos.service.ts
```

Expected: `findOrFail` appears in the file.

```bash
grep -n "VERSION_NEUTRAL" /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity/apps/todo-api-nestjs/src/health/health.controller.ts
```

Expected: `VERSION_NEUTRAL` appears in the file.

- [ ] **Step 5: Push updated branch**

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity push
```

---

### Task 11: Full-stack verification

- [ ] **Step 1: Build and start the full stack**

```bash
cd /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity
docker compose up --build --wait
```

Expected: both services start healthy. `--wait` blocks until all healthchecks pass.

- [ ] **Step 2: Verify health endpoint through nginx proxy**

```bash
curl http://localhost:3000/api/health
```

Expected:
```json
{"status":"ok","info":{},"error":{},"details":{}}
```

- [ ] **Step 3: Verify PWA is served**

```bash
curl -s http://localhost:3000/ | grep -i "<!doctype html"
```

Expected: HTML response containing `<!doctype html` (case-insensitive).

- [ ] **Step 4: Create a todo via the API**

```bash
curl -s -X POST http://localhost:3000/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"description":"Verify Docker Compose stack"}' | python3 -m json.tool
```

Expected: JSON with `id` (server-generated UUID), `description`, `completed: false`.

- [ ] **Step 5: Create a todo with a client-generated UUID**

```bash
curl -s -X POST http://localhost:3000/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"id":"550e8400-e29b-41d4-a716-446655440001","description":"Client UUID test"}' | python3 -m json.tool
```

Expected: response `id` equals `550e8400-e29b-41d4-a716-446655440001`.

- [ ] **Step 6: Verify SQLite persistence across API restart**

```bash
# Restart only the API service (data must survive)
docker compose restart api

# Wait for healthcheck to pass
sleep 20

# List todos — both created todos should still be present
curl -s http://localhost:3000/api/v1/todos | python3 -m json.tool
```

Expected: JSON array containing both todos created in Steps 4 and 5.

- [ ] **Step 7: Tear down**

```bash
docker compose down
```

- [ ] **Step 8: Commit and push**

```bash
git -C /Users/jp/code/_boilerplate/2026-project-todo/worktree-w1-nestjs-parity push
```

Update the PR description to indicate full-stack verification passed.

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| GET /health returns `{ status: 'ok' }` | Task 1 |
| findOrFail extracted | Task 2 |
| POST /v1/todos with client UUID → response.id matches | Task 3, verified Task 11 Step 5 |
| POST /v1/todos without id → server UUID | Task 3, verified Task 11 Step 4 |
| docker compose up starts both services | Task 7, verified Task 11 Step 1 |
| curl localhost/api/health returns ok | Verified Task 11 Step 2 |
| curl localhost/ serves PWA HTML | Verified Task 11 Step 3 |
| SQLite persists after restart | Verified Task 11 Step 6 |
| subtree-sync.sh is executable and documented | Task 8 |
| NestJS sync workflow mirrors PWA pattern | Task 5 |

All acceptance criteria from the feature doc are covered.

### Type consistency

- `CreateTodoDto.id?: string` defined Task 3, used in `service.create(dto)` which passes `dto` directly to `prisma.todo.create({ data: dto })` — Prisma infers the type correctly.
- `findOrFail` returns `Promise<Todo>` (Prisma type) — matches callers in `findOne`, `update`, `remove`.
- nginx service name `api` in `infra/nginx/nginx.conf` matches docker-compose.yml service name `api` — consistent.
- Docker Compose port: API container listens on `3000` (`PORT=3000` env var), nginx proxies to `http://api:3000/` — consistent.
