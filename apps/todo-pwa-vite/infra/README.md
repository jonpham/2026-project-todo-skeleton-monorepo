# Pulumi Infrastructure

Infrastructure as Code for the todo-pwa-vite Cloudflare Pages project using Pulumi.

## Setup

### Prerequisites

```bash
# Install Pulumi CLI
curl -fsSL https://get.pulumi.com | sh

# Install Node dependencies
cd infra
npm install
```

### Configure Secrets (Never commit these!)

Set secrets via environment variables or Pulumi CLI:

```bash
# Option 1: Environment variables (preferred for CI/CD)
export PULUMI_CONFIG_PASSPHRASE=""  # Empty passphrase for automation
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Option 2: Pulumi CLI (for local development)
pulumi config set cloudflareAccountId <your-account-id> --secret
# This will prompt for CLOUDFLARE_API_TOKEN from env

# Option 3: .env file (local development only, git-ignored)
echo "CLOUDFLARE_API_TOKEN=your-token" > ../.env
echo "CLOUDFLARE_ACCOUNT_ID=your-account-id" >> ../.env
```

### Deploy

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# View outputs
pulumi stack output
```

## Outputs

After successful deployment:
- `projectName`: Cloudflare Pages project name (`todo-pwa-vite`)
- `pagesUrl`: Preview/staging URL (e.g., `https://abc123.pages.dev`)

## Security Notes

⚠️ **IMPORTANT**: Never commit Pulumi config files with secrets!

- Pulumi.prod.yaml is in `.gitignore` for production
- API tokens must be set via environment variables
- Use `--secret` flag when setting sensitive config
- In GitHub Actions, use repository secrets (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)

## CI/CD Integration

GitHub Actions workflows automatically deploy via Pulumi:
- Secrets stored in GitHub repo settings
- `.github/workflows/cd-preview.yml` uses these secrets
- No need to run Pulumi manually in CI/CD

## Troubleshooting

**"Project not found"**: Pulumi stack hasn't been deployed yet
```bash
pulumi up  # Create the project first
```

**"Invalid API token"**: Check environment variable is set
```bash
echo $CLOUDFLARE_API_TOKEN
```

**"Access denied"**: Token missing required Cloudflare scopes
- Go to https://dash.cloudflare.com/profile/api-tokens
- Ensure token has "Pages" and "Account" scopes
