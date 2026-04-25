# /project:develop

> Run this command to begin or resume development on a phase.
> This command respects the Working Agreement in CLAUDE.md strictly.
> It executes one step at a time by default, stopping for approval between
> each step unless `step_gating: false` is set in the active feature doc's
> frontmatter.

Read `CLAUDE.md` fully before doing anything.

---

## Step 0 — PR Awareness Check

Run this check every time `/project:develop` is invoked, before selecting an issue.

### 0a — Check for open PRs

```bash
gh pr list --repo {owner}/{repo} --state open --json number,title,url,headRefName
```

If any open PRs exist:

1. Identify whether the next planned phase depends on an unmerged PR (e.g. Phase 4
   cannot start until Phase 3's feat branch is merged into `main`). Phases are
   sequential unless the feature doc explicitly states otherwise.

2. Present findings:

   ```
   ⚠️  Open PR(s) detected:
     - PR #{n}: {title} ({url})

   The next phase {does / does not} depend on this PR being merged first.

   Options:
     [1] Wait — I'll merge the PR then re-run /project:develop
     [2] Proceed anyway — the next phase is independent of the open PR
   ```

3. Wait for the engineer's response before continuing.

### 0b — Check for stale local branches

```bash
git fetch --dry-run --prune 2>&1
```

If the output shows any branches that would be pruned (i.e. deleted on the remote
and merged to `main`), ask:

```
The following local branches track remotes that have been deleted (merged to main):
  - {branch-name}

Can I prune them?  [y/n]
```

If yes: `git fetch --prune`
If no: skip.

---

## Step 1 — Select the Active Issue

1. Query the GitHub Project board for Issues in the `To Do` column:
   `gh project item-list {project-number} --owner {owner} --format json`

2. Identify the lowest-phase `To Do` Issue (by `phase` frontmatter in its
   corresponding feature doc)

3. Present the candidate Issue to the engineer:

   ```
   Next issue to develop:
   Issue #N — Phase {n}: {Feature Name}
   Phase: {n}
   Steps: {count} steps defined

   Type the Issue number to confirm, enter a different Issue number to
   override, or type 'cancel' to abort.
   ```

4. Wait for the engineer's response before proceeding.

5. Once an Issue number is provided, read the corresponding feature doc and
   output a brief prompt to review it:

   ```
   Phase {n} — {Feature Name}
   Doc: docs/features/{filename}
   Criteria: {count} | Steps: {count}

   Review the feature doc before we begin. Would you like to update the plan,
   or say "proceed" to start development as-is.
   ```

6. Wait for the engineer's response.
   - If they request changes: apply them to the feature doc and confirm before
     continuing
   - If they say "proceed": continue to Step 2

---

## Step 2 — Set Up the Feature Branch

Once the engineer confirms the plan:

1. Create a feature branch:
   `git checkout -b feat/GH{issue-number}-{feature-slug}`
   The slug comes from the `slug` field in the feature doc's frontmatter.

2. Update the active feature doc frontmatter:
   - `status: IN-PROGRESS`
   - `branch: feat/GH{issue-number}-{feature-slug}`

3. Rename the feature doc file to reflect the new status:
   e.g. `[TODO]GH4_vite-app-bootstrap.md` → `[IN-PROGRESS]GH4_vite-app-bootstrap.md`

4. Update the GitHub Issue status on the Project board to `In Progress`.
   First check `CLAUDE.md` for a `## GitHub Project IDs` section. If present,
   use those cached values. If missing, fetch:

   ```bash
   gh project field-list {project-number} --owner {owner} --format json
   ```

   Then get the item ID for this Issue:

   ```bash
   gh project item-list {project-number} --owner {owner} --format json
   ```

   Then update the status:

   ```bash
   gh project item-edit \
     --project-id {project-id} \
     --id {item-id} \
     --field-id {status-field-id} \
     --single-select-option-id {in-progress-option-id}
   ```

5. Commit the feature doc update and push the branch:
   ```
   git add docs/features/
   git commit -m "docs(GH{n}): begin phase {n} — {feature-slug}"
   ```
   Then run `/project:update-docs-and-push` to review and update all project
   docs before pushing to the remote.

Output the branch name and Issue URL, then STOP and wait for explicit approval
before beginning implementation.

---

## Step 3 — Determine Step Gating Mode

Read the `step_gating` field from the active feature doc's frontmatter:

- `step_gating: true` (default) — complete one step, stop, wait for approval,
  repeat for each step
- `step_gating: false` — complete all steps sequentially without stopping,
  then stop at the phase boundary for approval

Announce the mode before beginning:

```
Step gating: ENABLED — I will stop after each step for your approval.
```

or

```
Step gating: DISABLED — I will complete all steps, then stop for your approval.
```

---

## Step 4 — Execute Steps

Find the `## Steps` checklist in the active feature doc. Identify the first
unchecked step (to support resuming a partially complete phase).

For each unchecked step:

### 4a — Evaluate Step Size and Sub-Issue

Before implementing, assess the scope of the step: how many files will change,
whether new tests are involved, and whether the diff would be independently
reviewable.

**If a sub-issue is already linked to this step** (e.g. `- [ ] Step 3 — ... #{n}`):
Always ask the engineer how to proceed, including your assessment of the step's
size as context:

```
Step {i} has a linked sub-issue (#{n}).

Assessment: {one sentence on scope — e.g. "adds 3 new components with
co-located tests" or "single config file, no tests"}

How would you like to proceed?
  [1] Create a task/GH{sub-issue-number} branch and open a PR into the
      feature branch
  [2] Implement directly on the feature branch and close #{n}
```

Wait for the engineer's response before doing anything.

If [1]: create and checkout `task/GH{sub-issue-number}-{brief-slug}` off the
current feature branch, then implement on it. After verifying, open a PR from
`task/*` → `feat/*`:

```bash
TASK_PR_URL=$(gh pr create \
  --title "task(GH{sub-issue-number}): {step description}" \
  --body "Part of #{parent-issue-number}

{brief description of what was implemented}" \
  --base feat/GH{parent-issue-number}-{feature-slug})
echo $TASK_PR_URL
```

Note: `Closes #n` in a PR that merges into a non-default branch does NOT
auto-close the issue. After the task PR is merged, explicitly close the
sub-issue and switch back to the feature branch:

```bash
gh issue close {sub-issue-number} \
  --comment "Resolved in task PR: {TASK_PR_URL}"
git checkout feat/GH{parent-issue-number}-{feature-slug}
git pull
```

If [2]: implement on the feature branch, then explicitly close the sub-issue:

```bash
gh issue close {sub-issue-number} \
  --comment "Implemented directly on feat/GH{parent-issue-number} — change was small enough to not warrant a separate branch"
```

**If no sub-issue is linked**:

- If the step is large enough to warrant its own branch: propose one:
  ```
  Step {i} looks significant enough for a task branch (adds tests / multiple
  new files). Create a sub-issue and task/GH* branch for it?
  ```
  If the engineer approves:
  1. Create the sub-issue:
     ```bash
     gh issue create \
       --title "[Phase {n}] Step {i} — {step description, first ~60 chars}" \
       --body "Part of #{parent-issue-number}
     {full step description}" \
       --label "phase-{n}" --label "step"
     ```
  2. Update the feature doc step line to reference the new issue number
  3. Create and checkout the task branch:
     ```bash
     git checkout -b task/GH{sub-issue-number}-{brief-slug}
     ```
- If the step is small: implement directly on the feature branch

After a task branch is merged into the feature branch, switch back and pull:

```bash
git checkout feat/GH{parent-issue-number}-{feature-slug}
git pull
```

### 4b — Implement the Step

Implement exactly what the step describes. Do not implement anything from
future steps, even if it seems logical to do so.

**UI components:** After the component's own unit tests pass, also wire it into
the nearest live parent (`App.tsx` or equivalent) — even as a placeholder if
sibling components don't exist yet. Add a Storybook play story or a brief E2E
assertion demonstrating the component in app context. Commit this as part of
the same step.

### 4c — Verify the Step

Run the verification commands appropriate to what was just built:

- If code was added: run lint and test scoped to the changed package:
  ```bash
  pnpm --filter {package-name} lint
  pnpm --filter {package-name} test
  ```
  The package name matches the `name` field in the package's `package.json`
  (e.g. `todo-web`). Run from the repo root.
- If a new component was added: confirm Storybook story exists and renders
- If E2E-relevant behavior was added: run `pnpm test:e2e`

If any verification fails, fix it before marking the step complete.
Do not move to the next step with a failing test.

### 4d — Update the Feature Doc

1. Check off the completed step in the `## Steps` checklist
2. Append any non-obvious decisions to the `## Assumptions` section
3. Spawn a foreground subagent with this prompt:

   > Read and follow `.claude/commands/update-status-and-commit.md` exactly.
   > Context: active feature doc is `{filename}`, step just completed is Step {i} — {description},
   > modified files are `{list from 4b/4c}`. Do not stop for approval. Output the `Committed:` summary when done.

   Wait for the subagent to complete before continuing to step 4e.

### 4e — Output the Working Agreement Summary

Output exactly:

```
✅ Step {i} complete

Changed files:
  - {file 1}
  - {file 2}

Assumptions made:
  - {assumption 1, or "None"}

Verify locally:
  {exact command(s) to run}

Next step: {one sentence describing Step i+1}
```

### 4f — Gate Check

If `step_gating: true`:
STOP. Do not proceed until the engineer types `proceed` or `next`.

If `step_gating: false`:
Continue immediately to the next unchecked step.

Repeat Steps 4a–4f for each remaining unchecked step.

---

## Step 5 — Complete the Phase

Once all steps are checked off:

1. Update the feature doc frontmatter:
   - `status: DONE`
   - `completed_at: {today ISO date}`
   - Append a row to the `## Change Log` table

2. Rename the feature doc to reflect that implementation is complete:
   e.g. `[IN-PROGRESS]GH4_vite-app-bootstrap.md` → `[DONE]GH4_vite-app-bootstrap.md`

   Note: `[DONE]` means implementation is complete and in review — not necessarily
   merged yet.

3. Spawn a foreground subagent with this prompt:

   > Read and follow `.claude/commands/update-status-and-commit.md` exactly.
   > Context: feature doc just renamed to [DONE]: `{new filename}`. Phase complete — all steps checked off.
   > Stage the renamed feature doc and `docs/PROJECT_STATUS.md` only. Do not stop for approval. Output the `Committed:` summary when done.

   Wait for the subagent to complete before continuing to item 4.

4. Prompt the engineer to review the branch before pushing:

   ```
   ✅ All steps complete — branch is ready for review.

   Before opening a PR, review your branch:
     git log main..HEAD --oneline
     git diff main..HEAD

   When you're satisfied, run /project:update-docs-and-push to push and open a PR.
   ```

   STOP. Wait for the engineer to confirm they've reviewed the branch before continuing.

5. Spawn a foreground subagent with this prompt:

   > Read and follow `.claude/commands/update-docs-and-push.md` exactly.
   > Context: branch is `{branch-name}`, Phase {n} — {Feature Name} just completed, feature doc is [DONE].
   > Do not stop for approval. Output the `Pushed:` summary when done.

   Wait for the subagent to complete (confirming push succeeded) before opening the PR in step 6.

6. Open a Pull Request. Scan the feature doc's `## Steps` checklist for all
   `#{issue-number}` references (sub-issues) and list every one — plus the parent
   issue — in the PR body using GitHub's closing keywords. GitHub auto-closes all
   listed issues when the PR merges to `main`.

   Structure the closing keywords section to distinguish parent from sub-issues:

   ```bash
   PR_URL=$(gh pr create \
     --title "feat(GH{n}): Phase {n} — {Feature Name}" \
     --body "## Closes

   **Phase issue:** Closes #{n}

   **Step sub-issues:**
   Closes #{sub-issue-1}
   Closes #{sub-issue-2}
   ...

   ## Summary
   {2-3 sentence summary of what was built}

   ## Verification
   - [ ] \`pnpm test\` passes
   - [ ] \`pnpm lint\` passes
   - [ ] \`pnpm build\` passes
   - [ ] Feature doc updated in \`docs/features/\`
   - [ ] Storybook stories present (if applicable)
   - [ ] Playwright E2E test passes (if applicable)
   " \
     --base main)
   echo $PR_URL
   ```

7. Update the feature doc with the PR URL:
   - Set `pr: {pr-url}` in frontmatter
   - Update the `## Change Log` row to replace `PR pending` with the PR URL
   - Commit and push:
     ```bash
     git add docs/features/
     git commit -m "docs(GH{n}): add PR url to feature doc"
     git push
     ```

8. Output:

   ```
   ⏳ Phase {n} — {Feature Name} — awaiting merge

   PR: {pr-url}
   Closes on merge:
     Parent issue: #{n}
     Sub-issues:   #{sub-1}, #{sub-2}, …

   Implementation is complete. After the PR is merged, run /project:develop —
   it will detect the open PR, offer to prune the deleted branch, and guide
   you into Phase {n+1}.
   ```

Then STOP. Do not begin the next phase. A new session with /project:develop
is required for each new phase.
