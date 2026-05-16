# Project Architecture

## Repository Structure

```
[repo-name]/
├── AGENTS.md                        # Shared AI workflow guidance
├── CLAUDE.md                        # Claude entrypoint; points to AGENTS.md
├── docs/
│   ├── features/                    # Source of truth for all phases & steps
│   │   ├── _TEMPLATE.md             # Feature doc template
│   │   └── [STATUS]GH{n}_{slug}.md  # One file per phase
│   ├── ARCHITECTURE.md
│   └── DECISIONS.md                 # Architecture Decision Records
├── apps/
│   ├── todo-pwa/                    # Vite + React 19 PWA
│   │   ├── docs/                    # App-specific docs
│   |   │   └── ARCHITECTURE.md      # REST API design, Prisma schema, module structure
│   │   ├── ...
│   │   └── README.md                # Visit Upstream Repositories for Details
│   └── todo-api-nestjs/             # NestJS REST API (standalone repo via Git Subtree)
│       ├── docs/                    # App-specific docs
│       │   └── ARCHITECTURE.md      # REST API design, Prisma schema, module structure
│       ├── ...
│       └── README.md                # Visit Upstream Repositories for Details
├── infra/                           # Monorepo Pulumi orchestrator (Automation API)
│   ├── index.ts                     # Drives all apps/*/infra/ stacks in sequence
│   ├── package.json                 # Standalone npm project (not a pnpm workspace member)
│   └── tsconfig.json
├── packages/                        # Shared libraries
│   └── types/                       # Shared TypeScript types
├── .github/
│   ├── workflows/                   # GitHub Actions CI/CD
│   └── PULL_REQUEST_TEMPLATE.md     # PR checklist
├── package.json                     # Root pnpm workspace config
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---

## Infrastructure Design

Infrastructure uses a two-layer Pulumi model designed for app extractability.

### Per-app stacks (`apps/{app}/infra/`)

Each app owns a standalone Pulumi TypeScript program that declares only its own
cloud resources. It has its own `package.json`, `tsconfig.json`, and Pulumi stack
state — it is **not** a pnpm workspace member and is managed with `npm install`.

Secrets are loaded automatically from the repo root `.env` (see `.env.example`).
This means any app can be deployed in isolation with no inline env vars:

```bash
cd apps/todo-pwa/infra
npm install
pulumi up
```

And when an app is extracted into its own repository, its infra travels with it
unchanged.

### Monorepo orchestrator (`infra/`)

A separate Pulumi Automation API program that drives all app stacks in sequence.
It passes shared config (e.g. `CLOUDFLARE_API_TOKEN`) to each app stack
automatically — no per-app secret duplication.

```bash
cd infra
npm install
npx ts-node index.ts
```

Adding a new app: declare its resources in `apps/{app}/infra/index.ts`, then
register a `deployApp(...)` call in `infra/index.ts`.

### Adding a new app — infra checklist

1. Create `apps/{app}/infra/` with `Pulumi.yaml`, `package.json`, `tsconfig.json`, `index.ts`
2. Add `deployApp("app-name", path.join(__dirname, "..", "apps", "app-name", "infra"), sharedConfig)` to `infra/index.ts`
3. Document the app's resources and deploy steps in `apps/{app}/docs/DEPLOYMENT.md`

---

## Git Subtree — NestJS API

The `todo-api-nestjs` app is **pulled into this monorepo via Git Subtree** from its
own GitHub repository (`github.com/jonpham/2026-project-todo-api-nestjs`).

### Why Git Subtree?

The NestJS API is developed as a standalone repository because:

1. **Extractability** — It can be cloned directly without the monorepo
2. **Reusability** — Serves as a template project for other NestJS applications
3. **Decoupled CI/CD** — Deploys independently
4. **Clean history** — Monorepo history stays clean via squash-merge

### Pull Workflow

To pull the latest changes from the standalone API repo into the monorepo:

```bash
# From monorepo root
git subtree pull --prefix=apps/todo-api-nestjs todo-api-nestjs main --squash
```

This creates a single commit in the monorepo containing all API updates since
the last pull. No commits from the standalone repo appear in the monorepo history.

### Initial Setup (Completed)

```bash
git remote add todo-api-nestjs https://github.com/jonpham/2026-project-todo-api-nestjs.git
git subtree add --prefix=apps/todo-api-nestjs todo-api-nestjs main --squash
```

---
