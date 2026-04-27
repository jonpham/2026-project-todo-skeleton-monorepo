# todo-pwa — Deployment

App-specific deployment for `apps/todo-pwa`. Shared prerequisites (Cloudflare
account, DNS, API token, GitHub secrets, Pulumi CLI) are covered in
[`docs/DEPLOYMENT_SETUP.md`](../../../docs/DEPLOYMENT_SETUP.md).

---

## Local Docker Deployment

Builds the production Nginx image and serves the app at `localhost:3000`.

```bash
# From repo root
pnpm deploy:local          # build + start (detached)
pnpm deploy:local:stop     # stop

# Or directly
docker compose up --build -d
docker compose stop
```

**Smoke test:**

```bash
curl -I http://localhost:3000/sw.js
# Cache-Control: no-store

curl -I http://localhost:3000/nonexistent
# HTTP/1.1 200 — SPA fallback serving index.html
```

---

## Infrastructure (Pulumi)

App infra is declared in `apps/todo-pwa/infra/` — a standalone Pulumi TypeScript
project that provisions:

- `cloudflare.PagesProject` — Cloudflare Pages project named `todo-pwa`, production branch `main`
- `cloudflare.PagesDomain` — custom domain `app.todo.witty-m.com`

### Standalone deploy (this app only)

Ensure `.env` at the repo root is populated — `index.ts` loads it automatically.
See [`.env.example`](../../../.env.example) for required variables.

```bash
cd apps/todo-pwa/infra
npm install

# First time only — set the account ID secret into the stack
pulumi config set cloudflareAccountId <your-account-id> --secret

# Dry run
pulumi preview

# Apply
pulumi up
```

**Expected resources after `pulumi up`:**

- `cloudflare:index:PagesProject` → `todo-pwa`
- `cloudflare:index:PagesDomain` → `app.todo.witty-m.com`

Confirm in Cloudflare dashboard: **Workers & Pages** → `todo-pwa`.

### Monorepo deploy (all apps)

See [`docs/DEPLOYMENT_SETUP.md § 8 Option A`](../../../docs/DEPLOYMENT_SETUP.md#8-run-pulumi-up-for-the-first-time).

---

## CI/CD

| Workflow         | Trigger                         | What it does                                            |
| ---------------- | ------------------------------- | ------------------------------------------------------- |
| `ci.yml`         | Push / PR                       | Lint, test, build                                       |
| `cd-preview.yml` | PR open/update targeting `main` | Deploy preview, post URL to PR, run E2E against preview |
| `cd-prod.yml`    | Push to `main`                  | Deploy to production, activate custom domain routing    |

Required GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
See [`docs/DEPLOYMENT_SETUP.md § 6`](../../../docs/DEPLOYMENT_SETUP.md#6-configure-github-repository-secrets).

---

## Custom Domain

`https://app.todo.witty-m.com` — routed via Cloudflare Pages custom domain.

TLS is provisioned automatically by Cloudflare after `pulumi up` binds the
domain. Allow 5–15 minutes for the certificate to become active.

```bash
# Verify after a production deploy
curl -I https://app.todo.witty-m.com
# HTTP/2 200 confirms TLS and routing are working
```

---

## Verification Checklist

- [ ] `docker compose up --build` → `localhost:3000` loads app, smoke test passes
- [ ] Push branch → `ci.yml` passes in GitHub Actions
- [ ] Open PR → `cd-preview.yml` posts preview URL to PR, E2E passes
- [ ] Merge → `cd-prod.yml` deploys to production
- [ ] `https://app.todo.witty-m.com` loads with valid TLS
