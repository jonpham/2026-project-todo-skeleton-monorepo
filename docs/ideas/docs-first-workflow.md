# Idea: Docs-First Workflow

**Status:** Implemented (2026-04-28)
**Driver:** Keep repository plan documents as the source of truth

## Problem

Automated issue syncing creates extra process around data already captured in
repository plan documents. The repo needs a clear split between initiative
planning, implementation planning, feature execution, and optional external task
tracking.

## Decision

- Feature docs in `docs/features/` are the task management system. Frontmatter
  (`status`, `branch`, `pr`, `completed_at`) and step checklists are the source
  of truth.
- gstack is used for initiative planning. Initiative-level discovery, strategy,
  design review, and architecture artifacts are committed to
  `docs/initiatives/{initiative}/`.
- superpowers is used for implementation planning. Implementation plans and
  specs are committed to `docs/specs/{initiative}/`, using the same identifier
  as the matching `docs/initiatives/{initiative}/` folder.
- When merged changes complete the tasks defined by a spec implementation plan,
  move that spec file from `docs/specs/{initiative}/` to `docs/features/` to
  signal completion and keep the completed plan with feature history.
- Whenever development starts or resumes, update `docs/PROJECT_STATUS.md` with
  the active spec, the skill being used, the current task, and the next action
  for that task or the next task.
- GitHub Issues are not synced automatically. When issue tracking is needed,
  manually write issues from the accepted initiative and spec documents.
- TODO: Decide how GitHub/task-management state should be reconciled with
  repository plan documents without reintroducing automated issue sync.

## What Changed

- Former command-driven planning workflows are deprecated in favor of explicit
  gstack initiative planning and superpowers implementation planning.
- `docs/features/_TEMPLATE.md` deleted — new docs are generated from the current
  planning workflow.
- GitHub-specific frontmatter (`issue`, `parent_issue`, `upstream_repos`,
  `upstream_issues`) removed from unworked `[TODO]` feature docs.
- Initiative artifacts worth keeping are moved to `docs/initiatives/`;
  implementation plans/specs are moved to `docs/specs/`.

## Tooling Convention

| Work type | Tool/process | Output location |
| --------- | ------------ | --------------- |
| Initiative planning | gstack | `docs/initiatives/{initiative}/` |
| Implementation planning | superpowers | `docs/specs/{initiative}/` |
| Active development status | repository docs | `docs/PROJECT_STATUS.md` |
| Completed spec history | repository docs | `docs/features/` |
| Feature execution tracking | repository docs | `docs/features/[STATUS]GH{n}_{slug}.md` |
| Manual GitHub issue writing | human-authored from accepted docs | GitHub Issues |
| Ideas/ADRs | repository docs | `docs/ideas/` |
