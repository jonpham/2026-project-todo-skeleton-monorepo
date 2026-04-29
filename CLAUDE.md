# CLAUDE.md — todo-api-nestjs Working Agreement

> Loaded automatically at the start of every session.

---

## Project Overview

**Project Name:** todo-api-nestjs

**Purpose:** Standalone NestJS v11 TODO API skeleton — demonstrates a production-ready REST API structure with TypeScript strict mode, Vitest testing, ESLint flat config, Prettier, and Husky pre-commit hooks. Developed as a standalone repo and integrated into the monorepo via Git Subtree.

**Standalone Repo:** `github.com/jonpham/todo-api-nestjs` (source of truth)

**Monorepo Integration:** Mirrored at `apps/todo-api/` in the monorepo via Git Subtree

---

## Working Agreement

This repo follows the same conventions as the parent monorepo (`2026-project-todo-skeleton-monorepo`). Read that CLAUDE.md for full context.

### Phase-Gating (Default)

- Complete exactly **one step** at a time, then STOP and wait for explicit approval
- A step is one checklist item in the active feature doc's `## Steps` section
- Exception: if the active feature doc has `step_gating: false` in its frontmatter, complete all steps in the phase before stopping — but still stop at the phase boundary
- Never begin the next phase without starting a new Claude Code session

### Before Implementing Anything

- State your assumptions explicitly
- If a decision has meaningful tradeoffs, present options and ask which to take

### After Every Step

Output the following before stopping:

1. **Changed files** — every file created, modified, or deleted
2. **Assumptions made** — anything not explicitly specified that you decided
3. **Verification commands** — exact commands the engineer should run to confirm the step works locally
4. **Next step** — one sentence describing what comes next, but do NOT execute it

### Response Style

- Terse — skip preambles and post-step recaps. The `✅ Step N complete` block is the required exception.
- Never add a trailing "here's what I did" summary after completing tool calls.

### Commit Messages

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- Header describes feature work only — never mention doc/status updates in the header
- Doc and status updates go in body bullets only

### File & Status Discipline

- After completing a step, update the corresponding checklist item in the feature doc
- After completing a phase, update frontmatter: `status`, `branch`, `pr`, `completed_at`
- Rename the feature doc file to reflect the new status (e.g. `[TODO]` → `[DONE]`)
- Commit feature doc changes as part of the same PR as the implementation

---

## Code Standards

### TypeScript

- Strict mode throughout (`strict: true`, `noImplicitAny`, `strictNullChecks`)
- `ES2022` target, `NodeNext` module resolution
- Decorators enabled (`emitDecoratorMetadata`, `experimentalDecorators`)

### Linting & Formatting

- ESLint flat config (`eslint.config.js`) — matches monorepo, but with Node globals (not browser)
- Prettier with **double quotes**, `es5` trailing commas, 2-space indent, 80-char width
- Pre-commit hook via Husky + lint-staged runs both automatically

### Testing

- Vitest for unit/integration tests
- Test files: `src/**/*.spec.ts` and `test/**/*.e2e-spec.ts`
- Run: `pnpm test` (unit), `pnpm test:e2e` (integration), `pnpm test:all` (both)

---

## Development Workflow (In This Repo)

When advancing through phases:

1. Start the phase: examine the feature doc in `docs/features/`
2. Execute: work through steps (follow phase doc for step_gating behavior)
3. Commit: after each step (or at phase end if `step_gating: false`), run Prettier/ESLint via pre-commit hook
4. Verify: run local verification commands before stopping
5. Stop: wait for explicit approval before the next step/phase

---

## Current Phase Status

Check `docs/features/[STATUS]P{n}_*.md` for the active feature doc.

### Git Conventions

- Branch naming: `feat/P{n}-short-description` or `feat/GH{n}-short-description`
- NEVER commit directly to `main` (initial scaffold is the exception)
- Always use a feature branch + pull request
- Every PR must include an updated feature doc in `docs/features/`

---

## Project Structure

```
todo-api-nestjs/
├── src/
│   ├── main.ts              # Bootstrap entry point
│   └── app.module.ts        # Root module
├── docs/
│   ├── STACK.md             # Tech stack decisions
│   ├── ARCHITECTURE.md      # Architecture overview
│   ├── DEPLOYMENT.md        # Deployment guide
│   └── features/            # Feature docs (phase tracking)
├── .github/
│   └── workflows/
│       └── ci.yml           # CI: lint + test + build
├── .husky/
│   └── pre-commit           # Runs lint-staged
├── eslint.config.js         # ESLint flat config
├── vitest.config.ts         # Vitest config
├── tsconfig.json            # TypeScript config
├── tsconfig.build.json      # Build-only tsconfig
└── .env.example             # Environment variable template
```

---

## Feature Docs — Naming Convention

```
[{STATUS}]{ISSUE_REF}_{feature-slug}.md
```

- `STATUS`: `TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED`
- `ISSUE_REF`: `P{n}` local plan, `GH{n}` once a GitHub Issue exists
