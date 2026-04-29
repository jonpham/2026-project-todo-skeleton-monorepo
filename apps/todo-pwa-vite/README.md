# TODO-PWA-VITE

A progressive web application (PWA) todo list built with React, TypeScript, and Vite. Designed as a standalone application with integrated monorepo support for coordinated deployments.

## Repository Overview

This is a **standalone repository** that can be developed, tested, and deployed independently, while also being integrated into the [2026-project-todo-skeleton-monorepo](https://github.com/jonpham/2026-project-todo-skeleton-monorepo) via Git Subtree.

**Key characteristics:**

- **Standalone Development**: Full development environment with independent CI/CD
- **Monorepo Integration**: Automatically synced to monorepo for coordinated deployments
- **Production PWA**: Vite-optimized build with service workers and offline support
- **Type-Safe**: Full TypeScript with strict mode enabled
- **Tested**: Unit tests (Vitest), component tests (Storybook), E2E tests (Playwright)

## Tech Stack

| Layer               | Technology                    |
| ------------------- | ----------------------------- |
| **Framework**       | React 19 + TypeScript         |
| **Build Tool**      | Vite 6                        |
| **Testing**         | Vitest, Storybook, Playwright |
| **Package Manager** | pnpm 10.33                    |
| **Linting**         | ESLint 10                     |
| **Formatting**      | Prettier 3                    |
| **Deployment**      | Cloudflare Pages + Docker     |

## Setup

### Prerequisites

- Node.js 22+
- pnpm 10.33+
- GitHub Packages read access for `@jonpham/2026-project-todo-types`

### Installation

```bash
# Install dependencies
GITHUB_TOKEN=$(gh auth token) pnpm install

# Verify setup
pnpm lint
pnpm test
pnpm build
```

The GitHub token must include `read:packages`.

### Environment

Create `.env` if needed for custom configuration (none required for local development):

```bash
# Example - not required for local dev
VITE_API_URL=http://localhost:3001
```

## Developer Scripts

### Development

```bash
# Start dev server (Vite HMR on :5173)
pnpm dev

# Lint code and fix issues
pnpm lint
pnpm format

# Run Storybook component explorer (port 6006)
pnpm storybook
```

### Testing

```bash
# Run all tests (unit + storybook component tests)
pnpm test

# Run unit tests only (src/**/*.test.tsx)
pnpm test:unit

# Run Storybook component tests
pnpm test:storybook

# Run E2E tests (against running dev server)
pnpm test:e2e

# Run E2E tests against production build
pnpm build && pnpm preview  # Terminal 1
pnpm test:e2e               # Terminal 2
```

### Build & Preview

```bash
# Build for production (outputs to dist/)
pnpm build

# Preview production build locally
pnpm preview

# Build and serve Storybook
pnpm build-storybook
```

## Developer Workflow

### Local Development

**Single-App Development** (recommended for feature work):

```bash
# 1. Create feature branch
git checkout -b feat/my-feature

# 2. Start dev server
pnpm dev

# 3. Make changes, tests auto-run on save
# Vitest watches in background

# 4. Run full test suite before commit
pnpm lint && pnpm test

# 5. Commit and push
git push origin feat/my-feature
```

**Full-Stack Testing** (if working with API):

```bash
# Terminal 1: Start PWA dev server
pnpm dev

# Terminal 2: Start API (in monorepo)
cd ../2026-project-todo-skeleton-monorepo
docker-compose up todo-api-nestjs

# Now PWA at http://localhost:5173 can call API at http://localhost:3001
```

### Pull Request Workflow

1. **Push feature branch** → GitHub Actions runs:
   - **CI** (all branches): Lint, unit tests, build verification
   - **Preview Deploy** (PRs & main): Build → Deploy to Cloudflare Pages preview → Run E2E tests
2. **Preview + E2E pass** → Safe to merge to `main`
   - Preview URL appears in PR comments
   - E2E test results visible in PR checks
   - Test artifacts available for download

3. **Merge to main** → Automated sync happens:
   - Repository dispatch sent to monorepo
   - Monorepo creates subtree sync PR
   - Preview deployed to Cloudflare Pages
   - E2E tests run against preview
   - Manual review of monorepo changes
   - Merge to monorepo main triggers production deploy

## CI/CD Workflows

### Continuous Integration (CI)

**Triggers on**: Push to any branch, PR to main

**Steps**:

1. Install dependencies with pnpm
2. Run ESLint (code quality)
3. Run Vitest unit + component tests
4. Build with Vite (catches TypeScript errors)

**Result**: Must pass before merge to main

**File**: `.github/workflows/ci.yml`

### Continuous Deployment — Preview (CD Preview)

**Triggers on**: Pull requests and push to main

**Steps**:

1. Build PWA with Vite
2. Deploy to Cloudflare Pages (preview channel)
3. Run Playwright E2E tests against preview URL
4. Upload test artifacts and report results

**Result**:

- Preview URL posted to PR
- Test results visible in PR checks
- Blocks merge if E2E tests fail (on PR)

**File**: `.github/workflows/cd-preview.yml`

### Continuous Deployment — Sync to Monorepo

**Triggers on**: Successful CI + merge to main in this repo

**Steps**:

1. Repository dispatch event sent to monorepo
2. Monorepo creates subtree sync PR
3. Monorepo's preview workflow validates integration
4. Manual review and merge to monorepo main
5. Production deployment triggered

**File**: `.github/workflows/trigger-monorepo-sync.yml` (this repo)

## Deployment Strategy

### Standalone Deployments

**Development**: Developers work locally with `pnpm dev`

**Preview**: Automatic preview builds in monorepo PR (Cloudflare Pages)

- Triggered when: Subtree sync PR created
- URL: `https://<pr-number>.todo-pwa.pages.dev`
- Test: E2E tests run against preview

**Staging**: Manual `pnpm build && pnpm preview` locally before pushing

**Production**: Via Monorepo → Cloudflare Pages

- Domain: `https://app.todo.witty-m.com`
- Triggered when: Changes merged to monorepo `main`
- Status: Monitored via GitHub deployments

### Docker Deployment

For local compose or custom hosting:

```bash
# Build Docker image
GITHUB_TOKEN=$(gh auth token) docker build --secret id=github_token,env=GITHUB_TOKEN -t todo-pwa:latest .

# Run locally
docker run -p 3000:80 todo-pwa:latest

# Access at http://localhost:3000
```

The Dockerfile uses a two-stage build:

1. **Builder**: Node alpine, installs deps, runs `pnpm build`
2. **Server**: Nginx alpine, serves `dist/` with SPA routing configured

## Monorepo Integration

### Relationship to Monorepo

```
2026-project-todo-pwa-vite (this repo)
├── Standalone: Independent development & CI
├── Subtree: Merged into monorepo at apps/todo-pwa-vite/
└── Sync: Auto-syncs to monorepo on main push

2026-project-todo-skeleton-monorepo
├── Coordinates: Multiple apps (API, PWA, infra)
├── Preview: Runs E2E tests on subtree sync PRs
└── Production: Deploys to Cloudflare Pages on main merge
```

### Git Subtree Workflow

When changes are pushed to this repo's `main`:

1. **Standalone CI runs** (lint, test, build)
2. **On success**, `trigger-monorepo-sync.yml` dispatches event to monorepo
3. **Monorepo syncs** subtree with `git subtree pull --squash`
4. **Monorepo creates PR** with subtree changes
5. **Preview + E2E** runs automatically on the PR
6. **Manual review** of changes
7. **Merge to monorepo main** triggers production deploy

### Local Subtree Updates

To pull latest monorepo changes locally:

```bash
# From standalone repo
cd 2026-project-todo-pwa-vite
git pull origin main
```

To manually sync into monorepo (if needed):

```bash
# From monorepo
cd 2026-project-todo-skeleton-monorepo
./scripts/subtree-pull.sh todo-pwa-vite main
```

## Architecture

### Project Structure

```
src/
├── components/          # React components (TodoApp, TodoList, etc.)
│   ├── TodoApp/        # Main app container
│   ├── TodoList/       # List renderer
│   ├── TodoInput/      # Input form
│   └── TodoItem/       # Individual item
├── hooks/              # Custom hooks
│   └── useTodoWorker.ts # Web Worker integration
├── types/              # TypeScript definitions
│   └── todo.ts        # Todo type definitions
├── workers/            # Web Workers
│   └── todo.worker.ts # Offload heavy computation
├── main.tsx           # Entry point
└── index.css          # Global styles

public/
├── icons/             # PWA icons (192x512px)
└── manifest.webmanifest # PWA manifest

e2e/
└── app.spec.ts        # Playwright E2E tests

.storybook/
├── main.ts            # Storybook config
└── preview.ts         # Component preview setup

docs/
├── DEPLOYMENT.md      # Deployment guide
└── STACK.md          # Technical stack details
```

### Key Components

- **TodoApp**: Root component managing state and effects
- **TodoList**: Renders filtered todos with delete/toggle
- **TodoInput**: Form for adding new todos
- **TodoItem**: Individual todo with interactive controls
- **useTodoWorker**: Hook managing Web Worker for computation

## Testing

### Unit Tests (Vitest)

```bash
pnpm test:unit
# Watches: src/**/*.test.tsx
# Reports: Coverage, failure details
```

### Component Tests (Storybook + Vitest)

```bash
pnpm test:storybook
# Stories: src/**/*.stories.tsx
# Engine: Vitest with browser API
```

### E2E Tests (Playwright)

```bash
# Against dev server
pnpm dev &
pnpm test:e2e

# Against production build
pnpm build
pnpm preview &
pnpm test:e2e
```

Tests cover:

- Component rendering and interactions
- Form submission and validation
- Todo CRUD operations
- State management and persistence

## Contributing

1. **Fork or branch** from this repo
2. **Develop locally** with `pnpm dev`
3. **Test before pushing**: `pnpm lint && pnpm test`
4. **Push to feature branch** (triggers CI)
5. **Create PR** with description of changes
6. **CI passes** + approval → merge to main
7. **Automated sync** pushes changes to monorepo
8. **Monorepo E2E** validates integration
9. **Manual merge** to monorepo main for production

## Support

- **Issues**: Open in this repository for PWA-specific bugs
- **Monorepo Issues**: Open in [2026-project-todo-skeleton-monorepo](https://github.com/jonpham/2026-project-todo-skeleton-monorepo) for integration problems
- **Documentation**: See `docs/` directory for detailed guides

## License

Part of 2026 Project Bootstrap ecosystem. See monorepo for details.
