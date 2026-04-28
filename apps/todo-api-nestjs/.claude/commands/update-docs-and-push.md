# /project:update-docs-and-push

> Run this command when you are ready to push the current feature branch to GitHub.
> It reviews and updates all project documentation to reflect the current state,
> commits any doc updates, then pushes the branch.

Read `CLAUDE.md` fully before doing anything.

---

## Step 1 — Ensure All Changes Are Committed

Run:

```bash
git status
git diff
git log --oneline -10
```

If there are any unstaged or uncommitted implementation changes or active feature doc updates, run `/project:update-status-and-commit` first before proceeding.

If the working tree is clean, continue to Step 2.

---

## Step 2 — Review and Update Project Docs

Read each of the following files and determine if they need updating based on what was implemented since the last push. Update only what is outdated or missing — do not rewrite sections that are still accurate.

### `docs/features/[IN-PROGRESS]P{n}_{slug}.md` (Active Feature Doc)
- Check off any completed steps in `## Steps` not yet marked
- Add a summary of changes made in the `## Change Log` table:
  | {today's date} | Branch ready | In Progress → Done | {brief summary of what was implemented} |
- Record any new non-obvious decisions in `## Assumptions`

### `docs/CHANGELOG.md`
Add a new entry under the appropriate date or `## Unreleased` for work completed:

```markdown
## [YYYY-MM-DD]

### Phase N — Feature Name
- Brief description of what was implemented
- Notable decisions or deviations from the original plan
```

### `docs/STACK.md`
Update if: new tools, libraries, or versions were added; dev commands changed; coding conventions were established that aren't documented yet.

### `docs/ARCHITECTURE.md`
Update if: new directories or files were created; the repo structure changed significantly.

### `CLAUDE.md`
Update if: the working agreement needs a correction; GitHub Repo URLs were established and aren't filled in yet; session context is stale.

### `README.md`
Update if: setup instructions changed; new commands were added; the project description no longer reflects reality.

---

## Step 3 — Commit Doc Updates

If any docs were updated:

```bash
git add docs/ CLAUDE.md README.md
git commit -m "docs: update project docs for Phase {n} — {feature-slug}"
```

If no docs needed updating, skip this step.

---

## Step 4 — Push the Branch

```bash
git push -u origin {current-branch-name}
```

If the branch already has an upstream, use `git push` without `-u`.

Output:

```
Pushed: {branch-name}
Docs updated: {list of files changed, or "None"}
Next: Continue development or begin next phase
```
