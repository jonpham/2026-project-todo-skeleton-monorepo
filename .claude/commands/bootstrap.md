# /project:bootstrap
> Requires CLAUDE.md to have been populated using associated TEMPLATE
> One-time command. Run this once per new repository to initialize Git,
> create the GitHub repo, and set up the GitHub Project board shell.
> After this command completes, run /project:populate_project to sync
> feature docs into GitHub Issues.

---
## Step 0 — Scaffold Project Templates
Read `CLAUDE.md` before doing anything. All decisions must align with the working agreement and tech stack defined there.

If `CLAUDE.md` and `README.md` are not at the repo root, flag this as an error. 

Run the following to create starter files from your global templates:

```bash
cp ~/.claude/templates/CLAUDE.md.template ./CLAUDE.md
cp ~/.claude/templates/README.md.template ./README.md
```

If `~/.claude/templates/` does not exist or templates are missing, create the files from the inline content below instead (see Fallback Templates section).

Output to engineer:
> CLAUDE.md and README.md not found, created ✅ .
> Open both files and fill in every `[BRACKETED]` placeholder before continuing.
> Re-Run "/project:bootstrap" when done.


## Step 1 — Verify Prerequisites

Check that the project tools indicated in `Project Environment Prerequisites` of `CLAUDE.md` are available. 
Do not install anything.

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

**If feature docs exist:** Output a list of the files found, then STOP.
Output this message:
```
Feature docs found. Run /project:populate_project to create GitHub Issues
and the Project board from these docs.
```

**If no feature docs exist:** Enter plan mode. Do not create any files yet.
Propose a phase plan for this project based on the project overview in `CLAUDE.md`.
Structure the plan using the phase groupings defined in the working agreement:
- One feature doc per phase
- Each phase has a `## Steps` checklist
- Use the `_TEMPLATE.md` in `docs/features/` as the format

Present the proposed plan and ask for approval before creating any files.
Once approved, create the feature doc files using the naming convention:
`[TODO]P{n}_{feature-slug}.md`

Then STOP and output:
```
Feature docs created. Review them in docs/features/, then run
/project:populate_project to create GitHub Issues and the Project board.
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