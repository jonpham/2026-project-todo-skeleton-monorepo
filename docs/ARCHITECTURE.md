# Project Architecture

## Repository Structure

```
[repo-name]/
├── CLAUDE.md                        # This file
├── docs/
│   ├── features/                    # Source of truth for all phases & steps
│   │   ├── _TEMPLATE.md             # Feature doc template
│   │   └── [STATUS]GH{n}_{slug}.md  # One file per phase
│   ├── ARCHITECTURE.md
│   └── DECISIONS.md                 # Architecture Decision Records
├── apps/
│   └── todo-pwa/                    # Vite + React 19 PWA
│       ├── docs/                    # App-specific docs (stack, deployment)
│       │   ├── STACK.md             # React, Vite, Tailwind, testing, conventions
│       │   └── DEPLOYMENT.md        # Local Docker, Pulumi infra, CI/CD, custom domain
│       ├── infra/                   # App-specific Pulumi program (Cloudflare Pages)
│       ├── .storybook/              # Storybook config (main.ts, preview.ts)
│       ├── e2e/                     # Playwright E2E tests
│       ├── public/
│       │   ├── manifest.webmanifest # PWA manifest
│       │   └── icons/               # PWA icons (192×192, 512×512)
│       ├── src/
│       │   ├── App.tsx              # Thin shell — renders TodoApp inside <main>
│       │   ├── App.test.tsx         # Vitest unit tests (mocks useTodoWorker)
│       │   ├── App.stories.tsx      # Storybook stories
│       │   ├── components/          # Feature UI components — one folder per component
│       │   │   ├── TodoApp/
│       │   │   │   ├── TodoApp.tsx          # Root feature component — composes list + input
│       │   │   │   ├── TodoApp.test.tsx
│       │   │   │   ├── TodoApp.stories.tsx
│       │   │   │   └── index.ts             # Re-exports component for clean imports
│       │   │   ├── TodoInput/               # (same structure)
│       │   │   ├── TodoItem/                # (same structure)
│       │   │   └── TodoList/                # (same structure)
│       │   ├── types/
│       │   │   └── todo.ts                  # App-local TypeScript types (TodoItem)
│       │   ├── hooks/
│       │   │   └── useTodoWorker.ts # Owns localStorage; hydrates worker on mount
│       │   ├── workers/
│       │   │   └── todo.worker.ts   # Pure in-memory state machine (no localStorage)
│       │   ├── test-setup.ts        # @testing-library/jest-dom setup
│       │   ├── main.tsx
│       │   └── index.css            # Tailwind CSS v4 entry
│       ├── index.html
│       ├── playwright.config.ts
│       ├── vite.config.ts           # Vitest: unit (jsdom) + storybook (Chromium) projects
│       └── package.json
├── infra/                           # Monorepo Pulumi orchestrator (Automation API)
│   ├── index.ts                     # Drives all apps/*/infra/ stacks in sequence
│   ├── package.json                 # Standalone npm project (not a pnpm workspace member)
│   └── tsconfig.json
├── packages/                        # Shared libraries
│   └── types/                       # Shared TypeScript types
├── .github/
│   ├── workflows/                   # GitHub Actions CI/CD
│   └── PULL_REQUEST_TEMPLATE.md     # PR checklist
├── .claude/
│   └── commands/                    # Custom Claude Code slash commands
│       ├── bootstrap.md                  # /project:bootstrap
│       ├── plan_project.md               # /project:plan_project
│       ├── develop.md                    # /project:develop
│       ├── update-status-and-commit.md   # /project:update-status-and-commit
│       └── update-docs-and-push.md       # /project:update-docs-and-push
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
