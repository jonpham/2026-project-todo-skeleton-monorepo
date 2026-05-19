# Phase 10 PR-A — Chart Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Helm chart scaffold for the todo-skeleton — chart metadata, values shape, k3d-local overlay, and reusable named templates — without yet introducing any Kubernetes resource manifests. The chart must pass `helm lint` against both the base values and the overlay.

**Architecture:** Per-app template files with strong `_helpers.tpl`. Staging-shaped defaults in `values.yaml`; laptop dev loop differences in `values-k3d-local.yaml` overlay. Image references assembled centrally via a named template so registry/repository changes are one-line edits. No Kubernetes resources in this pull request — those arrive in PR-B.

**Tech Stack:** Helm 3.13+, k3d 5.6+ (later pull requests), kubectl, Go-template syntax inside Helm.

**Scope of this plan (PR-A only):** `infra/helm/todo-skeleton/Chart.yaml`, `values.yaml`, `values-k3d-local.yaml`, `.helmignore`, `templates/_helpers.tpl`, and a `PROJECT_STATUS.md` update. Six files total — under the 10-file pull request cap with room.

**Out of scope for this plan:** All Kubernetes resource templates (Deployment, Service, ConfigMap, PersistentVolumeClaim, Ingress) — PR-B and PR-C.

---

## File Structure

| File                                              | Purpose                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `infra/helm/todo-skeleton/Chart.yaml`             | Chart metadata: name, version, appVersion, description, type.                                                  |
| `infra/helm/todo-skeleton/.helmignore`            | Patterns excluded from `helm package` (analog of `.gitignore`).                                                |
| `infra/helm/todo-skeleton/values.yaml`            | Staging-shaped defaults: image, replicas, env, persistence, ingress.                                           |
| `infra/helm/todo-skeleton/values-k3d-local.yaml`  | Overlay for the laptop dev loop: `tag: dev`, `host: todo.local`, no pull secret.                               |
| `infra/helm/todo-skeleton/templates/_helpers.tpl` | Named templates: `name`, `fullname`, `componentName`, `labels`, `selectorLabels`, `image`, `imagePullSecrets`. |
| `docs/PROJECT_STATUS.md`                          | Phase 10 active spec, current task, next action.                                                               |

**Test strategy at PR-A:** There are no Kubernetes resources yet, so no unit-style assertions. The verification gate is `helm lint` (chart structure + Go-template syntax + values reference validity) plus `helm template` (proves all helpers parse). Each task ends with the lint command its change must keep passing.

---

## Task 0: Install Helm and k3d

This task is one-time per machine. Skip if `helm version` already reports 3.13 or newer. k3d is not strictly required until PR-C cluster verification, but install it now so the toolchain is complete.

**Files:** None. Tooling install only.

- [ ] **Step 1: Install Helm via Homebrew**

```bash
brew install helm
```

- [ ] **Step 2: Verify Helm version is 3.13 or newer (Helm 4.x is also fine)**

```bash
helm version --short
```

Expected output — either Helm 3.13+ or Helm 4.x (current as of 2026):

```
v4.2.0+gxxxxxxxx
```

Helm 2 is incompatible. Helm 4 is mostly backward-compatible for chart authors; our chart uses only Helm-3-and-4 common syntax (apiVersion v2, standard helpers). If lint fails on this chart with Helm 4 due to a removed function or flag, stop and surface the error.

- [ ] **Step 3: Install k3d via Homebrew**

```bash
brew install k3d
```

- [ ] **Step 4: Verify k3d version is 5.6 or newer**

```bash
k3d version
```

Expected output (version may be newer):

```
k3d version v5.6.0
k3s version v1.27.x-k3s1 (default)
```

No commit — these are not repo changes.

---

## Task 1: Create the chart skeleton (Chart.yaml + .helmignore + empty values + empty helpers)

The smallest possible valid chart. After this task, `helm lint` reports the chart as valid with zero errors. There may be an INFO-level note about a missing `icon:` field — that is acceptable and intentional (no chart icon is needed).

**Files:**

