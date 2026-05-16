# 2026-PROJECT-TODO-SKELETON-MONOREPO

## Monorepo Structure

```
.
├── apps/
│   ├── todo-pwa-vite/           # Vite + React PWA
│   │   ├── docs/           # App-specific docs (STACK.md, DEPLOYMENT.md)
│   │   └── infra/          # App-specific Pulumi program (Cloudflare Pages)
│   └── todo-api-nestjs/    # NestJS REST API (via Git Subtree from standalone repo)
│       ├── docs/           # App-specific docs (STACK.md, DEPLOYMENT.md)
│       └── ...             # (Full NestJS project structure)
├── infra/                  # Monorepo-level Pulumi Automation API orchestrator
├── .github/
│   └── workflows/
│       ├── ci.yml          # Lint + test + build on every PR / push
│       ├── cd-preview.yml  # Deploy preview + E2E on PR open/update
│       └── cd-prod.yml     # Deploy to production on merge to main
├── docs/                   # Monorepo-level docs (architecture, stack, deployment prereqs)
└── package.json            # Root scripts (see below)
```

**Docs index:**

| Doc                                                                                  | What's in it                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [`docs/STACK.md`](docs/STACK.md)                                                     | Monorepo toolchain, root scripts, CI/CD overview, app stacks |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                                       | Full repo structure, Git Subtree workflow                    |
| [`docs/DEPLOYMENT_SETUP.md`](docs/DEPLOYMENT_SETUP.md)                               | Shared prerequisites: Cloudflare, DNS, secrets, Pulumi CLI   |
| [`apps/todo-pwa-vite/docs/STACK.md`](apps/todo-pwa-vite/docs/STACK.md)               | todo-pwa tech stack, dev commands, conventions               |
| [`apps/todo-pwa-vite/docs/DEPLOYMENT.md`](apps/todo-pwa-vite/docs/DEPLOYMENT.md)     | Local Docker, Pulumi infra, CI/CD, custom domain             |
| [`apps/todo-api-nestjs/docs/STACK.md`](apps/todo-api-nestjs/docs/STACK.md)           | todo-api-nestjs tech stack, dev commands, conventions        |
| [`apps/todo-api-nestjs/docs/DEPLOYMENT.md`](apps/todo-api-nestjs/docs/DEPLOYMENT.md) | Local Docker, NestJS/Prisma setup, CI/CD                     |

---

## Root Scripts

| Script              | Command                  | Description                                                         |
| ------------------- | ------------------------ | ------------------------------------------------------------------- |
| `dev`               | `pnpm dev`               | Start all apps in development mode (via Turborepo)                  |
| `build`             | `pnpm build`             | Build all apps                                                      |
| `test`              | `pnpm test`              | Run unit tests (L1) in every workspace — fast, no external infra    |
| `lint`              | `pnpm lint`              | Lint all workspaces                                                 |
| `deploy:local`      | `pnpm deploy:local`      | Build and start the production Docker container at `localhost:3000` |
| `deploy:local:stop` | `pnpm deploy:local:stop` | Stop the local Docker container                                     |

### Test layers

Four levels of automated tests live in this repo. `pnpm test` runs L1 only —
L3 and L4 require external infra and are invoked explicitly.

| Level | Where                                            | How to run                                      | Needs                              |
| ----- | ------------------------------------------------ | ----------------------------------------------- | ---------------------------------- |
| L1    | `apps/*/src/**/*.{test,spec}.ts`, `packages/*`   | `pnpm test`                                     | nothing                            |
| L3    | `apps/todo-api-nestjs/test/todos.system.spec.ts` | `pnpm --filter todo-api-nestjs test:system`     | Prisma + a SQLite `test.db` (auto) |
| L4    | `e2e-docker/*.spec.ts`                           | `pnpm --filter e2e-docker test:e2e` (see below) | `pnpm deploy:local` stack          |
| L4    | `apps/todo-pwa-vite/e2e/app.spec.ts`             | `pnpm --filter todo-pwa test:e2e`               | Vite dev server (auto-started)     |

