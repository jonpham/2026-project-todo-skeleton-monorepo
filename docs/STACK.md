# Monorepo Tech Stack & Toolchain

This file covers tools and conventions that apply across the entire monorepo.
App-specific stacks live in each app's own `docs/` directory (e.g. `apps/todo-pwa/docs/STACK.md`).

---

## Prerequisites

- **Node.js** v22.x LTS (manage with `nvm`)
- **pnpm** v10.x

---

## Monorepo Toolchain

| Concern              | Tool                                                         |
| -------------------- | ------------------------------------------------------------ |
| Package manager      | pnpm workspaces                                              |
| Monorepo task runner | Turborepo                                                    |
| Language             | TypeScript v5.x (strict mode)                                |
| Linter               | ESLint with `@typescript-eslint` (flat config)               |
| Formatter            | Prettier                                                     |
| Git hooks            | Husky + lint-staged (pre-commit: lint + format staged files) |
| CI/CD                | GitHub Actions                                               |

---

## Root Scripts

| Command                  | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `pnpm install`           | Install all workspace dependencies                                  |
| `pnpm dev`               | Start all apps in dev mode (Turborepo)                              |
| `pnpm build`             | Build all apps and packages                                         |
| `pnpm test`              | Run all tests across the workspace                                  |
| `pnpm lint`              | Lint all workspaces                                                 |
| `pnpm format`            | Format all workspaces                                               |
| `pnpm deploy:local`      | Build and start the production Docker container at `localhost:3000` |
| `pnpm deploy:local:stop` | Stop the local Docker container                                     |

---

## CI/CD Workflows

| Workflow                           | Trigger                            | What it does                                                    |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `.github/workflows/ci.yml`         | Push / PR to any branch            | Lint, test, build                                               |
| `.github/workflows/cd-preview.yml` | PR opened/updated targeting `main` | Deploy preview to Cloudflare Pages, run E2E against preview URL |
| `.github/workflows/cd-prod.yml`    | Push to `main`                     | Deploy to production Cloudflare Pages + custom domain           |

---

## Code Standards

### TypeScript

- Strict mode enabled — no implicit `any`
- Shared types live in `packages/types/` only — never duplicate across packages

### Adding a New App

1. Create `apps/{app-name}/` with its own `package.json`
2. Add app-specific stack and conventions to `apps/{app-name}/docs/STACK.md`
3. Add app-specific deployment instructions to `apps/{app-name}/docs/DEPLOYMENT.md`
4. Add app infra to `apps/{app-name}/infra/` (standalone Pulumi program)
5. Register the deploy in `infra/index.ts` (monorepo Automation API orchestrator)