- Create: `infra/helm/todo-skeleton/Chart.yaml`
- Create: `infra/helm/todo-skeleton/.helmignore`
- Create: `infra/helm/todo-skeleton/values.yaml`
- Create: `infra/helm/todo-skeleton/templates/_helpers.tpl`

- [ ] **Step 1: Create the chart directory**

```bash
mkdir -p infra/helm/todo-skeleton/templates
```

- [ ] **Step 2: Write `Chart.yaml`**

File: `infra/helm/todo-skeleton/Chart.yaml`

```yaml
apiVersion: v2
name: todo-skeleton
description: |
  Two-service todo-app skeleton — Vite progressive web app (nginx) and
  NestJS API with a single-writer SQLite database on a PersistentVolumeClaim.
  Deployable to any Kubernetes cluster; defaults shaped for k3s.
type: application
# Chart version — bump when the chart itself changes (templates, helpers, defaults).
version: 0.1.0
# appVersion — version of the app images this chart was authored against.
# Bumped when a new image tag is cut.
appVersion: "0.1.0"
kubeVersion: ">=1.27.0-0"
maintainers:
  - name: Jonathan Pham
    url: https://github.com/jonpham
```

- [ ] **Step 3: Write `.helmignore`**

File: `infra/helm/todo-skeleton/.helmignore`

```
# Patterns excluded from `helm package`. Standard set.
.DS_Store
.git/
.gitignore
.bzr/
.hg/
.hgignore
.svn/
*.swp
*.bak
*.tmp
*.orig
*~
.project
.idea/
*.tmproj
.vscode/
```

- [ ] **Step 4: Write empty `values.yaml`**

File: `infra/helm/todo-skeleton/values.yaml`

```yaml
# Default values for todo-skeleton.
# Populated in Task 2.
```

- [ ] **Step 5: Write empty `_helpers.tpl`**

File: `infra/helm/todo-skeleton/templates/_helpers.tpl`

```
{{/* Named templates populated in Task 4. */}}
```

- [ ] **Step 6: Run lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton
```

Expected output (icon INFO is acceptable):

```
==> Linting infra/helm/todo-skeleton
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

If you see `[ERROR]`, stop and re-read Step 2.

- [ ] **Step 7: Run `helm template`, expect zero output**

```bash
helm template test infra/helm/todo-skeleton
```

Expected output: nothing (no manifests yet). No error.

- [ ] **Step 8: Commit**

```bash
git add infra/helm/todo-skeleton/
git commit -m "feat(infra/helm): scaffold todo-skeleton Helm chart

Chart.yaml, .helmignore, empty values.yaml, empty templates/_helpers.tpl.
helm lint passes; helm template renders empty (no resources yet)."
```

---

## Task 2: Populate `values.yaml` with staging-shaped defaults

These are the knobs every downstream user will tune. The shape is locked in `docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md` (Section: `values.yaml` Shape). No drift permitted — copy this content verbatim.

**Files:**

- Modify: `infra/helm/todo-skeleton/values.yaml`

- [ ] **Step 1: Overwrite `values.yaml` with the staging-shaped defaults**

File: `infra/helm/todo-skeleton/values.yaml`

