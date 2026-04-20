---
project: "[PROJECT_NAME]"
phase: 0
slug: "feature-slug"
status: TODO
step_gating: true
issue: null
parent_issue: null
branch: null
pr: null
completed_at: null
---

# Phase N — Feature Name

## Context

> Why does this phase exist? What problem does it solve?
> What does the project look like before this phase, and after?

## Scope

> What is explicitly included in this phase.
> What is explicitly excluded (deferred to a later phase).

## Dependencies

> List any phases or GitHub Issues that must be complete before this phase can begin.
> Use "None" if this phase is independent.

- Depends on: Phase N-1 (GH{n})

## Acceptance Criteria

> These are the conditions that must be true for this phase to be considered complete.
> Written as testable, observable outcomes — not implementation steps.

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Steps

> Ordered checklist of implementation steps.
> Each step maps to one GitHub Sub-Issue.
> Claude Code completes one step, stops, and waits for approval before proceeding
> (unless step_gating is set to false in frontmatter).

- [ ] **Step 1** — Description of what to implement
- [ ] **Step 2** — Description of what to implement
- [ ] **Step 3** — Description of what to implement

## Technical Notes

> Architecture decisions, constraints, or implementation guidance relevant to this phase.
> Include links to relevant docs, RFCs, or prior art.

## Test Strategy

> How will this phase's work be verified?
> List the specific test types and what they cover.

- **Unit tests:** what Vitest + RTL tests should exist
- **Component tests:** what Storybook stories should exist
- **E2E tests:** what Playwright scenarios should cover this feature

## Assumptions

> Filled in by Claude Code during implementation.
> Lists any decisions made that were not explicitly specified.

_None yet — populated during development._

## Change Log

> Updated by Claude Code after each PR that touches this phase.

| Date | PR | Status Change | Notes |
|---|---|---|---|
| | | | |
