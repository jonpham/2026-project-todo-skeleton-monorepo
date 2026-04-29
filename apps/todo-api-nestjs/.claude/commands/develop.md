# /project:develop

> Run this command to begin or resume development on a phase.
> This command respects the Working Agreement in CLAUDE.md strictly.
> It executes one step at a time by default, stopping for approval between
> each step unless `step_gating: false` is set in the active feature doc's
> frontmatter.

Read `CLAUDE.md` fully before doing anything.

---

## Step 1 — Select the Active Phase

1. Look in `docs/features/` for feature docs with status `[TODO]` or `[IN-PROGRESS]`
2. Identify the lowest-phase `[TODO]` or currently active `[IN-PROGRESS]` doc
3. Present the candidate Phase to the engineer:

   ```
   Next phase to develop:
   Phase {n} — {Feature Name}
   Doc: docs/features/{filename}
   Criteria: {count} | Steps: {count}

   Review the feature doc before we begin. Would you like to update the plan,
   or say "proceed" to start development as-is.
   ```

4. Wait for the engineer's response.
   - If they request changes: apply them to the feature doc and confirm before continuing
   - If they say "proceed": continue to Step 2

---

## Step 2 — Set Up the Feature Branch

Once the engineer confirms the plan:

1. Create a feature branch:
   `git checkout -b feat/P{phase-number}-{feature-slug}`
   The slug comes from the `slug` field in the feature doc's frontmatter.

2. Update the active feature doc frontmatter:
   - `status: IN-PROGRESS`
   - `branch: feat/P{phase-number}-{feature-slug}`

3. Rename the feature doc file to reflect the new status:
   e.g. `[TODO]P4_integration-tests.md` → `[IN-PROGRESS]P4_integration-tests.md`

4. Commit the feature doc update:
   ```
   git add docs/features/
   git commit -m "docs(P{n}): begin phase {n} — {feature-slug}"
   ```

Output the branch name, then STOP and wait for explicit approval before beginning implementation.

---

## Step 3 — Determine Step Gating Mode

Read the `step_gating` field from the active feature doc's frontmatter:

- `step_gating: true` (default) — complete one step, stop, wait for approval, repeat for each step
- `step_gating: false` — complete all steps sequentially without stopping, then stop at the phase boundary for approval

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

Find the `## Steps` checklist in the active feature doc. Identify the first unchecked step (to support resuming a partially complete phase).

For each unchecked step:

### 4a — Implement the Step

Implement exactly what the step describes. Do not implement anything from future steps, even if it seems logical to do so.

**UI components:** After the component's own unit tests pass, also wire it into the nearest live parent (`App.tsx` or equivalent) — even as a placeholder if sibling components don't exist yet. Add a Storybook play story or a brief E2E assertion demonstrating the component in app context. Commit this as part of the same step.

### 4b — Verify the Step

Run the verification commands appropriate to what was just built:

- If code was added: run lint and test:
  ```bash
  pnpm lint
  pnpm test
  ```
- If a new component was added: confirm Storybook story exists and renders
- If E2E-relevant behavior was added: run `pnpm test:e2e` or `pnpm test:all`

If any verification fails, fix it before marking the step complete.
Do not move to the next step with a failing test.

### 4c — Update the Feature Doc

1. Check off the completed step in the `## Steps` checklist
2. Append any non-obvious decisions to the `## Assumptions` section
3. Run `/project:update-status-and-commit` to commit the changes.

### 4d — Output the Working Agreement Summary

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

### 4e — Gate Check

If `step_gating: true`:
STOP. Do not proceed until the engineer types `proceed` or `next`.

If `step_gating: false`:
Continue immediately to the next unchecked step.

Repeat Steps 4a–4e for each remaining unchecked step.

---

## Step 5 — Complete the Phase

Once all steps are checked off:

1. Update the feature doc frontmatter:
   - `status: DONE`
   - `completed_at: {today ISO date}`
   - Append a row to the `## Change Log` table

2. Rename the feature doc to reflect that implementation is complete:
   e.g. `[IN-PROGRESS]P4_integration-tests.md` → `[DONE]P4_integration-tests.md`

   Note: `[DONE]` means implementation is complete and in review — not necessarily merged yet.

3. Run `/project:update-status-and-commit` to update PROJECT_STATUS.md and commit the feature doc rename.

4. Prompt the engineer to review the branch before pushing:

   ```
   ✅ All steps complete — branch is ready for review.

   Before pushing, review your branch:
     git log main..HEAD --oneline
     git diff main..HEAD

   When you're satisfied, run /project:update-docs-and-push to push the branch.
   ```

   STOP. Wait for the engineer to confirm they've reviewed the branch before continuing.

5. Run `/project:update-docs-and-push` to push the branch.

6. Once pushed, output:

   ```
   ✅ Phase {n} — {Feature Name} — complete and pushed

   Branch: {branch-name}
   Implementation is complete. A new session with /project:develop is required
   for each new phase.
   ```

Then STOP. Do not begin the next phase. A new Claude Code session is required for each new phase.

---

## Future: GitHub Integration

When this repo is pushed to GitHub and configured with a GitHub Project board,
the following steps in `/project:develop` will be enhanced:

- **Step 0:** Check for open PRs and stale branches (via `gh` CLI)
- **Step 1:** Select from GitHub Issues in the `To Do` column (via `gh project item-list`)
- **Step 2:** Update GitHub Issue status on Project board to `In Progress`
- **Step 5:** Create a GitHub PR and auto-close Issues on merge

Until then, this workflow manages local branches and feature docs only.