```yaml
# Default values for todo-skeleton.
# This file is shaped for production / Proxmox-k3s staging.
# For local k3d development, layer values-k3d-local.yaml on top via `-f`.

# Optional name overrides — used by the todo-skeleton.name and .fullname helpers.
nameOverride: ""
fullnameOverride: ""

# Global image settings shared by both apps.
image:
  registry: ghcr.io
  # Repository under the registry — both app image names append to this path.
  repository: jonpham/2026-project-todo-skeleton-monorepo
  # IfNotPresent because we use immutable version tags; Always would re-pull on
  # every restart. Override to Always if you start using mutable tags like :latest.
  pullPolicy: IfNotPresent

# Reference to a docker-registry Secret you create out-of-band, for example:
#   kubectl create secret docker-registry ghcr-pull \
#     --docker-server=ghcr.io \
#     --docker-username=<github-username> \
#     --docker-password=<github-personal-access-token>
# Leave empty when images are public, or when using `k3d image import` locally.
imagePullSecrets: []
# - name: ghcr-pull

# ----- PWA (nginx serving the Vite build) -----
pwa:
  image:
    name: todo-pwa-vite
    tag: "0.1.0"
  # PWA is stateless; safe to scale horizontally.
  replicaCount: 2
  service:
    port: 80
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi

# ----- API (NestJS + SQLite) -----
api:
  image:
    name: todo-api-nestjs
    tag: "0.1.0"
  # MUST stay 1. SQLite is single-writer and the PersistentVolumeClaim is
  # node-local (ReadWriteOnce). Scaling >1 will corrupt the database.
  # The chart enforces this in PR-B via a {{ fail }} guard in api-deployment.yaml.
  replicaCount: 1
  service:
    port: 3000
  env:
    DATABASE_URL: "file:/data/prod.db"
    PORT: "3000"
    CORS_ALLOWED_ORIGINS: "https://todo.example.com"
  persistence:
    enabled: true
    storageClass: local-path
    accessMode: ReadWriteOnce
    size: 1Gi
    mountPath: /data
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi

# ----- Ingress (single Ingress routes both paths) -----
ingress:
  enabled: true
  # k3s ships Traefik by default; nginx-ingress users set "nginx".
  className: traefik
  host: todo.example.com
  annotations: {}
  # cert-manager / TLS deferred to a follow-up phase.
  tls: []
```

- [ ] **Step 2: Run lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton
```

Expected output (icon INFO is acceptable):

```
==> Linting infra/helm/todo-skeleton
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

- [ ] **Step 3: Confirm values parse cleanly**

```bash
helm template test infra/helm/todo-skeleton --debug 2>&1 | head -20
```

Expected output: header text plus zero rendered manifests; no `Error: ...` line. Values that fail to parse surface here.

- [ ] **Step 4: Commit**

```bash
git add infra/helm/todo-skeleton/values.yaml
git commit -m "feat(infra/helm): populate staging-shaped values.yaml

Image registry, replicas, env, persistence, ingress defaults shaped
for production / Proxmox-k3s. Local k3d differences live in the
values-k3d-local.yaml overlay (next task)."
```

---

## Task 3: Create the `values-k3d-local.yaml` overlay

The overlay is the diff between staging-shaped defaults and the laptop dev loop. Only fields that differ are listed. Helm merges overlay onto base when invoked with `-f values-k3d-local.yaml`.

**Files:**

- Create: `infra/helm/todo-skeleton/values-k3d-local.yaml`

- [ ] **Step 1: Write `values-k3d-local.yaml`**

File: `infra/helm/todo-skeleton/values-k3d-local.yaml`

```yaml
# Overlay for the laptop dev loop (k3d cluster).
# Usage: helm install todo-skeleton infra/helm/todo-skeleton \
#          -f infra/helm/todo-skeleton/values-k3d-local.yaml
#
# Only fields that differ from values.yaml are listed.

# k3d image import bypasses GHCR; no pull secret needed.
imagePullSecrets: []

pwa:
  image:
    tag: "dev"

api:
  image:
    tag: "dev"
  env:
    # Localhost ingress hostname; matches /etc/hosts entry (added in PR-C).
    CORS_ALLOWED_ORIGINS: "http://todo.local"

ingress:
  className: traefik
  host: todo.local
```

- [ ] **Step 2: Lint with overlay, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected output (icon INFO acceptable):

```
==> Linting infra/helm/todo-skeleton
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

- [ ] **Step 3: Render with overlay, expect zero manifests, no error**

```bash
helm template test infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected output: nothing (no resources yet). No error.

- [ ] **Step 4: Commit**

```bash
git add infra/helm/todo-skeleton/values-k3d-local.yaml
git commit -m "feat(infra/helm): add values-k3d-local.yaml overlay

Laptop dev loop differences from staging defaults: tag=dev, host=todo.local,
no pull secret (k3d image import bypasses GHCR)."
```

---

## Task 4: Populate `_helpers.tpl` with named templates

