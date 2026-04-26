---
project: "Project-BootStrap-Mono-Repo"
phase: 4
slug: "deployment-setup"
status: IN-PROGRESS
step_gating: true
issue: 24
parent_issue: null
branch: feat/GH24-deployment-setup
pr: null
completed_at: null
---

# Phase 4 — Deployment Setup

## Context

The To-Do app works locally. This phase makes it deployable: a Docker container
for local and staging environments via OrbStack, a GitHub Actions CI/CD pipeline
that validates every pull request then deploys a preview to Cloudflare Pages, and deploys to a production deployment to Cloudflare Pages on merge to `main`.

I have my own domain registered on NameCheap at `witty-m.com`
For production deployment I would like this PWA to be deployed to
`https://app.todo.witty-m.com`

## Scope

**Included:**

- Multi-stage Dockerfile, docker-compose for local/staging
- GitHub Actions CI workflow (lint + test + build on PR)
- GitHub Actions CD workflow (deploy to preview Cloudflare Pages on PR open and to production on merge to `main`)
- Guided Github Repository setup for Git Hub Actions workflows.
- Guided Custom domain setup and free https certificate generation and application using Cloudflare.

**Excluded:** Environment-specific secrets beyond Cloudflare
API token, monitoring/observability (future iteration).

## Dependencies

- Depends on: Phase 3 — To-Do Feature TDD (GH{n})
- Requires: Cloudflare account with Pages enabled

## Acceptance Criteria

- [ ] `docker compose up --build` builds and serves the production app at `localhost:3000`
- [ ] The containerized app passes a manual smoke test (create, complete, delete a To-Do item)
- [ ] `curl -I http://localhost:3000/sw.js` returns `Cache-Control: no-store`
- [ ] Navigating to a deep route (e.g., `localhost:3000/nonexistent`) returns `index.html`, not a 404
- [ ] Documentation is created for manual setup steps that are not able to be executed via Pulumi IaC.
- [ ] Pushing a branch to GitHub triggers the CI workflow and all steps pass
- [ ] Opening a PR against `main` shows CI status checks on the PR
- [ ] Opening a PR against `main` deploys branch build to a Cloudflare Pages preview
- [ ] Playwright E2E tests pass against the Cloudflare Pages preview URL in `cd-preview.yml`
- [ ] Merging to `main` triggers the CD workflow and deploys to Cloudflare Pages
- [ ] The production Cloudflare Pages URL loads the app and is fully functional
- [ ] `https://app.todo.witty-m.com` loads with a valid TLS certificate and the full todo flow works
- [ ] Cloudflare pages are accessible from a custom domain registered by Namecheap

## Steps

- [ ] **Step 0** — Create `docs/deployment-setup-guide.md`: a manual prerequisites
      guide covering Cloudflare account setup, adding `witty-m.com` as a Cloudflare
      zone, updating NameCheap nameservers to Cloudflare's NS records, creating a
      Cloudflare API token (scopes: Pages Edit, Account Settings Read, Zone Read,
      DNS Edit), locating the Cloudflare Account ID, configuring GitHub repository
      secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, optional
      `TURBO_TOKEN`/`TURBO_TEAM`), Pulumi state backend setup (Pulumi Cloud free
      tier recommended), running `pulumi up` for the first time, verifying HTTPS
      certificate provisioning, and an ordered end-to-end verification checklist.
- [ ] **Step 1** — Follow `docs/deployment-setup-guide.md`: complete all manual
      setup steps (Cloudflare zone active, NameCheap NS updated, API token created,
      GitHub secrets configured, Pulumi CLI installed and logged in). Verify each
      prerequisite before proceeding to Step 2.
- [ ] **Step 2** — Create `apps/todo-pwa/Dockerfile` using a multi-stage build:
      Stage 1 (builder): `node:22-alpine`, install pnpm (pin to `10.33.0`), copy
      full monorepo context (root `package.json`, `pnpm-workspace.yaml`,
      `pnpm-lock.yaml`, then `apps/todo-pwa/package.json`), run
      `pnpm install --frozen-lockfile`, run `pnpm --filter todo-pwa build`.
      Stage 2 (server): `nginx:alpine`, copy `dist/` from builder, add `nginx.conf`
      for SPA routing (all routes → `index.html`) with `Cache-Control: no-store` on
      `sw.js` and `workbox-*.js` and long-term immutable caching on hashed assets.
      Create `docker-compose.yml` at repo root: `todo-pwa` service,
      `context: .`, `dockerfile: apps/todo-pwa/Dockerfile`, port `3000:80`,
      wget healthcheck on `/`. Add `deploy:local` script to root `package.json`.
- [ ] **Step 3** — Create `.github/workflows/ci.yml`: triggers on PR to `main` and
      push to any branch (with concurrency group to cancel superseded runs). Steps:
      checkout, `pnpm/action-setup@v4` (pin `10.33.0`), `actions/setup-node@v4`
      (Node 22, `cache: pnpm`), `pnpm install --frozen-lockfile`,
      `npx playwright install --with-deps chromium` (required by vitest storybook
      project), `pnpm lint`, `pnpm test`, `pnpm build`. Optional Turborepo remote
      caching via `TURBO_TOKEN`/`TURBO_TEAM` env vars. No E2E step — E2E runs only
      in `cd-preview.yml` against the deployed preview.
