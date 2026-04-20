# /project:plan_project

> Run this command after /project:bootstrap to plan phases and sync them into
> GitHub Issues and the Project board.
>
> Use it to:
> - Create feature docs for new phases (if none exist or to add more)
> - Sync existing feature docs into GitHub Issues and the Project board
>
> Safe to re-run — it skips docs that already have a GitHub Issue
> (`issue` field is not null in frontmatter).

Read `CLAUDE.md` before doing anything.

---

## Step 1 — Verify GitHub CLI and Project Access

1. Confirm `gh` is authenticated: `gh auth status`
2. Confirm the repo remote is set: `gh repo view`
3. Check whether a GitHub Project board already exists for this repo:
   ```bash
   gh project list --owner {owner}
   ```
   The owner is the GitHub username or org from the `GitHub Repo` URL in `CLAUDE.md`.

If no project exists, create one:
```bash
gh project create --owner {owner} --title "{Project Name from CLAUDE.md}"
```
Then add a **Status** field:
```bash
gh project field-create {project-number} --owner {owner} --name "Status" \
  --data-type SINGLE_SELECT \
  --single-select-options "To Do,In Progress,Done,Blocked"
```

Record the project number for use in later steps.

Output findings, then STOP and wait for explicit approval.

---

## Step 2 — Create or Scan Feature Docs

List all `*.md` files in `docs/features/` excluding `_TEMPLATE.md`.

**If no feature docs exist (or the engineer wants to add a new phase):**

Ask the engineer what they want to build:
```
No feature docs found (or adding a new phase). What would you like to build?

Describe the deliverable — what it is, what it should do, and any constraints
or tech stack preferences. I'll draft a single feature doc for your review.
```

Wait for the engineer's response.

Draft a single phase feature doc proposal inline using `docs/features/_TEMPLATE.md`
as the format. Keep scope tight — one focused deliverable. Include:
- Phase number (next available: N)
- Slug, context, acceptance criteria (testable outcomes)
- 5–7 ordered steps

Output the draft, then ask:
```
Does this look right? Reply with changes, or say "approve" to create the file.
```

Once approved, create `docs/features/[TODO]P{n}_{feature-slug}.md`.

**If feature docs exist:**

Parse the frontmatter of each file and classify:
- **Needs Issue:** `issue` is null
- **Has Issue:** `issue` is not null (skip creation, verify Issue still open)
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

### 3a — Resolve Project Field IDs

Check `CLAUDE.md` for a `## GitHub Project IDs` section. If it exists and all
required IDs are present, use those cached values — skip the API fetch.

If the section is missing or incomplete, fetch from the API:
```bash
gh project field-list {project-number} --owner {owner} --format json
```

From the output, record:
- `status_field_id` — the ID of the Status field
- `todo_option_id` — the ID of the "To Do" option
- `in_progress_option_id` — the ID of the "In Progress" option
- `done_option_id` — the ID of the "Done" option

Write or update the `## GitHub Project IDs` section in `CLAUDE.md`:
```markdown
## GitHub Project IDs
<!-- project-number: {n} -->
<!-- project-id: {id} -->
<!-- status-field-id: {id} -->
<!-- todo-option-id: {id} -->
<!-- in-progress-option-id: {id} -->
<!-- done-option-id: {id} -->
```

### 3b — Determine Milestone Version

Based on the scope of the feature docs being synced, propose a semver milestone:

- `v0.1.0` — first working prototype, foundational scaffolding only
- `v0.x.0` — minor version bump for each new user-facing capability added
- `v0.x.y` — patch for fixes or non-user-facing improvements
- `v1.0.0` — first production-ready, fully deployed release

Consider what is already merged (check `git log` and existing `[DONE]` feature
docs) and what the new phases deliver. Suggest a version and explain why, then
ask the engineer to confirm or override:

```
Suggested milestone: v{X.Y.Z} — {one sentence rationale}

Confirm this version or provide an override before I create Issues.
```

Create the milestone once confirmed:
```bash
gh api repos/{owner}/{repo}/milestones -X POST \
  -f title="v{X.Y.Z}" \
  -f description="{one sentence rationale}"
```

### 3c — Create the Parent Issue

For each feature doc needing an Issue:

```bash
gh issue create \
  --title "Phase {n} — {Feature Name}" \
  --body "$(cat <<'EOF'
## Context
{content of ## Context section from feature doc}

## Acceptance Criteria
{content of ## Acceptance Criteria section from feature doc}

## Steps
{content of ## Steps section from feature doc}
EOF
)" \
  --label "phase-{n}" --label "feature" \
  --milestone "v{X.Y.Z}"
```

Create the `phase-{n}` and `feature` labels if they don't exist:
```bash
gh label create "phase-{n}" --color "0075ca"
gh label create "feature" --color "a2eeef"
```

### 3d — Create Step Issues and Link to Parent

For each checklist item in `## Steps`, create a linked issue:

```bash
gh issue create \
  --title "[Phase {n}] Step {i} — {step description, first ~60 chars}" \
  --body "Part of #{parent-issue-number}

{full step description from the checklist item}" \
  --label "phase-{n}" --label "step"
```

After all step issues are created, edit the parent issue body to replace the
`## Steps` plain checklist with a task list of issue references:

```bash
gh issue edit {parent-issue-number} --body "$(cat <<'EOF'
## Context
...

## Acceptance Criteria
...

## Steps
- [ ] Step 1 — {description} #{step-1-issue-number}
- [ ] Step 2 — {description} #{step-2-issue-number}
...
EOF
)"
```

### 3e — Update Feature Doc and Add to Project Board

After creating parent + step issues:

1. Update the feature doc frontmatter:
   - `issue: {parent-issue-number}`
2. Rename the file: replace `P{n}` with `GH{parent-issue-number}`
   e.g. `[TODO]P1_monorepo-setup.md` → `[TODO]GH1_monorepo-setup.md`
3. Add the parent Issue to the Project board:
   ```bash
   gh project item-add {project-number} --owner {owner} --url {parent-issue-url}
   ```
4. Set the item status to "To Do":
   ```bash
   # Get the item ID from the project board
   gh project item-list {project-number} --owner {owner} --format json
   # Set status to "To Do"
   gh project item-edit \
     --project-id {project-id} \
     --id {item-id} \
     --field-id {status-field-id} \
     --single-select-option-id {todo-option-id}
   ```

Process all docs before stopping.

After all Issues are created, commit the renamed and updated feature docs:
```bash
git add docs/features/ CLAUDE.md
git commit -m "docs: sync feature docs with GitHub Issues"
git push
```

Output a summary table:

| Phase | Feature | Parent Issue | Step Issues | Milestone | Project Board |
|---|---|---|---|---|---|
| 1 | Monorepo Setup | #1 | #2, #3, #4, #5, #6, #7 | v0.1.0 | Added (To Do) |

Then STOP and wait for explicit approval.

---

## Step 4 — Update CLAUDE.md

Skip this step if the `GitHub Project Board` URL is already filled in `CLAUDE.md`.

1. Update the `GitHub Project Board` URL field in `CLAUDE.md` with the actual project board URL
2. Commit the update:
   ```bash
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
