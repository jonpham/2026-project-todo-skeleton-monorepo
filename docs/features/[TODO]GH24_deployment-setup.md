---
project: "Project-BootStrap-Mono-Repo"
phase: 4
slug: "deployment-setup"
status: TODO
step_gating: true
issue: 24
parent_issue: null
branch: null
pr: null
completed_at: null
---

# Phase 4 — Deployment Setup

## Context

The To-Do app works locally. This phase makes it deployable: a Docker container
for local and staging environments via OrbStack, a GitHub Actions CI/CD pipeline
that validates every pull request and deploys on merge to `main`, and a production
deployment to Cloudflare Pages.

## Scope

**Included:** Multi-stage Dockerfile, docker-compose for local/staging, GitHub
Actions CI workflow (lint + test + build on PR), GitHub Actions CD workflow
(deploy to Cloudflare Pages on merge to `main`).

**Excluded:** Custom domain setup, environment-specific secrets beyond Cloudflare
API token, monitoring/observability (future iteration).

## Dependencies

- Depends on: Phase 3 — To-Do Feature TDD (GH{n})
- Requires: Cloudflare account with Pages enabled
- Requires: GitHub repository secrets configured (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)

## Acceptance Criteria

- [ ] `docker compose up --build` builds and serves the production app at `localhost:3000`
- [ ] The containerized app passes a manual smoke test (create, complete, delete a To-Do item)
- [ ] Pushing a branch to GitHub triggers the CI workflow and all steps pass
- [ ] Opening a PR against `main` shows CI status checks on the PR
- [ ] Merging to `main` triggers the CD workflow and deploys to Cloudflare Pages
- [ ] The production Cloudflare Pages URL loads the app and is fully functional

## Steps

- [ ] **Step 1** — Create `apps/todo-web/Dockerfile` using a multi-stage build:
      Stage 1 (builder): Node.js 22 alpine, install pnpm, copy workspace files,
      run `pnpm install --frozen-lockfile`, run `pnpm --filter todo-web build`.
      Stage 2 (server): Nginx alpine, copy `dist/` from builder, add `nginx.conf`
      for Single Page Application (SPA) routing (all routes → `index.html`).
      Create `docker-compose.yml` at repo root: `todo-web` service, port 3000:80,
      healthcheck on `/`. Add `deploy:local` script to `apps/todo-web/package.json`.
- [ ] **Step 2** — Create `.github/workflows/ci.yml`: triggers on PR to `main` and
      push to any branch. Steps: checkout, setup Node 22 + pnpm cache, `pnpm install
      --frozen-lockfile`, `pnpm lint`, `pnpm test`, `pnpm build`. Use Turborepo
      remote caching via `TURBO_TOKEN` and `TURBO_TEAM` secrets if available.
- [ ] **Step 3** — Create `.github/workflows/cd.yml`: triggers on push to `main`
      only. Steps: checkout, setup Node + pnpm, install, build, deploy to Cloudflare
      Pages using `cloudflare/pages-action`. Requires `CLOUDFLARE_API_TOKEN` and
      `CLOUDFLARE_ACCOUNT_ID` GitHub secrets. Output the deployment URL as a workflow
      summary.

## Technical Notes

- Nginx config must handle SPA routing: `try_files $uri $uri/ /index.html;`
- The multi-stage Docker build must be aware of pnpm workspaces — copy the full
  monorepo context (not just `apps/todo-web`) so pnpm can resolve workspace deps
- GitHub Actions pnpm caching: use `pnpm/action-setup` + `actions/setup-node`
  with `cache: 'pnpm'`
- Cloudflare Pages project must be created manually in the Cloudflare dashboard
  before the CD workflow can deploy — document this prerequisite clearly

## Test Strategy

- **Manual:** `docker compose up --build` → open `localhost:3000` → full smoke test
- **CI validation:** push a test branch, verify all GitHub Actions steps pass
- **CD validation:** merge a trivial change to `main`, verify deployment URL is live

## Assumptions

_None yet — populated during development._

## Change Log

| Date | PR | Status Change | Notes |
|---|---|---|---|
| | | | |
