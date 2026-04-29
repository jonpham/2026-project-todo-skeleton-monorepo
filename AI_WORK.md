## Working Agreement

These rules govern every session. Follow them without exception.

### Phase-Gating (Default)

- Complete exactly **one step** at a time, then STOP and wait for explicit approval
- A step is one checklist item in the active feature doc's `## Steps` section
- Exception: if the active feature doc has `step_gating: false` in its frontmatter,
  complete all steps in the phase before stopping — but still stop at the phase boundary
- Never begin the next phase without starting a new AI assistant session

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

### Subtree discipline

- Any git subtrees in /apps/_ or /packages/_ should NEVER! have their files modified, all changes needed in those directories must come from their upstream via a `git subtree pull`.

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

---

## Project Documentation

Docs live in `docs/`:

| Path                                               | Purpose                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `docs/features/`                                   | Phase task tracking — frontmatter + step checklists are the source of truth |
| `docs/initiatives/{initiative}/`                   | gstack initiative planning, discovery, and design review artifacts          |
| `docs/specs/{initiative}/`                         | Active superpowers implementation plans and specs for that initiative       |
| `docs/ideas/`                                      | Lightweight ADRs and idea capture                                           |
| `docs/STACK.md`, `ARCHITECTURE.md`, `CHANGELOG.md` | Reference docs                                                              |

**No automated GitHub issue sync.** Repository plan documents are the source of truth. GitHub Issues may be written manually from accepted initiatives and specs when external tracking is useful.

- Use gstack for initiative planning and store outputs in `docs/initiatives/{initiative}/`
- Use superpowers for implementation planning and store outputs in `docs/specs/{initiative}/`
- After merged changes complete the tasks defined by a spec implementation plan, move that spec file from `docs/specs/{initiative}/` to `docs/features/` to signal completion/history.
- Manual task after planning: write or update GitHub Issues from the accepted initiative/spec documents when issue tracking is needed
- TODO: Decide how GitHub/task-management state should be reconciled with repository plan documents without reintroducing automated issue sync

---

## Code Standards

### Git Conventions

- Branch naming: `feat/GH{n}-short-description`
- Commit messages: Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- NEVER commit directly to `main`; NEVER force push to `main`
- Always use a feature branch + pull request
- Every PR must include an updated feature doc in `docs/features/`

### Development Workflow

Work from a feature branch and one focused worktree. Read the active feature doc and any matching initiative/spec docs before implementation. When development starts or resumes, update `docs/PROJECT_STATUS.md` with the active spec, the skill being used, the current task, and the next action for that task or the next task. Update repository docs in the same PR as the code change.

---

## Feature Docs — Naming Convention

```
[{STATUS}]{ISSUE_REF}_{feature-slug}.md
```

- `STATUS`: `TODO` | `IN-PROGRESS` | `DONE` | `BLOCKED`
- `ISSUE_REF`: `P{n}` local plan, `GH{n}` only when a manually created GitHub Issue exists

---

## Planning Tools

Use gstack for initiative planning, product/design/architecture review, and discovery. Store retained gstack artifacts under `docs/initiatives/{initiative}/`.

Use superpowers for implementation planning and execution plans. Store retained superpowers plans/specs under `docs/specs/{initiative}/`.

When a spec's implementation tasks are completed and merged, move the completed spec to `docs/features/` as the completion record.

---

## Current Session Context

Read current status and progress from @docs/PROJECT_STATUS.md

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:

- Product ideas and initiative planning → use gstack
- Strategy, scope, architecture, design, and developer-experience review → use gstack
- Implementation planning → use superpowers and write specs under `docs/specs/{initiative}/`
