# /project:plan_project

> [!WARNING]
> **DEPRECATED.** Do not use this command.
> It burns tokens on GitHub API calls (issues, labels, milestones, project board) that are no longer part of the workflow.
> Use instead: `/plan-eng-review` or `/autoplan` (gstack), `/gsd-plan-phase` (GSD/superpowers).
> Commit planning outputs directly to `docs/initiatives/{name}/`.

---

> Run this command after /project:bootstrap to plan phases and sync them into
> GitHub Issues and the Project board.
>
> Use it to:
>
> - Create feature docs for new phases (if none exist or to add more)
> - Sync existing feature docs into GitHub Issues and the Project board
>
> Safe to re-run — it skips docs that already have a GitHub Issue
> (`issue` field is not null in frontmatter).

Read `CLAUDE.md` before doing anything.

## GitHub MCP Server Dependency

This command uses the **GitHub MCP Server** for issue creation and updates.
MCP tools return structured JSON — no URL parsing or `--json` workarounds needed.

Install if not already connected:

```
claude mcp add-json github '{"type":"stdio","command":"npx","args":["-y","@github/mcp-server"],"env":{"GITHUB_PERSONAL_ACCESS_TOKEN":"<YOUR_GITHUB_PAT>"}}'
```

Operations that remain on `gh` CLI (no MCP equivalent):

- Project board mutations: `gh project item-add`, `gh project item-edit`
- Label creation: `gh label create`
- Milestone creation: `gh api repos/.../milestones`

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
gh project create --owner {owner} --title "{Project Name from CLAUDE.md}" --format json
```

GitHub Projects v2 automatically creates a `Status` field with options `Todo`,
`In Progress`, and `Done`. Do NOT attempt to create a new Status field — it will
fail with a "Name has already been taken" error.

Instead, add the missing `Blocked` option to the existing Status field using
the `updateProjectV2Field` GraphQL mutation. First get the Status field ID:

```bash
gh project field-list {project-number} --owner {owner} --format json
```

Then update the field, preserving existing options and appending Blocked:

```bash
gh api graphql -f query='
mutation {
  updateProjectV2Field(input: {
    fieldId: "{status-field-id}"
    singleSelectOptions: [
      { name: "Todo", color: GRAY, description: "" }
      { name: "In Progress", color: BLUE, description: "" }
      { name: "Done", color: GREEN, description: "" }
      { name: "Blocked", color: RED, description: "Blocked by a dependency or external factor" }
    ]
  }) {
    projectV2Field {
      ... on ProjectV2SingleSelectField {
        id
        options { id name }
      }
    }
  }
}'
```

Note: updating the options list replaces all options and assigns new IDs — record
the new IDs from the mutation response for use in subsequent steps.

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

For each doc that needs an issue, also check `upstream_repos` in frontmatter:

- **Monorepo-only:** `upstream_repos` is null — issue goes to the platform monorepo
- **Cross-repo:** `upstream_repos` is set — upstream issues must be created first in that
  repo, then a system-level parent issue is created in the monorepo referencing them

Output a table:

| File                            | Phase | Status | Issue | Upstream Repo                        | Action                            |
| ------------------------------- | ----- | ------ | ----- | ------------------------------------ | --------------------------------- |
| [TODO]P1_monorepo-setup.md      | 1     | TODO   | null  | null                                 | Create Issue                      |
| [TODO]GH4_vite-app-bootstrap.md | 2     | TODO   | 4     | null                                 | Skip (exists)                     |
| [TODO]P8_nestjs-parity.md       | 8     | TODO   | null  | jonpham/2026-project-todo-api-nestjs | Create upstream + monorepo parent |

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

Capture the `number` field from the JSON response — this is the milestone number
required by the `mcp__github__issue_write` `milestone` parameter in step 3c.

### 3-pre — Create Shared Labels (sequential, runs once)

Create the shared labels before spawning parallel agents to avoid race conditions:

```bash
gh label create "feature" --color "a2eeef" --description "Phase-level feature" --force
gh label create "step" --color "e4e669" --description "Step-level sub-issue" --force
```

Using `--force` makes these idempotent — safe to re-run if they already exist.

---

### 3-upstream — Create Upstream Repo Issues (sequential, before 3-parallel)

For each feature doc where `upstream_repos` is set in frontmatter, create issues
in the upstream repo **before** creating the monorepo parent. This preserves the
UPSTREAM FIRST principle: upstream changes tracked in their own repo, referenced
from the platform monorepo.

**For each upstream step or group of upstream steps:**

1. Identify which steps in `## Steps` are upstream-destined. These are steps
   explicitly marked as "upstream-first" in the doc's Technical Notes, or steps
   that modify code owned by the upstream repo (e.g. NestJS API changes when
   `upstream_repo: jonpham/2026-project-todo-api-nestjs`).