This is the meat of PR-A. The seven named templates below are the reusable building blocks every Kubernetes resource in PR-B and PR-C will call. Files starting with `_` in `templates/` are not rendered as manifests; they only define helpers.

The helpers use Helm's idiomatic `dict "context" . "component" "pwa"` pattern for passing the root context plus a component name. This is the standard shape mature charts (bitnami, ingress-nginx) use; copy it verbatim.

**Files:**

- Modify: `infra/helm/todo-skeleton/templates/_helpers.tpl`

- [ ] **Step 1: Overwrite `_helpers.tpl` with the full helper set**

File: `infra/helm/todo-skeleton/templates/_helpers.tpl`

```
{{/*
Chart name, optionally overridden by .Values.nameOverride.
Used inside label values.
*/}}
{{- define "todo-skeleton.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name. Kubernetes labels and most resource names
have a 63-character limit, so we truncate. If .Release.Name already
contains the chart name, we avoid doubling up.
*/}}
{{- define "todo-skeleton.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Component-scoped resource name: <fullname>-<component>.
Usage:
  {{ include "todo-skeleton.componentName" (dict "context" . "component" "pwa") }}
*/}}
{{- define "todo-skeleton.componentName" -}}
{{- $name := include "todo-skeleton.fullname" .context }}
{{- printf "%s-%s" $name .component | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Standard recommended label set, plus a component label.
Usage:
  {{ include "todo-skeleton.labels" (dict "context" . "component" "pwa") | nindent 4 }}
*/}}
{{- define "todo-skeleton.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .context.Chart.Name .context.Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "todo-skeleton.selectorLabels" . }}
{{- if .context.Chart.AppVersion }}
app.kubernetes.io/version: {{ .context.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .context.Release.Service }}
{{- end }}

{{/*
Minimal stable label subset used for Service.selector and Deployment.matchLabels.
NEVER add labels here that might change between releases — selectors are immutable
once a Deployment is created.
Usage:
  {{ include "todo-skeleton.selectorLabels" (dict "context" . "component" "pwa") | nindent 6 }}
*/}}
{{- define "todo-skeleton.selectorLabels" -}}
app.kubernetes.io/name: {{ include "todo-skeleton.name" .context }}
app.kubernetes.io/instance: {{ .context.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Assemble a fully qualified image reference: <registry>/<repository>/<name>:<tag>
Usage:
  {{ include "todo-skeleton.image" (dict "context" . "name" .Values.pwa.image.name "tag" .Values.pwa.image.tag) }}
*/}}
{{- define "todo-skeleton.image" -}}
{{- $reg := .context.Values.image.registry }}
{{- $repo := .context.Values.image.repository }}
{{- printf "%s/%s/%s:%s" $reg $repo .name .tag }}
{{- end }}

{{/*
Render an imagePullSecrets: block if .Values.imagePullSecrets is non-empty;
render nothing otherwise. Call with the root context directly:
  {{ include "todo-skeleton.imagePullSecrets" . | nindent 6 }}
*/}}
{{- define "todo-skeleton.imagePullSecrets" -}}
{{- with .Values.imagePullSecrets }}
imagePullSecrets:
{{- toYaml . | nindent 0 }}
{{- end }}
{{- end }}
```

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton
```

Expected output (icon INFO acceptable):

```
==> Linting infra/helm/todo-skeleton
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

If lint reports a template parse error, the most likely cause is a mis-typed `{{- ... }}` or mismatched `{{ define }} / {{ end }}` — re-read the helper that the error names and fix in place.

- [ ] **Step 3: Lint with overlay, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected output: same as Step 2.

- [ ] **Step 4: Render and confirm helpers parse**

```bash
helm template test infra/helm/todo-skeleton --debug 2>&1 | tail -20
```

