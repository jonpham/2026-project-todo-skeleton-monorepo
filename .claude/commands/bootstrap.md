# /project:bootstrap

> [!WARNING]
> **DEPRECATED.** Do not use this command.
> Project initialization is handled by gstack (`/plan-eng-review`, `/autoplan`), GSD (`/gsd-new-project`), or superpowers equivalents.
> GitHub repo and board setup should be done manually or via those tools.

---
> One-time command. Run once per new repository to initialize Git,
> create the GitHub repo, and set up the GitHub Project board shell.
> After this completes, run `/project:plan_project` to sync feature docs into GitHub Issues.

---
## Step 0 — Verify Project Templates

Check whether `CLAUDE.md` and `README.md` exist at the repo root.

**If both files exist:**
Read `CLAUDE.md` fully. All decisions must align with the working agreement and tech stack defined there. Continue to Step 1.

**If either file is missing:**
Create the missing file(s) using global templates if available:

```bash
cp ~/.claude/templates/CLAUDE.md.template ./CLAUDE.md   # if missing
cp ~/.claude/templates/README.md.template ./README.md   # if missing
```

If `~/.claude/templates/` does not exist or templates are missing, create the files from the inline content in the Fallback Templates section at the bottom of this command.

Then STOP and output:
```
CLAUDE.md and/or README.md created from template.
Open both files and fill in every [BRACKETED] placeholder before continuing.
Re-run /project:bootstrap when done.
```

Do not proceed to Step 1 until both files exist and placeholders are filled in.


## Step 1 — Verify Prerequisites

Check that the following tools are available. Do not install anything.

- `git`
- `gh` (GitHub CLI — required for repo and project board creation)
- `docker`

Output a checklist with the installed version of each tool, or MISSING if
not found.

If `gh` is MISSING, stop and output these installation instructions:
```
brew install gh
gh auth login
```
Do not proceed until `gh` is available and authenticated.

Once `gh` is confirmed present, verify the token has the required scopes by
checking the output of `gh auth status`. The token scopes line must include
both `read:project` and `project`.

If either scope is missing, stop and output:
```
gh token is missing required scopes.
Run: gh auth refresh -s read:project -s project
Then re-run /project:bootstrap.
```

Then STOP and wait for explicit approval before proceeding.

---

## Step 2 — Initialize Git Repository

1. If a `.git` directory does not already exist, run `git init`
2. If `.gitignore` does not exist, create one for a `Tech Stack & Toolchain` project as described in `CLAUDE.md`:
   For example for a a Node.js TypeScript monorepo
   (cover: node_modules, dist, .turbo, .env files, OS files, editor files)
3. If `README.md` does not exist, create one using the project name and purpose from `CLAUDE.md`

Output the summary format required by the Working Agreement, then STOP and
wait for explicit approval.

---

## Step 3 — Create GitHub Repository

1. Check whether a GitHub remote named `origin` already exists (`git remote -v`)
2. If no remote exists:
   - Run `gh repo create {project-name} --private --source=. --remote=origin`
   - Use the project name from `CLAUDE.md`
3. If a remote already exists, verify it is reachable (`gh repo view`) and skip creation
4. Update the `GitHub Repo` field in `CLAUDE.md` with the repo URL

Output the repo URL, then STOP and wait for explicit approval.

---

## Step 4 — Check for Feature Docs

1. Check whether `docs/features/` exists and contains any `*.md` files
   (excluding `_TEMPLATE.md`)
2. List any feature docs found

Then STOP and output one of the following:

**If feature docs were found:**
```
Bootstrap complete.

Feature docs found:
  - {list each [STATUS]P{n}_{slug}.md file}

Run /project:plan_project to create GitHub Issues and the Project board
from these docs, or to add new phases.
```

**If no feature docs were found:**
```
Bootstrap complete.

No feature docs found yet.

Run /project:plan_project to define your first phase and set up the
GitHub Project board.
```

## Fallback Templates

### CLAUDE.md (create if template missing)
```
# [PROJECT NAME] — Claude Code Configuration

## Project Context
- **Stack:** [e.g. TypeScript, pnpm workspaces, Turborepo]
- **Repo type:** [monorepo / single package]
- **Primary engineer:** [name]

## Working Agreements
- One step at a time. Stop and output `WAITING FOR APPROVAL` after each step.
- State numbered assumptions before implementing.
- After each step: list changed files, assumptions, verification commands, next step.
- Feature doc updated and committed with every PR.
- Never start next phase without a new Claude Code session.

## Architecture Notes
[Fill in after bootstrap completes]
```

### README.md (create if template missing)
```
# [PROJECT NAME]

## Overview
[What this project does in 2-3 sentences]

## Setup
[How to install and run locally]

## Workflow
This project uses a Claude Code workflow. See `.claude/commands/` for
available commands and `docs/features/` for feature specs.

## Contributing
1. Pick an Issue from the GitHub Project board
2. Start a new Claude Code session
3. Run `/project:develop`
4. Follow the step-gated approval process
```