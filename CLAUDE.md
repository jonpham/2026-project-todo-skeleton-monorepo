# CLAUDE.md — Project Context & Working Agreement

> This file is read automatically by Claude Code at the start of every session.
> Update the "Current Session Context" section at the start of each new session.

---

## Working Agreement

These rules govern every session. Follow them without exception.

### Phase-Gating (Default)
- Complete exactly **one step** at a time, then STOP and wait for explicit approval
- A step is one checklist item in the active feature doc's `## Steps` section
- Exception: if the active feature doc has `step_gating: false` in its frontmatter,
  complete all steps in the phase before stopping — but still stop at the phase boundary
- Never begin the next phase without starting a new Claude Code session

### Before Implementing Anything
- State your assumptions explicitly
- If a decision has meaningful tradeoffs, present options and ask which to take
- In plan mode (`/ultraplan` or Shift+Tab), never create or modify files

### After Every Step
Output the following before stopping:
1. **Changed files** — every file created, modified, or deleted
2. **Assumptions made** — anything not explicitly specified that you decided
3. **Verification commands** — exact commands the engineer should run to confirm the step works locally
4. **Next step** — one sentence describing what comes next, but do NOT execute it

### File & Status Discipline
- After completing a step, update the corresponding checklist item in the feature doc
- After completing a phase, update frontmatter: `status`, `branch`, `pr`, `completed_at`
- Rename the feature doc file to reflect the new status (e.g. `[TODO]` → `[DONE]`)
- Commit feature doc changes as part of the same PR as the implementation

---

## Project Overview

**Project Name:** [PROJECT_NAME]
**Purpose:** [One sentence describing what this project does and why it exists]
**Type:** [e.g. Vite + React PWA / NestJS API / Monorepo]
**GitHub Repo:** [https://github.com/USERNAME/REPO_NAME]
**GitHub Project Board:** [PROJECT_BOARD_URL]

---

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
├── apps/                            # Deployable application packages
├── packages/                        # Shared libraries
│   └── types/                       # Shared TypeScript types
├── .github/
│   ├── workflows/                   # GitHub Actions CI/CD
│   └── PULL_REQUEST_TEMPLATE.md     # PR checklist
├── .claude/
│   └── commands/                    # Custom Claude Code slash commands
│       ├── bootstrap.md             # /project:bootstrap
│       ├── populate_project.md      # /project:populate_project
│       └── develop.md               # /project:develop
├── package.json                     # Root pnpm workspace config
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

---
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

### UI
- **Framework:** React 19
- **Styling:** Tailwind CSS v4

### Code Quality
- **Linter:** ESLint with `@typescript-eslint` (flat config)
- **Formatter:** Prettier
- **Git Hooks:** Husky + lint-staged (pre-commit: lint + format staged files)

### Testing
- **Unit & Component Tests:** Vitest + React Testing Library (RTL)
- **Component Development & Visual Tests:** Storybook 8
- **End-to-End (E2E) Tests:** Playwright

### CI/CD & Deployment
- **CI/CD:** GitHub Actions
- **Containerization:** Docker (multi-stage builds, Nginx)
- **Local Container Runtime:** OrbStack
- **Production:** Cloudflare Pages

---

## Development Commands

| Command | Description |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start all dev servers via Turborepo |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all Vitest unit tests |
| `pnpm lint` | Run ESLint across the workspace |
| `pnpm format` | Run Prettier across the workspace |
| `pnpm storybook` | Start Storybook |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `docker compose up --build` | Run production build locally via OrbStack |

---

## Code Standards

### TypeScript
- Strict mode enabled — no implicit `any`
- Shared types live in `packages/types` only — never duplicate across packages

### File & Folder Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Tests: co-located as `ComponentName.test.tsx`
- Stories: co-located as `ComponentName.stories.tsx`
- E2E tests: `e2e/` at the app root

### Git Conventions
- Branch naming: `feat/GH{n}-short-description`
- Commit messages: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Never commit directly to `main` — always use a feature branch + pull request
- Every PR must include an updated feature doc in `docs/features/`

### Testing Philosophy
- Every component has a unit test (Vitest + RTL) and a Storybook story
- Tests assert behavior, not implementation details
- E2E tests cover critical user flows end-to-end
- All tests must pass before any commit (enforced by Husky pre-commit hook)

---

## Feature Docs — Naming Convention

Feature docs in `docs/features/` follow this naming pattern:

```
[{STATUS}]{ISSUE_REF}_{feature-slug}.md
```

- `STATUS`: `TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED`
- `ISSUE_REF`: `P{n}` when planned locally (no GitHub Issue yet), `GH{n}` once a GitHub Issue exists
- `feature-slug`: short lowercase hyphenated name

**Examples:**
```
[TODO]P1_monorepo-setup.md           # Planned, no issue yet
[TODO]GH1_monorepo-setup.md          # Issue #1 created
[IN-PROGRESS]GH1_monorepo-setup.md   # Currently being developed
[DONE]GH1_monorepo-setup.md          # Merged
```

---

## Current Session Context

> Update this section at the start of every new Claude Code session.

**Last completed phase:** None
**Active feature doc:** None
**Current step:** None
**Known blockers:** None
**Next action:** Run `/project:bootstrap` to initialize the repository
