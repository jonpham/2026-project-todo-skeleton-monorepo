# Project Tech Stack & Structure

## Project Environment Prerequisites

- `node` (expected: v22.x LTS or later)
- `nvm`
- `pnpm` (expected: v9.x or later)

## Tech Stack & Toolchain

### Runtime & Package Management

- **Runtime:** Node.js LTS (managed via NVM)
- **Package Manager:** pnpm
- **Monorepo Orchestrator:** Turborepo

### Build & Bundling

- **App Bundler:** Vite
- **TypeScript:** v5.x, strict mode enabled

### UI & PWA

- **Framework:** React 19
- **Styling:** Tailwind CSS v4
- **PWA:** `vite-plugin-pwa` v1 (generateSW mode, Workbox asset caching, hand-authored `manifest.webmanifest`)

### Code Quality

- **Linter:** ESLint with `@typescript-eslint` (flat config)
- **Formatter:** Prettier
- **Git Hooks:** Husky + lint-staged (pre-commit: lint + format staged files)

### Testing

- **Unit & Component Tests:** Vitest + React Testing Library (RTL)
- **Component Development & Visual Tests:** Storybook 10 (`@storybook/addon-vitest`; test imports from `storybook/test`)
- **End-to-End (E2E) Tests:** Playwright

### CI/CD & Deployment

- **CI/CD:** GitHub Actions
- **Containerization:** Docker (multi-stage builds, Nginx)
- **Local Container Runtime:** OrbStack
- **Production:** Cloudflare Pages

---

## Development Commands

| Command                              | Description                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `pnpm install`                       | Install all workspace dependencies                                                      |
| `pnpm dev`                           | Start all dev servers via Turborepo                                                     |
| `pnpm build`                         | Build all packages and apps                                                             |
| `pnpm test`                          | Run unit tests then Storybook story tests (sequential; storybook skipped if unit fails) |
| `pnpm --filter <app> test:unit`      | Run Vitest unit tests only (jsdom)                                                      |
| `pnpm --filter <app> test:storybook` | Run Storybook story tests only (Chromium via Playwright)                                |
| `pnpm lint`                          | Run ESLint across the workspace                                                         |
| `pnpm format`                        | Run Prettier across the workspace                                                       |
| `pnpm storybook`                     | Start Storybook                                                                         |
| `pnpm test:e2e`                      | Run Playwright E2E tests                                                                |
| `docker compose up --build`          | Run production build locally via OrbStack                                               |

---

## Code Standards

### TypeScript

- Strict mode enabled — no implicit `any`
- Shared types live in `packages/types` only — never duplicate across packages

### File & Folder Conventions

Each component lives in its own folder under `src/components/`. This is intentional
template scaffolding — projects derived from this repo are expected to grow, and the
folder-per-component pattern keeps tests, stories, and logic co-located as the
component grows in complexity.

```
src/components/
└── MyComponent/
    ├── MyComponent.tsx          # Component implementation
    ├── MyComponent.test.tsx     # Vitest + RTL unit tests
    ├── MyComponent.stories.tsx  # Storybook stories
    ├── hooks/                   # Component-local hooks (if any)
    └── index.ts                 # Re-exports: export { MyComponent } from "./MyComponent"
```

- Hooks (app-level): `src/hooks/useCamelCase.ts`
- App-local types: `src/types/{domain}.ts`
- Shared types (cross-package): `packages/types/`
- Utilities: `camelCase.ts`
- E2E tests: `e2e/` at the app root

### Testing Philosophy

- Every component has a unit test (Vitest + RTL) and a Storybook story
- Tests assert behavior, not implementation details
- E2E tests cover critical user flows end-to-end
- All tests must pass before any commit (enforced by Husky pre-commit hook)