2. Create a label in the upstream repo if it doesn't exist:

   ```bash
   gh label create "from-monorepo" --color "f9d0c4" \
     --description "Tracked from platform monorepo" \
     --repo {upstream_repo} --force
   ```

3. Create an issue in the upstream repo using `mcp__github__issue_write`:

   ```
   method: "create"
   owner: {upstream_owner}   ← e.g. "jonpham"
   repo: {upstream_repo_name} ← e.g. "todo-api-nestjs"
   title: "{upstream feature name}"
   body: |
     ## Context
     Tracked from platform monorepo phase {n} — {monorepo_repo}.

     {description of the upstream-specific work}

     ## Steps
     {upstream-only steps from the feature doc}

     ## Acceptance Criteria
     {upstream-specific criteria}

     ## Cross-repo reference
     System-level tracking issue: {monorepo_repo} (to be linked after monorepo issue creation)
   labels: ["from-monorepo"]
   ```

4. Capture the upstream issue number from the response `.number`.

5. Update the feature doc frontmatter:
   - Append to `upstream_issues`: `"{upstream_repo}#{issue_number}"`

6. Commit the frontmatter update:
   ```bash
   git add docs/features/
   git commit -m "docs: record upstream issue reference in feature doc"
   ```

After all upstream issues are created, proceed to 3-parallel with the upstream
issue numbers available for embedding in monorepo parent issue bodies.

---

### 3-parallel — Per-Doc Issue Creation

Once 3a, 3b, and the shared label setup above are complete, spawn one foreground
subagent per feature doc that needs an Issue. **Spawn all in a single message**
so they run simultaneously.

**Subagent prompt template (fill in values for each doc):**

> Read `.claude/commands/plan_project.md` for full context on the workflow.
> Execute only steps 3c, 3d, and 3e for this one doc:
>
> - Feature doc: `docs/features/{filename}`
> - Phase: {n} | Feature: {Feature Name}
> - Milestone: `v{X.Y.Z}` (already created — do not recreate it)
>
> Project IDs already resolved — use these, do not re-fetch:
>
> - project-number: {n}, project-id: {id}
> - status-field-id: {id}, todo-option-id: {id}, owner: {owner}
>
> Labels `feature` and `step` already exist — do not recreate them.
> Create only the `phase-{n}` label for this doc's phase.
>
> Output one line when done: `DONE: {filename} → Issue #{n}, sub-issues: #{x}, #{y}`

Wait for **all** subagents to complete, then the main agent (not a subagent) commits:

```bash
git add docs/features/ CLAUDE.md
git commit -m "docs: sync feature docs with GitHub Issues"
```

Then spawn a foreground subagent to review docs and push:

> Read and follow `.claude/commands/update-docs-and-push.md` exactly.
> Context: just synced feature docs with GitHub Issues. Do not stop for approval.
> Output the `Pushed:` summary when done.

Wait for the subagent to complete, then output the summary table and STOP.

---

### 3c — Create the Parent Issue _(executed by per-doc subagents)_

For this feature doc, use the `mcp__github__issue_write` tool:

```
method: "create"
owner: {owner}
repo: {repo}
title: "Phase {n} — {Feature Name}"
body: |
  ## Context
  {content of ## Context section from feature doc}

  ## Acceptance Criteria
  {content of ## Acceptance Criteria section from feature doc}

  ## Steps
  {content of ## Steps section from feature doc}

  ## Upstream Issues
  {if upstream_issues is non-empty, list each reference:}
  - {upstream_repo}#{upstream_issue_number} — {one-line description of that upstream issue}
  {omit this section entirely if upstream_issues is empty}
labels: ["feature"]
milestone: {milestone-number}   ← integer from Step 3b response
```