Expected output: header banner showing `# Source: todo-skeleton/templates/_helpers.tpl` was loaded (no manifests rendered — `_helpers.tpl` doesn't produce output). No `Error: ...` line.

- [ ] **Step 5: Smoke-test a helper inline**

Render `componentName` and `image` using `--show-only`-incompatible inline trick: create a one-line throwaway template, render, delete.

```bash
cat > /tmp/_smoke.yaml <<'EOF'
api-name: {{ include "todo-skeleton.componentName" (dict "context" . "component" "api") }}
api-image: {{ include "todo-skeleton.image" (dict "context" . "name" .Values.api.image.name "tag" .Values.api.image.tag) }}
EOF
cp /tmp/_smoke.yaml infra/helm/todo-skeleton/templates/_smoke.yaml
helm template test infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml --show-only templates/_smoke.yaml
rm infra/helm/todo-skeleton/templates/_smoke.yaml
rm /tmp/_smoke.yaml
```

Expected output:

```yaml
---
# Source: todo-skeleton/templates/_smoke.yaml
api-name: test-todo-skeleton-api
api-image: ghcr.io/jonpham/2026-project-todo-skeleton-monorepo/todo-api-nestjs:dev
```

If `api-name` is not `test-todo-skeleton-api`, the `fullname` / `componentName` helpers are wrong. If `api-image` does not match the expected string, the `image` helper is wrong. Fix in place and re-run.

After the smoke test, the smoke files are deleted; confirm with:

```bash
ls infra/helm/todo-skeleton/templates/
```

Expected output:

```
_helpers.tpl
```

Only `_helpers.tpl`. The smoke file is gone.

- [ ] **Step 6: Commit**

```bash
git add infra/helm/todo-skeleton/templates/_helpers.tpl
git commit -m "feat(infra/helm): add named templates to _helpers.tpl

Seven helpers — name, fullname, componentName, labels, selectorLabels,
image, imagePullSecrets — built around the (dict \"context\" . \"component\" ...)
calling convention. Smoke-tested via a throwaway template; helm lint and
helm template both pass on base and k3d overlay."
```

---

## Task 5: Update `PROJECT_STATUS.md` and run final pull-request gates

PR-A's acceptance gate: lint passes on base and overlay, template renders without error, status file reflects current task.

**Files:**

- Modify: `docs/PROJECT_STATUS.md`

- [ ] **Step 1: Update `docs/PROJECT_STATUS.md`**

Replace the existing header block (lines 1–9) with:

```markdown
# Project and Feature Status

**Last completed phase:** Phase 7 — Integration Tests + E2E (GH40, branch `feat/GH37-GH40-w3-pwa-offline-sync`)
**Active feature doc:** `[TODO]GH47_k8s-helm-deploy.md` (Phase 10 — K8s/Helm Deploy, W4)
**Active spec:** `docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md`
**Active plan:** `docs/specs/W4K8sHelmDeploy/2026-05-18-pr-a-chart-scaffold-plan.md` (PR-A)
**Active skill:** superpowers:executing-plans (or subagent-driven-development)
**Branch:** `feat/GH47-k8s-helm-deploy`
**Current step:** PR-A — Chart scaffold (Helm mechanics, no Kubernetes resources)
**Known blockers:** None.
**Next action:** Open PR-A; on merge, rebase the branch and begin PR-B (workloads + storage).
```

Phase Summary table (lines 11–22) is unchanged.

- [ ] **Step 2: Final lint sweep (base + overlay)**

```bash
helm lint infra/helm/todo-skeleton && \
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected output: both invocations report `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Final render sweep (base + overlay)**

```bash
helm template test infra/helm/todo-skeleton && \
helm template test infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected output: zero rendered manifests, no `Error:` line.

- [ ] **Step 4: Confirm changed-file count is within the pull-request cap**

```bash
git diff --stat origin/main..HEAD
```

Expected output: ≤10 files changed. Six is the target (Chart.yaml, .helmignore, values.yaml, values-k3d-local.yaml, \_helpers.tpl, PROJECT_STATUS.md).

- [ ] **Step 5: Commit the status update**

```bash
git add docs/PROJECT_STATUS.md
git commit -m "chore: PROJECT_STATUS to PR-A chart scaffold"
```

---

## Task 6: Open pull request PR-A

The pull request handoff. After this task, the implementation work pauses until PR-A is reviewed and merged. PR-B's plan is written after PR-A merges so it can be rebased onto the latest `main`.

**Files:** None — git/GitHub operations only.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/GH47-k8s-helm-deploy
```

Expected output: branch tracking set up, push reports the commits pushed.

- [ ] **Step 2: Open the pull request**

```bash
gh pr create --base main --head feat/GH47-k8s-helm-deploy \
  --title "feat(infra/helm): PR-A — todo-skeleton Helm chart scaffold (GH47)" \
  --body "$(cat <<'EOF'
## Summary

PR-A of three for Phase 10 (Kubernetes / Helm Deployment, W4). Lands the Helm chart scaffold for the todo-skeleton — chart metadata, staging-shaped values, k3d-local overlay, and reusable named templates. No Kubernetes resources yet; those arrive in PR-B (workloads + storage) and PR-C (ingress + docs).

- Spec: \`docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md\`
- Plan: \`docs/specs/W4K8sHelmDeploy/2026-05-18-pr-a-chart-scaffold-plan.md\`
- Feature doc: \`docs/features/[TODO]GH47_k8s-helm-deploy.md\`

## What changed

- \`infra/helm/todo-skeleton/Chart.yaml\` — chart metadata
- \`infra/helm/todo-skeleton/.helmignore\` — standard exclusion patterns
- \`infra/helm/todo-skeleton/values.yaml\` — staging-shaped defaults (GHCR registry, Traefik ingress, local-path storage)
- \`infra/helm/todo-skeleton/values-k3d-local.yaml\` — overlay for the laptop dev loop
- \`infra/helm/todo-skeleton/templates/_helpers.tpl\` — seven named templates
- \`docs/PROJECT_STATUS.md\` — marks PR-A active

## Test plan

- [ ] \`helm lint infra/helm/todo-skeleton\` passes
- [ ] \`helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml\` passes
- [ ] \`helm template test infra/helm/todo-skeleton\` renders zero manifests with no error (no resources defined yet)
- [ ] \`helm template test infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml\` same
- [ ] Smoke test from Task 4 Step 5 of the plan returns the expected \`api-name\` and \`api-image\` values

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected output: GitHub URL of the new pull request. Capture it; record it in the feature doc's `pr:` frontmatter as part of PR-C.

- [ ] **Step 3: Stop**

Wait for review and merge. Do not begin PR-B planning until PR-A is merged.

---

## Self-Review

**Spec coverage (every PR-A item in the spec maps to a task):**

| Spec requirement                              | Task                                   |
| --------------------------------------------- | -------------------------------------- |
| `Chart.yaml` with metadata                    | Task 1 Step 2                          |
| `.helmignore`                                 | Task 1 Step 3                          |
| Empty/scaffold `values.yaml`                  | Task 1 Step 4                          |
| Populated `values.yaml` matching locked shape | Task 2                                 |
| `values-k3d-local.yaml` overlay               | Task 3                                 |
| `_helpers.tpl` with seven named templates     | Task 4                                 |
| `helm lint` passes base + overlay             | Tasks 1, 2, 3, 4, 5 verification steps |
| `helm template` renders without error         | Tasks 1, 2, 3, 4, 5                    |
| `PROJECT_STATUS.md` updated                   | Task 5                                 |
| Pull request opened                           | Task 6                                 |
| File-count within ≤10 cap                     | Task 5 Step 4                          |

No gaps.

**Placeholder scan:** none of "TBD", "TODO", "implement later", "fill in details", "add error handling", "handle edge cases", or "similar to Task N" appear in any code/command block. Every step has exact content.

**Type consistency:** Helper names and dict keys are consistent across tasks. `name`, `fullname`, `componentName`, `labels`, `selectorLabels`, `image`, `imagePullSecrets` are the only seven defined and only seven referenced. Dict-call convention is `(dict "context" . "component" "<name>")` everywhere except `image` which uses `(dict "context" . "name" ... "tag" ...)` — both shapes are explicit at the call site in Task 4 Step 5.

No issues found.