- [ ] **Step 4** — Create `infra/` Pulumi TypeScript project (standalone Node/CommonJS,
      not a pnpm workspace member). Provider: `@pulumi/cloudflare` v5. Resources:
      `cloudflare.PagesProject` (name `todo-pwa`, production branch `main`) and
      `cloudflare.PagesDomain` (`app.todo.witty-m.com`). Secrets via
      `pulumi config set --secret`: `cloudflareAccountId`, `cloudflareZoneId`.
      Export `projectName`, `previewUrl`, `productionUrl`. Files: `infra/Pulumi.yaml`,
      `infra/package.json`, `infra/tsconfig.json` (CommonJS), `infra/index.ts`.
- [ ] **Step 5** — Update `apps/todo-pwa/playwright.config.ts`: use
      `process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173"` as `baseURL`;
      conditionally omit `webServer` when `PLAYWRIGHT_BASE_URL` is set.
      Create `.github/workflows/cd-preview.yml`: triggers on `pull_request`
      (opened, synchronize, reopened) targeting `main`. Job 1 `deploy-preview`:
      checkout, setup pnpm/node, install, build, deploy via `cloudflare/pages-action@v1`
      (pass `gitHubToken` for auto PR comment), output `preview-url`. Job 2 `e2e`
      (needs: deploy-preview): checkout, setup pnpm/node, install, Playwright
      chromium install, `pnpm --filter todo-pwa test:e2e` with
      `PLAYWRIGHT_BASE_URL` set to the preview URL, upload `playwright-report/`
      artifact. Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- [ ] **Step 6** — Create `.github/workflows/cd-prod.yml`: triggers on push to
      `main` only. Steps: checkout, setup pnpm/node, install, build, deploy via
      `cloudflare/pages-action@v1` with `branch: main` (marks as production deploy,
      activates custom domain routing). Write `$GITHUB_STEP_SUMMARY` with production
      URL and `https://app.todo.witty-m.com`. Secrets: `CLOUDFLARE_API_TOKEN`,
      `CLOUDFLARE_ACCOUNT_ID`.

## Technical Notes

- Nginx config must handle SPA routing: `try_files $uri $uri/ /index.html;`
- The multi-stage Docker build must be aware of pnpm workspaces — copy the full
  monorepo context (not just `apps/todo-pwa`) so pnpm can resolve workspace deps.
  Docker build `context: .` (repo root) is required; do not set context to `apps/todo-pwa/`.
- GitHub Actions pnpm caching: use `pnpm/action-setup` + `actions/setup-node`
  with `cache: 'pnpm'`
- Any infrastructure or setup of Cloudflare Pages is handled using Pulumi's IaC
  co-located with the code being built and deployed.
- Any manual steps in the Cloudflare dashboard, or elsewhere, required before the
  CD workflow can deploy must be presented to the engineer for setup guidance and
  the prerequisite should be documented clearly for those attempting to deploy the
  repository in the future.
- **PWA service worker cache headers are critical.** `sw.js` and `workbox-*.js`
  must be served with `Cache-Control: no-store` so the browser always fetches a
  fresh service worker and detects updates. Cloudflare Pages applies this to `sw.js`
  automatically; the nginx config must replicate it for the Docker deployment path.
- **`pnpm test` in CI requires Playwright browser binaries** even though E2E tests
  are excluded. The vitest storybook project uses `@vitest/browser-playwright`
  (Chromium). Add `npx playwright install --with-deps chromium` before `pnpm test`.
- **`infra/` is not a pnpm workspace member.** It is a standalone CommonJS Node
  project (`"module": "commonjs"` in its tsconfig — do not inherit from the root
  ESM tsconfig). Managed via `npm install` inside `infra/`. Do not add to
  `pnpm-workspace.yaml`.
- **`cloudflare/pages-action` auto-posts preview URL to PR** when `gitHubToken` is
  passed — no custom notification step needed.
- **`branch: main` in `cd-prod.yml`** marks the deployment as production in
  Cloudflare Pages (activating custom domain routing). Without it, pushes to `main`
  would be treated as previews.
- **`playwright.config.ts` must conditionally omit `webServer`** when
  `PLAYWRIGHT_BASE_URL` is set, otherwise Playwright attempts to start a local dev
  server while also targeting a remote URL.

## Test Strategy

- **Manual:** `docker compose up --build` → open `localhost:3000` → full smoke test
- **CI validation:** push a test branch, verify all GitHub Actions steps pass including lint, build, unit test, integration tests, & e2e tests run.
- **CD validation:** merge a trivial change to `main`, verify deployment URL is live

## Assumptions

_None yet — populated during development._

## Change Log

| Date | PR  | Status Change | Notes |
| ---- | --- | ------------- | ----- |
|      |     |               |       |
