# CLAUDE.md — Project Context & Working Agreement

> Loaded automatically at the start of every session.

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

**Project Name:** Project-BootStrap-Mono-Repo

**Purpose:** 
Using a “To-Do” Application Use Case, create a single monorepo system of deployables, clients, and libraries skeleton projects that aim to do 2 things:

1. Enrich the To-Do Product & Project Skeleton System with a variety of deployment types with similar boilerplate capabilities that can be cloned or re-used for other projects.  
2. Each expand the To-Do product’s capabilities, either by adding new features to the product or providing a new client for a User to Utilize the To-Do product

**Type:** Monorepo with Various System Components (Projects) with individualized Tech Stacks and purposes

**GitHub Repo:** [2026-project-todo-skeleton-monorepo](https://github.com/jonpham/2026-project-todo-skeleton-monorepo)

**GitHub Project Board:** https://github.com/users/jonpham/projects/7

---

## Project Documentation

Docs live in `docs/`: STACK, ARCHITECTURE, CHANGELOG, PROJECT_STATUS.

- Run `/project:update-status-and-commit` before each commit
- Run `/project:update-docs-and-push` before each push

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
Run `/project:develop` to start or resume a phase. It manages branching, step execution, doc updates, commits, and PRs.

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

## GitHub Project IDs
<!-- project-number: 7 -->
<!-- project-id: PVT_kwHOAIsvKM4BVMxe -->
<!-- status-field-id: PVTSSF_lAHOAIsvKM4BVMxezhQqPAs -->
<!-- todo-option-id: 426a8c31 -->
<!-- in-progress-option-id: 2b2cb0f7 -->
<!-- done-option-id: 0b5f8eba -->
<!-- blocked-option-id: 62d09295 -->

---

## Current Session Context

Read current status and progress to load into context from @docs/PROJECT_STATUS.md
