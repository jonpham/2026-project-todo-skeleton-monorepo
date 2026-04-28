# todo-pwa — Tech Stack & Conventions

App-specific stack for `apps/todo-pwa`. Monorepo-wide toolchain lives in
[`docs/STACK.md`](../../../docs/STACK.md) at the repo root.

---

## Tech Stack

| Concern                 | Tool                                                          |
| ----------------------- | ------------------------------------------------------------- |
| Framework               | React 19                                                      |
| Bundler                 | Vite                                                          |
| Styling                 | Tailwind CSS v4                                               |
| PWA                     | `vite-plugin-pwa` v1 (generateSW mode, Workbox asset caching) |
| Unit & component tests  | Vitest + React Testing Library                                |
| Visual / story tests    | Storybook 10 (`@storybook/addon-vitest`)                      |
| E2E tests               | Playwright                                                    |
| Containerization        | Docker (multi-stage build, Nginx)                             |
| Local container runtime | OrbStack                                                      |
| Production hosting      | Cloudflare Pages                                              |

---

## Dev Commands

Run these from the repo root with `--filter`, or from `apps/todo-pwa/` directly.

| Command                                 | Description                                                         |
| --------------------------------------- | ------------------------------------------------------------------- |
| `pnpm --filter todo-pwa dev`            | Start Vite dev server at `localhost:5173`                           |
| `pnpm --filter todo-pwa build`          | Production build into `dist/`                                       |
| `pnpm --filter todo-pwa test`           | Run unit tests then Storybook story tests (sequential)              |
| `pnpm --filter todo-pwa test:unit`      | Vitest unit tests only (jsdom)                                      |
| `pnpm --filter todo-pwa test:storybook` | Storybook story tests only (Chromium via Playwright)                |
| `pnpm --filter todo-pwa test:e2e`       | Playwright E2E tests (requires dev server or `PLAYWRIGHT_BASE_URL`) |
| `pnpm --filter todo-pwa storybook`      | Start Storybook dev server                                          |
| `pnpm --filter todo-pwa lint`           | ESLint for this app                                                 |

---

## File & Folder Conventions

Each component lives in its own folder under `src/components/`. This keeps
tests, stories, and logic co-located as the component grows.

```
src/components/
└── MyComponent/
    ├── MyComponent.tsx          # Component implementation
    ├── MyComponent.test.tsx     # Vitest + RTL unit tests
    ├── MyComponent.stories.tsx  # Storybook stories
    ├── hooks/                   # Component-local hooks (if any)
    └── index.ts                 # Re-export: export { MyComponent } from "./MyComponent"
```

| Concern                      | Location                           |
| ---------------------------- | ---------------------------------- |
| App-level hooks              | `src/hooks/useCamelCase.ts`        |
| App-local types              | `src/types/{domain}.ts`            |
| Shared types (cross-package) | `packages/types/`                  |
| E2E tests                    | `e2e/` (app root)                  |
| PWA manifest                 | `public/manifest.webmanifest`      |
| PWA icons                    | `public/icons/` (192×192, 512×512) |

---

## Testing Philosophy

- Every component has a unit test (Vitest + RTL) and a Storybook story
- Tests assert behavior, not implementation details
- E2E tests cover critical user flows end-to-end
- All tests must pass before any commit (enforced by Husky pre-commit hook)
- E2E runs only in CI against the Cloudflare Pages preview URL — not locally in CI

---

## PWA Notes

- Service worker (`sw.js`) and Workbox runtime files must be served with
  `Cache-Control: no-store` so the browser always fetches a fresh copy
- Cloudflare Pages applies this automatically; the Nginx config replicates it
  for the Docker deployment path
- The PWA manifest is hand-authored — `vite-plugin-pwa` generates the service
  worker but does not overwrite `manifest.webmanifest`
