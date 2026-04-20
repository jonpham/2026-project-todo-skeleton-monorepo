## Summary

> Replace this with a 2-3 sentence description of what this PR implements.
> Reference the GitHub Issue: Closes #N

Closes #

---

## Type of Change

- [ ] `feat` — new feature or phase implementation
- [ ] `fix` — bug fix
- [ ] `chore` — tooling, config, dependencies
- [ ] `docs` — documentation only
- [ ] `test` — tests only, no implementation changes
- [ ] `refactor` — code change with no feature or fix

---

## Verification Checklist

### Code Quality
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm test` passes — all unit tests green
- [ ] `pnpm build` completes without errors

### Testing (check all that apply)
- [ ] Vitest + RTL unit tests written and passing for all new components/hooks
- [ ] Storybook stories written for all new UI components
- [ ] Playwright E2E test written or updated for any user-facing behavior change
- [ ] `pnpm test:e2e` passes

### Feature Documentation (required for every PR)
- [ ] The corresponding `docs/features/[STATUS]GH{n}_{slug}.md` has been updated
- [ ] Completed steps are checked off in the `## Steps` checklist
- [ ] Any non-obvious decisions are recorded in the `## Assumptions` section
- [ ] The `## Change Log` table has a new row for this PR
- [ ] Frontmatter fields are up to date (`status`, `branch`, `pr`, `completed_at`)
- [ ] Feature doc filename reflects current status (e.g. `[DONE]GH4_...`)

---

## Assumptions & Decisions

> List any implementation decisions that were not explicitly specified in the
> feature doc or that deviated from the original plan. "None" is acceptable.

- None

---

## Screenshots / Evidence

> For UI changes: include before/after screenshots or a short screen recording.
> For non-UI changes: paste the terminal output of your verification commands.

```
$ pnpm test
# paste output here

$ pnpm lint
# paste output here
```
