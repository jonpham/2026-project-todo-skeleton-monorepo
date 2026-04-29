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

### Response Style

- Terse — skip preambles and post-step recaps. The `✅ Step N complete` block is the required exception.
- Never add a trailing "here's what I did" summary after completing tool calls.

### Commit Messages

- Header describes the feature work only — never mention doc/status updates in the header
- Doc and status updates (`PROJECT_STATUS.md`, feature doc checkmarks) go in body bullets only

### File & Status Discipline

- After completing a step, update the corresponding checklist item in the feature doc
- After completing a phase, update frontmatter: `status`, `branch`, `pr`, `completed_at`
- Rename the feature doc file to reflect the new status (e.g. `[TODO]` → `[DONE]`)
- Commit feature doc changes as part of the same PR as the implementation

---

## Project Overview

**Project Name:** Project-BootStrap-Mono-Repo

**Purpose:** A monorepo using a To-Do app use case to build a collection of deployable skeleton projects — each demonstrating a different tech stack or deployment type — that can be cloned or reused for real projects.

**Type:** Monorepo with Various System Components (Projects) with individualized Tech Stacks

**GitHub Repo:** [2026-project-todo-skeleton-monorepo](https://github.com/jonpham/2026-project-todo-skeleton-monorepo)

**GitHub Project Board:** https://github.com/users/jonpham/projects/7

---

## Project Documentation

Docs live in `docs/`:

| Path | Purpose |
|---|---|
| `docs/features/` | Phase task tracking — frontmatter + step checklists are the source of truth |
| `docs/initiatives/{name}/` | gstack / GSD / superpowers planning outputs — commit here after skill runs |
| `docs/ideas/` | Lightweight ADRs and idea capture |
| `docs/STACK.md`, `ARCHITECTURE.md`, `CHANGELOG.md` | Reference docs |

**No GitHub Issue sync.** Feature docs are the task manager. GitHub Issues are optional for external collaboration only.

- Run `/project:update-status-and-commit` before each commit
- Run `/project:update-docs-and-push` before each push

---

## Code Standards

### Git Conventions

- Branch naming: `feat/GH{n}-short-description`
- Commit messages: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- NEVER commit directly to `main`; NEVER force push to `main`
- Always use a feature branch + pull request
- Every PR must include an updated feature doc in `docs/features/`

### Development Workflow

Run `/project:develop` to start or resume a phase. It manages branching, step execution, doc updates, commits, and PRs.

---

## Feature Docs — Naming Convention

```
[{STATUS}]{ISSUE_REF}_{feature-slug}.md
```

- `STATUS`: `TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED`
- `ISSUE_REF`: `P{n}` local plan, `GH{n}` once a GitHub Issue exists

---


## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

---

## Current Session Context

Read current status and progress from @docs/PROJECT_STATUS.md

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:

- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
