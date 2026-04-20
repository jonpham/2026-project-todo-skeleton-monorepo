# /project:populate_project

> Run this command after /project:bootstrap to sync docs/features/*.md into
> GitHub Issues, Sub-Issues, and the Project board. Safe to re-run — it skips
> docs that already have a GitHub Issue (issue field is not null in frontmatter).

Read `CLAUDE.md` before doing anything.

---

## Step 1 — Verify GitHub CLI and Project Access

1. Confirm `gh` is authenticated: `gh auth status`
2. Confirm the repo remote is set: `gh repo view`
3. Check whether a GitHub Project board already exists for this repo by running:
   `gh project list --owner {owner}`

If no project exists, create one:
- Name: value of `Project Name` from `CLAUDE.md`
- Add fields: **Status** (single-select: `To Do`, `In Progress`, `Done`, `Blocked`)

Record the project number for use in later steps.

Output findings, then STOP and wait for explicit approval.

---

## Step 2 — Scan Feature Docs

1. List all `*.md` files in `docs/features/` excluding `_TEMPLATE.md`
2. Parse the frontmatter of each file
3. Classify each doc:
   - **Needs Issue:** `issue` is null
   - **Has Issue:** `issue` is not null (skip creation, but verify Issue still exists)
   - **Invalid:** missing required frontmatter fields — flag and skip

Output a table:

| File | Phase | Status | Issue | Action |
|---|---|---|---|---|
| [TODO]P1_monorepo-setup.md | 1 | TODO | null | Create Issue |
| [TODO]GH4_vite-app-bootstrap.md | 2 | TODO | 4 | Skip (exists) |

Then STOP and wait for explicit approval before creating any Issues.

---

## Step 3 — Create GitHub Issues

For each doc classified as **Needs Issue**, in phase order:

1. Create a parent GitHub Issue:
   - **Title:** `Phase {n} — {Feature Name}` (from the `# Phase N —` heading in the doc)
   - **Body:** Include the full `## Context`, `## Acceptance Criteria`, and
     `## Steps` sections from the feature doc verbatim
   - **Labels:** Create and apply `phase-{n}` label if it doesn't exist.
     Also apply `feature` label.
   - **Milestone:** Create milestone `MVP` if it doesn't exist, assign issue to it

2. For each checklist item in the `## Steps` section, create a Sub-Issue:
   - **Title:** `[Phase {n}] Step {i} — {step description}` (first ~60 chars)
   - **Body:** Full step description from the checklist item
   - **Labels:** `phase-{n}`, `step`
   - **Parent:** Link to the parent Issue using GitHub's sub-issue relationship
     (`gh issue create` then `gh api` to set parent)

3. After creating parent + sub-issues, update the feature doc:
   - Set `issue: {github-issue-number}` in frontmatter
   - Rename the file: replace `P{n}` with `GH{github-issue-number}`
     e.g. `[TODO]P1_monorepo-setup.md` → `[TODO]GH1_monorepo-setup.md`

4. Add the parent Issue to the GitHub Project board in the `To Do` column:
   `gh project item-add {project-number} --owner {owner} --url {issue-url}`

Process all docs before stopping.

After all Issues are created, commit the renamed and updated feature docs:
```
git add docs/features/
git commit -m "docs: sync feature docs with GitHub Issues"
git push
```

Output a summary table:

| Phase | Feature | Parent Issue | Sub-Issues | Project Board |
|---|---|---|---|---|
| 1 | Monorepo Setup | #1 | #2, #3, #4, #5, #6, #7 | Added to To Do |

Then STOP and wait for explicit approval.

---

## Step 4 — Update CLAUDE.md
0. Skip step if Project URL already in `CLAUDE.md` file
1. Update the `GitHub Project Board` URL field in `CLAUDE.md` with the actual
   project board URL
2. Commit the update:
   ```
   git add CLAUDE.md
   git commit -m "docs: update CLAUDE.md with project board URL"
   git push
   ```

Output the project board URL and confirm the commit was pushed.

Then STOP. Output:
```
Project board is ready. All feature docs are synced with GitHub Issues.
Run /project:develop to begin development on the next phase.
```
