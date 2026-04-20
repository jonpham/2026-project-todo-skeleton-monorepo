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

## Project Documentation

- @docs/STACK.md - System or Project Tech Stack and Coding Standards
- @docs/ARCHITECTURE.md - System or Project Architecture
- @docs/CHANGELOG.md - A running changelog of completed features.
- @docs/PROJECT_STATUS.md - the current in progress state of the project during development
- Update files in the docs foler after major milestones and additions
- Run `/project:update-docs-and-push` slash command when pushing commits to the repository
- Run `/project:update-status-and-commit` slash command to update `docs/PROJECT_STATUS.md` when making git commits

---

## Code Standards

### Git Conventions
- Branch naming: `feat/GH{n}-short-description`
- Commit messages: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- NEVER commit directly to `main` 
- NEVER force push to `main`
— ALWAYS use a feature branch + pull request to request changes to `main`
- Every PR must include an updated feature doc in `docs/features/`

### Development Workflow
1. Feature development should start with the creation of a feature branch from `/project:develop` slash command
2. Develop and commit on the feature branch
3. Test, lint, and format locally using appropriate development commands before committing.
4. Run Integration tests before pushing
5. Update docs when necessary
6. Push the branch
6. Create a PR to merge into `main` with tested proposed changes.

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

Read current status and progress to load into context from @docs/PROJECT_STATUS.md
