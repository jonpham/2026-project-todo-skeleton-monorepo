# 2026-PROJECT-TODO-SKELETON-MONOREPO

This project is expected to use Claude Code Guided Development.
|Step| Claude Command | Description |
|---|---|---|
| 1 | `/project:bootstrap` |Initialize the Project|
| 2 | `/project:populate_project` |Plan your next features and populate this repo's GitHub Project with issues|
| 3 | `/project:develop` |Iteratively develop according to plan|
   
## Feature Documentation & Workflow

### Feature Docs — Source of Truth

All planned and completed work lives in `docs/features/`. Every phase has one
markdown file tracking context, acceptance criteria, implementation steps, test
strategy, assumptions, and a change log. The GitHub Project board and Issues are
a reflection of these files — not the other way around.

**Naming convention:**
```
[{STATUS}]{ISSUE_REF}_{feature-slug}.md

[TODO]P1_monorepo-setup.md          # Planned, no Issue yet
[TODO]GH1_monorepo-setup.md         # Issue created
[IN-PROGRESS]GH1_monorepo-setup.md  # In development
[DONE]GH1_monorepo-setup.md         # Merged
```

Frontmatter fields (`status`, `issue`, `branch`, `pr`, `completed_at`) must be
kept current. The filename must reflect the current status at all times.

***

### Pull Request Requirements

Every PR **must** include an update to the corresponding `docs/features/` file:

- Completed steps checked off in `## Steps`
- Decisions recorded in `## Assumptions`
- New row added to `## Change Log`
- Frontmatter and filename updated to reflect new status

The PR template enforces this checklist. PRs missing a feature doc update will
not be approved.

***

### Branch & Commit Conventions

- **Branches:** `feat/{#}-short-description`
- **Commits:** Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`
- **Never commit directly to `main`** — all work goes through a PR
- Husky pre-commit hook runs ESLint + Prettier; failing commits are rejected

***

### Claude Code Commands

Three slash commands in `.claude/commands/` automate the workflow:

| Command | Purpose |
|---|---|
| `/project:bootstrap` | One-time repo init — Git, GitHub repo, feature doc check |
| `/project:populate_project` | Syncs feature docs → GitHub Issues + Project board |
| `/project:develop` | Starts next phase — creates branch, executes steps one at a time, opens PR |

Commands follow the working agreement: one step at a time, stopping for engineer
approval before proceeding. Optional but strongly recommended.
