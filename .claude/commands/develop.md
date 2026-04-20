# /project:develop

> Run this command to begin or resume development on a phase.
> This command respects the Working Agreement in CLAUDE.md strictly.
> It executes one step at a time by default, stopping for approval between
> each step unless `step_gating: false` is set in the active feature doc's
> frontmatter.

Read `CLAUDE.md` fully before doing anything.

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

---

## Step 2 — Set Up the Feature Branch

Once an Issue is confirmed:

1. Create a feature branch:
   `git checkout -b feat/GH{issue-number}-{feature-slug}`
   The slug comes from the `slug` field in the feature doc's frontmatter.

2. Update the active feature doc frontmatter:
   - `status: IN-PROGRESS`
   - `branch: feat/GH{issue-number}-{feature-slug}`

3. Rename the feature doc file to reflect the new status:
   e.g. `[TODO]GH4_vite-app-bootstrap.md` → `[IN-PROGRESS]GH4_vite-app-bootstrap.md`

4. Update the GitHub Issue status on the Project board to `In Progress`:
   `gh project item-edit --id {item-id} --field-id {status-field-id} --project-id {project-id} --single-select-option-id {in-progress-option-id}`

5. Commit the feature doc update:
   ```
   git add docs/features/
   git commit -m "docs(GH{n}): begin phase {n} — {feature-slug}"
   git push -u origin feat/GH{issue-number}-{feature-slug}
   ```

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

### 4a — Implement the Step

Implement exactly what the step describes. Do not implement anything from
future steps, even if it seems logical to do so.

### 4b — Verify the Step

Run the verification commands appropriate to what was just built:
- If code was added: run `pnpm lint` and `pnpm test` (scoped to the changed package)
- If a new component was added: confirm Storybook story exists and renders
- If E2E-relevant behavior was added: run `pnpm test:e2e`

If any verification fails, fix it before marking the step complete.
Do not move to the next step with a failing test.

### 4c — Update the Feature Doc

1. Check off the completed step in the `## Steps` checklist
2. Append any non-obvious decisions to the `## Assumptions` section
3. Commit the implementation + updated feature doc together:
   ```
   git add .
   git commit -m "feat(GH{n}): {brief description of what was implemented}"
   ```

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
   - `completed_at: {ISO date}`
   - Append a row to the `## Change Log` table

2. Rename the feature doc:
   e.g. `[IN-PROGRESS]GH4_vite-app-bootstrap.md` → `[DONE]GH4_vite-app-bootstrap.md`

3. Update the GitHub Issue status on the Project board to `Done`

4. Commit all remaining changes:
   ```
   git add .
   git commit -m "docs(GH{n}): mark phase {n} complete — {feature-slug}"
   git push
   ```

5. Open a Pull Request:
   ```
   gh pr create \
     --title "feat(GH{n}): Phase {n} — {Feature Name}" \
     --body "Closes #GH{n}

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
     --base main
   ```

6. Output:
   ```
   🎉 Phase {n} complete — {Feature Name}

   PR: {pr-url}
   Issue: #{n}

   Review and merge the PR when ready. After merging, run
   /project:develop to begin the next phase.
   ```

Then STOP. Do not begin the next phase. A new session with /project:develop
is required for each new phase.
