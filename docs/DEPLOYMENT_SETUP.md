# Deployment Setup Guide

Manual prerequisites for Phase 4 — Deployment Setup (GH24).

Complete every section in order before running `pulumi up` or triggering any
GitHub Actions workflow. Each section ends with a verification step.

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

From the `infra/` directory:

```bash
cd infra
npm install

# Set required config secrets
pulumi config set cloudflareAccountId <your-account-id> --secret
pulumi config set cloudflareZoneId <zone-id-for-witty-m.com> --secret
# Zone ID is visible in the Cloudflare dashboard on the witty-m.com overview page

# Dry run — review the plan before applying
CLOUDFLARE_API_TOKEN=<your-token> pulumi preview

# Apply
CLOUDFLARE_API_TOKEN=<your-token> pulumi up
```

**Verify:** `pulumi up` completes with 2 resources created:

- `cloudflare:index:PagesProject` — `todo-pwa`
- `cloudflare:index:PagesDomain` — `app.todo.witty-m.com`

Confirm in the Cloudflare dashboard under **Workers & Pages** → `todo-pwa`.

---

## 9. Verify HTTPS Certificate Provisioning

After `pulumi up` binds the custom domain, Cloudflare automatically provisions
a TLS certificate. This typically completes within 5–15 minutes.

1. In the Cloudflare dashboard: **Workers & Pages** → `todo-pwa` →
   **Custom Domains** tab. Wait for status to show **Active**.
2. Verify from the CLI (run after a production deploy exists):
   ```bash
   curl -I https://app.todo.witty-m.com
   # HTTP/2 200 confirms TLS and routing are working
   ```

---

## 10. End-to-End Verification Checklist

Complete in this order after all setup steps are done:

- [ ] `witty-m.com` zone shows **Active** in Cloudflare dashboard
- [ ] NameCheap nameservers point to Cloudflare (confirmed via `dig NS`)
- [ ] Cloudflare API token verified with `curl` (status: active)
- [ ] GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set
- [ ] Pulumi CLI installed and logged in (`pulumi whoami`)
- [ ] `pulumi up` succeeds — `todo-pwa` Pages project visible in Cloudflare
- [ ] `docker compose up --build` from repo root → `localhost:3000` loads app
- [ ] Push a feature branch → CI workflow passes in GitHub Actions
- [ ] Open a PR → `cd-preview.yml` runs, preview URL posted to PR, E2E passes
- [ ] Merge PR → `cd-prod.yml` runs, production deployment succeeds
- [ ] `https://app.todo.witty-m.com` loads with valid TLS certificate