The response includes the issue number as `.number` — no URL parsing needed.

### 3d — Identify Steps That Warrant Sub-Issues _(executed by per-doc subagents)_

Not every step needs a GitHub sub-issue. Only create a sub-issue for steps that
would produce significant, independently reviewable changes — specifically those
that **add or update tests** in the codebase. These are the steps worth tracking
on a branch of their own.

For each step in `## Steps`, evaluate:

- **Create a sub-issue if:** the step adds new source files with co-located
  tests, adds a new Storybook story, or adds/updates Playwright E2E tests
- **Skip sub-issue if:** the step is purely configuration, installs packages,
  creates boilerplate without tests, or is a one-liner that will be committed
  alongside a larger step

For steps that qualify, use the `mcp__github__issue_write` tool:

```
method: "create"
owner: {owner}
repo: {repo}
title: "[Phase {n}] Step {i} — {step description, first ~60 chars}"
body: |
  Part of #{parent-issue-number}

  {full step description from the checklist item}
labels: ["step"]
```

The response includes the sub-issue number as `.number`.

After creating sub-issues, update the parent issue body to add issue references
for sub-issued steps. Use the `mcp__github__issue_write` tool:

```
method: "update"
owner: {owner}
repo: {repo}
issue_number: {parent-issue-number}
body: |
  ## Context
  ...

  ## Acceptance Criteria
  ...

  ## Steps
  - [ ] Step 1 — {description}              ← no sub-issue (config only)
  - [ ] Step 2 — {description} #{sub-issue} ← sub-issue (adds tests)
  ...
```

### 3e — Update Feature Doc and Add to Project Board _(executed by per-doc subagents)_

After creating parent + sub-issues:

1. Update the feature doc frontmatter:
   - `issue: {parent-issue-number}`
   - `upstream_issues: [{upstream_repo}#{upstream_issue_number}, ...]` — if any
     upstream issues were created in 3-upstream; otherwise leave as `[]`
2. Rename the file: replace `P{n}` with `GH{parent-issue-number}`
   e.g. `[TODO]P1_monorepo-setup.md` → `[TODO]GH1_monorepo-setup.md`
3. Add the parent Issue to the Project board and capture the item ID:
   ```bash
   # --format json returns the full item object; extract id with python3 or jq
   gh project item-add {project-number} --owner {owner} \
     --url {parent-issue-url} --format json \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
   ```
4. Set the item status to "To Do" using the captured item ID:
   ```bash
   gh project item-edit \
     --project-id {project-id} \
     --id {item-id} \
     --field-id {status-field-id} \
     --single-select-option-id {todo-option-id}
   ```

Output a summary table:

| Phase | Feature        | Parent Issue | Step Issues            | Milestone | Project Board |
| ----- | -------------- | ------------ | ---------------------- | --------- | ------------- |
| 1     | Monorepo Setup | #1           | #2, #3, #4, #5, #6, #7 | v0.1.0    | Added (To Do) |

Then STOP and wait for explicit approval.

---

## Step 4 — Update CLAUDE.md

Skip this step if the `GitHub Project Board` URL is already filled in `CLAUDE.md`.

1. Update the `GitHub Project Board` URL field in `CLAUDE.md` with the actual project board URL
2. Commit and push:

   ```bash
   git add CLAUDE.md
   git commit -m "docs: update CLAUDE.md with project board URL"
   ```

   Then spawn a foreground subagent:

   > Read and follow `.claude/commands/update-docs-and-push.md` exactly.
   > Context: updated CLAUDE.md with project board URL. Do not stop for approval.
   > Output the `Pushed:` summary when done.

Output the project board URL and confirm the commit was pushed.

Then STOP. Output:

```
Project board is ready. All feature docs are synced with GitHub Issues.
Run /project:develop to begin development on the next phase.
```
