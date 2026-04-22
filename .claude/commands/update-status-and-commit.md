# /project:update-status-and-commit

> Run this command after implementing and verifying a step on a feature branch.
> It updates `docs/PROJECT_STATUS.md` to reflect the current in-progress state,
> then commits all verified feature changes together with the updated status doc
> in a single commit.

Read `CLAUDE.md` fully before doing anything.

---

## Step 1 — Gather Current State

Run the following to understand what changed and what comes next:

```bash
git diff --staged
git diff
git log --oneline -5
git status
```

Also read:

- The active feature doc in `docs/features/` (the one with `[IN-PROGRESS]` in its filename)
- The `## Steps` checklist to identify the last completed step and the next unchecked step

---

## Step 2 — Update `docs/PROJECT_STATUS.md`

Rewrite the file with the following fields updated to reflect current state:

```markdown
# Project and Feature Status

**Last completed phase:** {phase name and number, or "None"}
**Active feature doc:** {filename of the [IN-PROGRESS] doc, or "None"}
**Current step:** {Step N — description of the last completed step, or "None"}
**Known blockers:** {any blockers, or "None"}
**Next action:** {one sentence describing what the engineer should do next}
```

Rules:

- If no feature doc is `[IN-PROGRESS]`, set Active feature doc and Current step to "None"
- "Next action" wording depends on context:
  - Mid-phase (steps remain): `Begin Step {N} — {short description} (say "proceed" to continue)`
  - All steps complete: `Review your branch, then run /project:update-docs-and-push to push and open a PR for review`
  - No active phase: `Run /project:develop to begin the next phase`
- Keep each field to one line

---

## Step 3 — Commit All Verified Changes

Stage all modified files that are part of the current verified step — implementation files, the updated feature doc checklist, and `docs/PROJECT_STATUS.md` — then commit together:

```bash
git add {implementation files} {active feature doc} docs/PROJECT_STATUS.md
git commit -m "$(cat <<'EOF'
{conventional commit type}({scope}): {summary of feature changes implemented in this step}

- {bullet summarizing key change 1}
- {bullet summarizing key change 2}
- docs: update PROJECT_STATUS to reflect current step
EOF
)"
```

Commit message rules:

- **Header:** describes the feature work only (e.g. `feat(GH4): scaffold root package.json and turbo.json`). Do not mention PROJECT_STATUS.md in the header.
- **Body:** list key changes as bullets; include `docs: update PROJECT_STATUS to reflect current step` as the last bullet
- Use Conventional Commits format: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

Do not push. Output:

```
Committed: {commit header}
Files staged: {list of files}
Active: {feature doc filename}
Next: {next action}
```