CI runs L1 (`ci` job) and L3 (`system-tests` job) automatically. L4 is run
locally before merge by the engineer, and again in the `cd-preview` workflow
against the deployed preview URL.

L2 (inter-unit) is intentionally deferred — there is no complex component
interaction graph on the client today that would benefit from it beyond what
L1 already covers.

See [`e2e-docker/README.md`](e2e-docker/README.md) for the L4 Docker Compose
workflow, including the two-phase volume-persistence test.

## Run Locally for Manual Testing

### Development Servers

Run the API and PWA in separate terminals from the monorepo root.

The repo commits non-secret local defaults in each app's `.env.local`. Replace
those values only when your local ports or URLs differ. Developer-specific
secrets must stay out of git in ignored `.env` files or your shell.

```bash
# Terminal 1: start the NestJS API at http://localhost:3001
cd apps/todo-api-nestjs
pnpm prisma:migrate
pnpm dev
```

```bash
# Terminal 2: start the PWA at http://localhost:5173
cd apps/todo-pwa-vite
pnpm dev
```

Open the PWA at `http://localhost:5173`.

Useful API checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/v1/todos
```

### Docker Full Stack

Docker builds install GitHub Packages, so `GITHUB_TOKEN` must be set in your
shell or in the root `.env` file before starting the stack.

```bash
export GITHUB_TOKEN="$(gh auth token)"
pnpm deploy:local
```

Open the PWA at `http://localhost:3000`. In Docker, nginx proxies API requests
from `/api/v1/todos` to the NestJS API service.

```bash
pnpm deploy:local:stop
```

---

## Infrastructure & Deployment

