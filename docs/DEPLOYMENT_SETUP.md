# Deployment Setup Guide

Shared prerequisites for deploying any app in this monorepo to Cloudflare Pages.

Complete every section in order before running `pulumi up` or triggering any
GitHub Actions workflow. Each section ends with a verification step.

App-specific deployment instructions (local Docker, standalone `pulumi up`,
CI/CD workflows, custom domain verification) live in each app's own docs:

- [`apps/todo-pwa/docs/DEPLOYMENT.md`](../apps/todo-pwa/docs/DEPLOYMENT.md)

---

## 1. Cloudflare Account

1. Create a free account at [cloudflare.com](https://cloudflare.com) if you
   don't have one.
2. Navigate to **Workers & Pages** in the left sidebar to confirm Pages is
   available — it is enabled on all plans including free.

---

## 2. Add `witty-m.com` Zone to Cloudflare

1. In the Cloudflare dashboard, click **Add a site**.
2. Enter `witty-m.com` and select the **Free** plan.
3. Cloudflare scans your existing DNS records and imports them — review the
   list and confirm.
4. Cloudflare provides two nameserver addresses (e.g. `ns1.cloudflare.com`,
   `ns2.cloudflare.com` — your exact values appear on screen). **Copy both.**

**Verify:** The zone page shows a banner saying "Complete your nameserver setup"
until NS delegation is confirmed (next step).

---

## 3. Update NameCheap Nameservers

1. Log in to [namecheap.com](https://namecheap.com).
2. Go to **Domain List** → `witty-m.com` → **Manage**.
3. Under **Nameservers**, select **Custom DNS**.
4. Enter the two Cloudflare nameserver addresses from Section 2. Save.

DNS propagation typically takes 30 minutes to 48 hours.

**Verify:** In the Cloudflare dashboard, the `witty-m.com` zone status changes
from "Pending" to **Active** (green checkmark). You can also run:

```bash
dig NS witty-m.com +short
# Should return Cloudflare nameservers
```

---

## 4. Create a Cloudflare API Token

1. In the Cloudflare dashboard, click your avatar → **My Profile** →
   **API Tokens** → **Create Token**.
2. Choose **Custom Token** (not a preset).
3. Configure the following permissions:

   | Permission                        | Resource      |
   | --------------------------------- | ------------- |
   | Account > Cloudflare Pages > Edit | Your account  |
   | Account > Account Settings > Read | Your account  |
   | Zone > Zone > Read                | `witty-m.com` |
   | Zone > DNS > Edit                 | `witty-m.com` |

4. Under **Account Resources**: Include your account.
5. Under **Zone Resources**: Include specific zone → `witty-m.com`.
6. Click **Continue to Summary** → **Create Token**.
7. **Copy the token — it is shown only once.**

**Verify:**

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json"
# "status": "active" confirms the token is valid
```

---

## 5. Find Your Cloudflare Account ID

Your Account ID appears in two places:

- **Dashboard URL:** `https://dash.cloudflare.com/<account-id>/...` — copy the
  path segment after `dash.cloudflare.com/`.
- **Workers & Pages overview:** right-hand sidebar under **Account ID**.

Keep this value — it is needed for GitHub secrets and Pulumi config.

---

## 6. Configure GitHub Repository Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions**
→ **New repository secret** for each of the following:

| Secret name             | Value                                     |
| ----------------------- | ----------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token from Section 4                      |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from Section 5                 |
| `TURBO_TOKEN`           | _(optional)_ Turborepo remote cache token |
| `TURBO_TEAM`            | _(optional)_ Turborepo team slug          |

`GITHUB_TOKEN` is provided automatically by GitHub Actions — no action needed.

**Verify:** Both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` appear in
the Secrets list (values are masked).

---

## 7. Pulumi State Backend Setup

Install the Pulumi CLI:

```bash
brew install pulumi/tap/pulumi
pulumi version  # confirm install
```

Choose a state backend:

### Option A — Pulumi Cloud (recommended for solo projects)

Free tier supports unlimited projects with remote state and secret encryption.

```bash
pulumi login
# Opens browser for authentication — create or sign in to a Pulumi account
```

### Option B — Local state

State stored in `~/.pulumi/`. Not shareable across machines; back it up manually.

```bash
pulumi login --local
```

---

## 8. Run `pulumi up` for the First Time

Each app has its own Pulumi stack in `apps/{app}/infra/`. The root `infra/`
orchestrator drives all of them via the Pulumi Automation API. You can deploy
everything at once (Option A) or a single app in isolation (Option B).

See [`docs/ARCHITECTURE.md — Infrastructure Design`](ARCHITECTURE.md#infrastructure-design)
for the full rationale.

**Before running either option**, populate the repo root `.env` file:

```bash
cp .env.example .env
# Edit .env — fill in CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PULUMI_STACK
```

Both `infra/index.ts` and `apps/todo-pwa/infra/index.ts` load this file
automatically on startup.

### Option A — Deploy all apps (monorepo orchestration)

From the repo root `infra/` directory. Uses the Pulumi Automation API to drive
each app's co-located Pulumi program. Shared config is loaded from `.env` and
passed automatically to each app stack.

```bash
cd infra
npm install
npx ts-node index.ts
```

### Option B — Deploy a single app (standalone)

See the app's own deployment doc, e.g.:

- [`apps/todo-pwa/docs/DEPLOYMENT.md`](../apps/todo-pwa/docs/DEPLOYMENT.md)

---

## 9. Shared Prerequisites Verification Checklist

Complete before running any app-specific deployment:

- [ ] Cloudflare zone shows **Active** in the Cloudflare dashboard
- [ ] NameCheap nameservers point to Cloudflare (confirmed via `dig NS`)
- [ ] Cloudflare API token verified with `curl` (status: active)
- [ ] GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set
- [ ] Pulumi CLI installed and logged in (`pulumi whoami`)

Then follow the app-specific verification checklist:

- [`apps/todo-pwa/docs/DEPLOYMENT.md — Verification Checklist`](../apps/todo-pwa/docs/DEPLOYMENT.md#verification-checklist)