Infrastructure is managed with [Pulumi](https://www.pulumi.com/) and targets [Cloudflare Pages](https://pages.cloudflare.com/).

Each app owns its own Pulumi stack in `apps/{app}/infra/` — fully self-contained and deployable standalone. The root `infra/` is a Pulumi Automation API orchestrator that drives all app stacks in one command, passing shared config automatically. This separation means any app can be extracted into its own repo with its infrastructure intact.

| Layer                 | Path                        | Purpose                                                                            |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| App stack             | `apps/todo-pwa-vite/infra/` | Declares this app's cloud resources. Deployable standalone with `pulumi up`.       |
| Monorepo orchestrator | `infra/`                    | Drives all app stacks via Pulumi Automation API. Full-monorepo deploy entry point. |

Full design rationale: [`docs/ARCHITECTURE.md — Infrastructure Design`](docs/ARCHITECTURE.md#infrastructure-design)

**Quick start:** copy `.env.example` → `.env` and fill in your Cloudflare credentials — both infra entry points load it automatically, so no inline env vars are needed.

**Setup and first deploy:** [`docs/DEPLOYMENT_SETUP.md`](docs/DEPLOYMENT_SETUP.md) → [`apps/todo-pwa-vite/docs/DEPLOYMENT.md`](apps/todo-pwa-vite/docs/DEPLOYMENT.md)

### App Repos — Downstream Mirrors

The monorepo is the source of truth. `apps/todo-api-nestjs` and `apps/todo-pwa-vite` are worked on directly here. After merging to `main`, the `sync-subtrees-push.yml` CI workflow automatically pushes each app to its standalone upstream repo via `git subtree split`, keeping them current as independently deployable templates.

**Never make changes in the upstream repos directly** — they will be overwritten on the next monorepo push.

### CI/CD Workflows

| Workflow                      | Trigger                              | What it does                                                          |
| ----------------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| `ci.yml` — `ci` job           | Push / PR to any branch              | Lint, L1 test, build                                                  |
| `ci.yml` — `system-tests` job | Push / PR to any branch              | L3 system tests for NestJS API against a fresh SQLite `test.db`       |
| `cd-preview.yml`              | PR opened / updated targeting `main` | Deploy preview to Cloudflare Pages, run E2E tests against preview URL |
| `cd-prod.yml`                 | Push to `main`                       | Deploy to production Cloudflare Pages + custom domain                 |
| `publish-todo-types.yml`      | Push to `main` (packages/todo-types) | Bump patch version and publish to GitHub Packages                     |
| `sync-subtrees-push.yml`      | Push to `main` (apps/\*)             | Push changed app subtrees to their upstream template repos            |

---

## Feature Documentation & Workflow

This project is expected to use Claude Code Guided Development.
|Step| Claude Command | Description |
|---|---|---|
| 1 | `/project:bootstrap` |Initialize the Project|
| 2 | `/project:plan_project` |Plan your next features and populate this repo's GitHub Project with issues|
| 3 | `/project:develop` |Iteratively develop according to plan|

### Feature Docs — Source of Truth

All planned and completed work lives in `docs/features/`. Every phase has one
markdown file tracking context, acceptance criteria, implementation steps, test
strategy, assumptions, and a change log. The GitHub Project board and Issues are
a reflection of these files — not the other way around.

**Naming convention:**

```
[{STATUS}]{ISSUE_REF}_{feature-slug}.md

[TODO]P1_monorepo-setup.md          # Planned, no Issue yet
[TODO]GH1_monorepo-setup.md         # Issue created
[IN-PROGRESS]GH1_monorepo-setup.md  # In development
[DONE]GH1_monorepo-setup.md         # Merged
```

Frontmatter fields (`status`, `issue`, `branch`, `pr`, `completed_at`) must be
kept current. The filename must reflect the current status at all times.

---

### Pull Request Requirements

Every PR **must** include an update to the corresponding `docs/features/` file:

- Completed steps checked off in `## Steps`
- Decisions recorded in `## Assumptions`
- New row added to `## Change Log`
- Frontmatter and filename updated to reflect new status

The PR template enforces this checklist. PRs missing a feature doc update will
not be approved.

---

### Branch & Commit Conventions

- **Branches:** `feat/{#}-short-description`
- **Commits:** Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- **Never commit directly to `main`** — all work goes through a PR
- Husky pre-commit hook runs ESLint + Prettier; failing commits are rejected

---

### Claude Code Commands

Five slash commands in `.claude/commands/` automate the workflow:

| Command                             | Purpose                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `/project:bootstrap`                | One-time repo init — Git, GitHub repo, feature doc check                   |
| `/project:plan_project`             | Syncs feature docs → GitHub Issues + Project board                         |
| `/project:develop`                  | Starts next phase — creates branch, executes steps one at a time, opens PR |
| `/project:update-status-and-commit` | Updates `PROJECT_STATUS.md` and commits verified changes                   |
| `/project:update-docs-and-push`     | Reviews all project docs, commits updates, pushes branch                   |

Commands follow the working agreement: one step at a time, stopping for engineer
approval before proceeding. Optional but strongly recommended.

### Agent Delegation Pattern

`update-status-and-commit` and `update-docs-and-push` are designed to run as
foreground subagents delegated from `develop` and `plan_project`. Subagents
cannot invoke slash commands directly, so delegation uses a prompt-by-reference
pattern: the parent spawns a child with "Read and follow `.claude/commands/{file}.md`"
plus context (active doc, branch name, phase number). The instruction files are
never duplicated — the subagent prompt points to the file by path.

| Caller         | Delegation point                  | Subagent reads                | Mode                |
| -------------- | --------------------------------- | ----------------------------- | ------------------- |
| `develop`      | Step 4d — post-step commit        | `update-status-and-commit.md` | Foreground          |
| `develop`      | Step 5 item 3 — phase commit      | `update-status-and-commit.md` | Foreground          |
| `develop`      | Step 5 item 5 — doc review + push | `update-docs-and-push.md`     | Foreground          |
| `plan_project` | Step 3 — per-doc Issue creation   | steps 3c+3d+3e                | Parallel foreground |
| `plan_project` | Step 4 — post-CLAUDE.md push      | `update-docs-and-push.md`     | Foreground          |

All delegations are foreground — each lies on the critical path and the next
action requires the result (commit hash, push confirmation, or Issue number).
`plan_project` step 3 is the exception: per-doc agents run in parallel since
each doc is independent, then the main agent commits once all finish.
