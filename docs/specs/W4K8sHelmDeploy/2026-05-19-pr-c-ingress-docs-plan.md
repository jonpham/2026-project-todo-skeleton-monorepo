# Phase 10 PR-C — Ingress + Docs + Phase Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the external-entry primitive (Ingress + Traefik strip-prefix Middleware), the chart's user-facing README, full end-to-end cluster verification, and Phase 10 closure (feature doc → DONE, status update).

**Architecture:** A single Helm template file ships both a Traefik `Middleware` (strips the `/api` path prefix so NestJS receives the routes it actually defines — `/v1/todos`, `/health`) and an `Ingress` resource that routes host-based traffic into the PWA and API ClusterIP Services landed in PR-B. The Middleware mirrors the strip-prefix behavior already wired into the Docker Compose nginx reverse proxy at `infra/nginx/nginx.conf`, so the in-cluster routing matches the local-dev routing 1:1. The Middleware emits only when `ingress.className == "traefik"`; non-Traefik users supply equivalent rewrite annotations via `ingress.annotations`. The chart README documents the install workflow for both k3d (local) and Proxmox-k3s (staging), including the GHCR pull-secret flow and the `helm uninstall` PVC-retention behavior.

**Tech Stack:** Helm 4.x, k3d 5.8+, kubectl, Kubernetes 1.33 (k3s default), Traefik (k3s default ingress).

**Branching context:** This plan executes on branch `feat/GH47-pr-c-ingress-docs`, branched off `feat/GH47-pr-b-workloads` at the PR-B tip. PR-B is open against `main`; PR-C must therefore target `feat/GH47-pr-b-workloads` initially OR be rebased onto `main` after PR-B merges. The plan assumes the latter (rebase-after-merge) — Task 8 handles the rebase before opening the pull request.

**Scope of this plan (PR-C only):**

- New: `infra/helm/todo-skeleton/templates/ingress.yaml` (Middleware + Ingress, multi-doc)
- New: `infra/helm/todo-skeleton/README.md`
- New: `docs/specs/W4K8sHelmDeploy/2026-05-19-pr-c-ingress-docs-plan.md` (this file)
- Rename + edit: `docs/features/[TODO]GH47_k8s-helm-deploy.md` → `docs/features/[DONE]GH47_k8s-helm-deploy.md`
- Modify: `docs/PROJECT_STATUS.md`

Target: 5 files changed (rename counts as one). Within the AGENTS.md ≤10-file cap.

**Out of scope (deferred follow-ups):**

- GHCR image-build CI workflow (separate follow-up phase).
- Proxmox cluster bring-up.
- cert-manager / TLS issuance.
- Real Kubernetes Secrets management.
- Automated `helm test` resources.

---

## File Structure

| File                                              | Purpose                                                                                                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/helm/todo-skeleton/templates/ingress.yaml` | Two manifests in one file: (1) Traefik `Middleware` that strips the `/api` prefix; (2) `Ingress` that routes `/api` → API Service (with the middleware applied) and `/` → PWA Service. Whole file gated on `ingress.enabled`. |
| `infra/helm/todo-skeleton/README.md`              | Chart usage: prerequisites, k3d local install, Proxmox-k3s install, GHCR pull-secret recipe, single-replica API warning, PVC-retention semantics, override examples, uninstall steps.                                         |
| `docs/features/[DONE]GH47_k8s-helm-deploy.md`     | Renamed from `[TODO]GH47_…`. Frontmatter set to DONE; step checklist fully ticked; change-log entry appended.                                                                                                                 |
| `docs/PROJECT_STATUS.md`                          | Header rewritten: Phase 10 complete; active feature/spec/plan/skill cleared; next action points at Phase 10's follow-ups list.                                                                                                |
| `docs/specs/W4K8sHelmDeploy/2026-05-19-pr-c-…md`  | This plan file.                                                                                                                                                                                                               |

**Test strategy at PR-C:**

- Per-step: `helm lint` (base + overlay) and `helm template --show-only templates/ingress.yaml` after the template lands.
- Final gate: real k3d cluster install with `helm install` against locally-built images imported via `k3d image import`. Full end-to-end loop — curl the API through the ingress, create a todo, delete the API pod, confirm the todo survives the restart, `helm uninstall`, confirm the PersistentVolumeClaim is retained.
- Server-side dry-run is not the gate here (it was the PR-B gate). PR-C's gate is a live cluster.

---

## Task 0: Confirm working state

**Files:** None. Read-only checks.

- [ ] **Step 1: Confirm current branch and upstream state**

```bash
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>&1 || true
git log --oneline -1
```

Expected output:

```
feat/GH47-pr-c-ingress-docs
fatal: no upstream configured for branch 'feat/GH47-pr-c-ingress-docs'
a3c8292 chore: PROJECT_STATUS to PR-B workloads + storage
```

"no upstream configured" is the **expected** safe state (memory: never set upstream to `origin/main` — caused the 2026-05-19 direct-push-to-main incident on PR-A). Do NOT run `git branch --set-upstream-to=origin/main`.

- [ ] **Step 2: Confirm Helm + kubectl + k3d versions**

```bash
helm version --short && kubectl version --client --output=yaml | head -5 && k3d version
```

Expected: Helm 4.x, kubectl 1.27+, k3d 5.6+.

- [ ] **Step 3: Confirm chart still lints clean before any changes**

```bash
helm lint infra/helm/todo-skeleton && \
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: both report `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 4: Confirm Docker buildable images exist or build them now**

```bash
docker images | grep -E "todo-(pwa-vite|api-nestjs)" || true
```

If either image is missing, build now (Task 3 also requires them):

```bash
docker build -t todo-pwa-vite:dev   apps/todo-pwa-vite
docker build -t todo-api-nestjs:dev apps/todo-api-nestjs
```

Expected: both `todo-pwa-vite:dev` and `todo-api-nestjs:dev` present in `docker images`.

No commit.

---

## Task 1: Add the Ingress + Traefik strip-prefix Middleware

This single template file emits two manifests. The Traefik `Middleware` strips `/api` before the request reaches the API Service — mirroring the `proxy_pass http://api:3000/;` trailing-slash strip in `infra/nginx/nginx.conf`. Without it, NestJS (which serves `/v1/todos` and `/health`, no global `/api` prefix) would return 404 for every API call.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/ingress.yaml`

- [ ] **Step 1: Write the Ingress template (Middleware + Ingress)**

File: `infra/helm/todo-skeleton/templates/ingress.yaml`

```yaml
{{- if .Values.ingress.enabled -}}
{{- $apiName := include "todo-skeleton.componentName" (dict "context" . "component" "api") -}}
{{- $pwaName := include "todo-skeleton.componentName" (dict "context" . "component" "pwa") -}}
{{- $fullName := include "todo-skeleton.fullname" . -}}
{{- $isTraefik := eq .Values.ingress.className "traefik" -}}
{{- if $isTraefik }}
# Traefik Middleware: strips the leading /api segment before the request is
# forwarded to the API Service. NestJS does NOT set a global /api prefix;
# its controllers serve /v1/todos and /health directly. This middleware
# mirrors the trailing-slash proxy_pass strip used by the Docker Compose
# nginx reverse proxy at infra/nginx/nginx.conf, so in-cluster routing
# matches local-dev routing 1:1.
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: {{ printf "%s-strip-api" $fullName }}
  labels:
    {{- include "todo-skeleton.labels" (dict "context" . "component" "api") | nindent 4 }}
spec:
  stripPrefix:
    prefixes:
      - /api
---
{{- end }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ $fullName }}
  labels:
    {{- include "todo-skeleton.labels" (dict "context" . "component" "ingress") | nindent 4 }}
  annotations:
    {{- if $isTraefik }}
    # Bind the strip-prefix Middleware above to this Ingress's router.
    # Format: <namespace>-<middleware-name>@kubernetescrd
    traefik.ingress.kubernetes.io/router.middlewares: {{ printf "%s-%s-strip-api@kubernetescrd" .Release.Namespace $fullName }}
    {{- end }}
    {{- with .Values.ingress.annotations }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- with .Values.ingress.tls }}
  tls:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.host | quote }}
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: {{ $apiName }}
                port:
                  number: {{ .Values.api.service.port }}
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ $pwaName }}
                port:
                  number: {{ .Values.pwa.service.port }}
{{- end }}
```

Notes for the engineer:

- The whole file is gated on `.Values.ingress.enabled`. Setting `ingress.enabled: false` produces an empty render — useful for clusters where ingress is managed out-of-band.
- The `Middleware` is only rendered when `ingress.className == "traefik"`. Non-Traefik clusters supply rewrite behavior via `ingress.annotations` (documented in the README, Task 2).
- Path order matters in Kubernetes Ingress: `/api` must precede `/` so the more-specific path matches first. Both use `pathType: Prefix`.
- The `app.kubernetes.io/component: ingress` label is new (PR-B's components were `pwa` and `api`); this is intentional — it makes `kubectl get ingress -l app.kubernetes.io/component=ingress` work.

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render under the k3d overlay and verify key invariants**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/ingress.yaml
```

Expected (key fields — confirm visually):

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: test-todo-skeleton-strip-api
spec:
  stripPrefix:
    prefixes:
      - /api
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-todo-skeleton
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: default-test-todo-skeleton-strip-api@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
    - host: "todo.local"
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: test-todo-skeleton-api
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: test-todo-skeleton-pwa
                port:
                  number: 80
```

- [ ] **Step 4: Verify Middleware suppression for non-Traefik classes**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --set ingress.className=nginx \
  --show-only templates/ingress.yaml | head -40
```

Expected: no `kind: Middleware` document is emitted; the Ingress has `ingressClassName: nginx` and no `traefik.ingress.kubernetes.io/...` annotation. (User-supplied `ingress.annotations` would render in its place — verified in the next step.)

- [ ] **Step 5: Verify the enabled gate**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --set ingress.enabled=false \
  --show-only templates/ingress.yaml 2>&1 | head -5
```

Expected: `Error: could not find template templates/ingress.yaml in chart`. (Same "empty render" semantics as the PVC gate in PR-B.)

- [ ] **Step 6: Commit**

```bash
git add infra/helm/todo-skeleton/templates/ingress.yaml
git commit -m "feat(infra/helm): add Ingress + Traefik strip-prefix Middleware

Single template emits two manifests. Middleware strips /api before
forwarding to the API Service, mirroring the proxy_pass behavior in
infra/nginx/nginx.conf so NestJS receives /v1/todos and /health as it
expects. Middleware gated on ingress.className == traefik; non-Traefik
clusters supply equivalent rewrite annotations via ingress.annotations.
Whole file gated on ingress.enabled."
```

---

## Task 2: Write the chart README

The README is the chart's user-facing documentation. Audience: an engineer who has just cloned this monorepo and wants to install the chart for the first time, either on their laptop (k3d) or on a real Kubernetes cluster (Proxmox-k3s, EKS, GKE).

**Files:**

- Create: `infra/helm/todo-skeleton/README.md`

- [ ] **Step 1: Write the README**

File: `infra/helm/todo-skeleton/README.md`

````markdown
# todo-skeleton Helm chart

Two-service Helm chart for the monorepo's todo skeleton: a Vite progressive web
app (nginx) and a NestJS API backed by a single-writer SQLite database on a
PersistentVolumeClaim. The chart's defaults are shaped for k3s; an overlay
file (`values-k3d-local.yaml`) adapts it to k3d for the laptop dev loop.

## Components

| Resource               | Kind                  | Notes                                                                     |
| ---------------------- | --------------------- | ------------------------------------------------------------------------- |
| `<release>-pwa`        | Deployment            | nginx serving the Vite build. Default 2 replicas.                         |
| `<release>-pwa`        | Service (ClusterIP)   | Port 80.                                                                  |
| `<release>-api`        | Deployment            | NestJS API. **Always 1 replica** (SQLite is single-writer).               |
| `<release>-api`        | Service (ClusterIP)   | Port 3000.                                                                |
| `<release>-api-config` | ConfigMap             | `DATABASE_URL`, `PORT`, `CORS_ALLOWED_ORIGINS`.                           |
| `<release>-api-data`   | PersistentVolumeClaim | SQLite storage. `ReadWriteOnce`, `local-path`. **Retained on uninstall.** |
| `<release>-strip-api`  | Middleware (Traefik)  | Strips `/api` before forwarding to the API Service.                       |
| `<release>`            | Ingress               | Host-based routing: `/api` → API, `/` → PWA.                              |

## Prerequisites

- Kubernetes 1.27+ (chart is tested against 1.33).
- Helm 4.x.
- A `StorageClass` that satisfies `ReadWriteOnce` requests (defaults to `local-path`, which k3s/k3d ship out of the box).
- An ingress controller. Defaults to Traefik (k3s/k3d default). For nginx-ingress, override `ingress.className` and supply `nginx.ingress.kubernetes.io/rewrite-target` annotations (see below).
- Built images available to the cluster (see "Provisioning images" below).

## Quickstart — k3d (local laptop dev loop)

```bash
# 1. Create a k3d cluster with the ingress port mapped to localhost:80.
k3d cluster create todo --port "80:80@loadbalancer"

# 2. Build the app images locally.
docker build -t todo-pwa-vite:dev   apps/todo-pwa-vite
docker build -t todo-api-nestjs:dev apps/todo-api-nestjs

# 3. Import them into the k3d cluster (bypasses any registry).
k3d image import todo-pwa-vite:dev todo-api-nestjs:dev -c todo

# 4. Map the chart's default host onto loopback (one-time).
echo "127.0.0.1 todo.local" | sudo tee -a /etc/hosts

# 5. Install the chart using the k3d overlay.
helm install todo-skeleton infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml

# 6. Wait for both Deployments to become Ready.
kubectl rollout status deploy/todo-skeleton-pwa
kubectl rollout status deploy/todo-skeleton-api

# 7. Hit the API and PWA through the ingress.
curl http://todo.local/api/v1/todos
open http://todo.local
```

The k3d overlay rewrites the image tags to `:dev` and `CORS_ALLOWED_ORIGINS`
to `http://todo.local`. It also sets `imagePullSecrets: []` because
`k3d image import` makes pulling from a registry unnecessary.

## Install on Proxmox-k3s (or any production k3s)

```bash
# 1. Create the GHCR pull secret out-of-band (chart does not own credentials).
kubectl create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-personal-access-token>

# 2. Install with production values (the defaults in values.yaml are
#    staging-shaped). Override the image tag and ingress host as needed.
helm install todo-skeleton infra/helm/todo-skeleton \
  --set imagePullSecrets[0].name=ghcr-pull \
  --set pwa.image.tag=<sha-or-version> \
  --set api.image.tag=<sha-or-version> \
  --set ingress.host=todo.example.com
```

## Values reference (most-overridden fields)

| Key                            | Default                                       | Purpose                                                                                    |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `image.registry`               | `ghcr.io`                                     | OCI registry hosting the app images.                                                       |
| `image.repository`             | `jonpham/2026-project-todo-skeleton-monorepo` | Path under the registry.                                                                   |
| `image.pullPolicy`             | `IfNotPresent`                                | Set to `Always` only if you use mutable tags like `:latest`.                               |
| `imagePullSecrets`             | `[]`                                          | List of `{name: ...}`. Reference a `kubectl create secret docker-registry` Secret by name. |
| `pwa.replicaCount`             | `2`                                           | Stateless nginx; scale freely.                                                             |
| `pwa.image.tag`                | `"0.1.0"`                                     | Override per release.                                                                      |
| `api.replicaCount`             | `1`                                           | **Must stay 1.** Chart aborts `helm install` if set > 1.                                   |
| `api.image.tag`                | `"0.1.0"`                                     | Override per release.                                                                      |
| `api.env.CORS_ALLOWED_ORIGINS` | `https://todo.example.com`                    | Comma-separated origins the API will accept.                                               |
| `api.persistence.enabled`      | `true`                                        | Set false for ephemeral test installs.                                                     |
| `api.persistence.storageClass` | `local-path`                                  | Any `ReadWriteOnce` StorageClass works.                                                    |
| `api.persistence.size`         | `1Gi`                                         | SQLite is tiny; grow as needed.                                                            |
| `ingress.enabled`              | `true`                                        | Disable to manage ingress out-of-band.                                                     |
| `ingress.className`            | `traefik`                                     | Set to `nginx` for nginx-ingress. See "Non-Traefik ingress" below.                         |
| `ingress.host`                 | `todo.example.com`                            | The hostname the Ingress matches.                                                          |
| `ingress.annotations`          | `{}`                                          | Merged into the Ingress's annotations. Use for nginx-ingress rewrites.                     |
| `ingress.tls`                  | `[]`                                          | Standard `IngressTLS` list. cert-manager wiring is a follow-up phase.                      |

## Single-replica API: why and how it's enforced

SQLite is a single-writer database. The PersistentVolumeClaim is `ReadWriteOnce`
(node-local), which means only one pod on one node can mount it at any time.
Running two API replicas would either (a) deadlock on the volume claim, or
(b) — far worse — corrupt the database if both happen to land on the same node.

The chart enforces this with a `{{ fail }}` guard at the top of
`templates/api-deployment.yaml`. Setting `api.replicaCount > 1` aborts
`helm install` with an explanatory error message. To run a multi-replica API,
migrate to a multi-writer datastore (Postgres) and remove the PVC mount.

## PersistentVolumeClaim retention on uninstall

`templates/api-pvc.yaml` is annotated with `helm.sh/resource-policy: keep`.
`helm uninstall` deletes every chart-managed resource **except** the PVC. The
SQLite database survives the uninstall, and a subsequent `helm install` against
the same release name will re-mount the same data.

To truly discard the database:

```bash
helm uninstall todo-skeleton
kubectl delete pvc todo-skeleton-api-data
```

## Non-Traefik ingress controllers

The chart ships a Traefik `Middleware` that strips the `/api` path prefix
before requests reach the API Service. NestJS does not set a global `/api`
prefix; its controllers serve `/v1/todos` and `/health` directly.

For nginx-ingress, the equivalent override:

```yaml
ingress:
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
  # And edit the rule path in templates/ingress.yaml from `/api` to
  # `/api(/|$)(.*)` — or fork the template for nginx-specific use.
```

For other controllers (Contour, HAProxy, AWS LB Controller), supply the
equivalent path-rewrite mechanism via `ingress.annotations`.

## Verification recipe (post-install smoke test)

```bash
# Both pods Running
kubectl get pods -l app.kubernetes.io/instance=todo-skeleton

# API reachable through the ingress
curl http://todo.local/api/v1/todos

# Create a todo
curl -X POST http://todo.local/api/v1/todos \
  -H 'content-type: application/json' \
  -d '{"title":"hello k8s"}'

# Verify persistence across pod restart
kubectl delete pod -l app.kubernetes.io/component=api
kubectl rollout status deploy/todo-skeleton-api
curl http://todo.local/api/v1/todos   # the created todo is still there
```

## Known limitations / follow-ups

- No automated image-build CI yet (manual `docker build` + `k3d image import` or GHCR push).
- No cert-manager / TLS in this phase.
- No HorizontalPodAutoscaler. API can't scale by design; PWA could but
  doesn't yet.
- No real Secrets (no credentials in the chart yet — `DATABASE_URL` is a
  filesystem path).
- Tested on k3d 5.8 / k3s 1.33 / Helm 4.2.
````

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`. (Helm lint also checks README presence on chart submissions; ours is a private chart but the file's presence is good hygiene.)

- [ ] **Step 3: Commit**

```bash
git add infra/helm/todo-skeleton/README.md
git commit -m "docs(infra/helm): add chart README

User-facing chart docs: components table, k3d and Proxmox-k3s install
recipes, GHCR pull-secret workflow, single-replica API rationale,
PVC retention semantics, non-Traefik override guidance, and a post-install
smoke test."
```

---

## Task 3: End-to-end cluster verification

This is the acceptance gate for Phase 10 as a whole. Up to here we've validated template rendering and server-side dry-runs. Now we install the chart against a real cluster, exercise the full request path through the ingress, and confirm storage durability.

**Files:** None. Cluster operations only.

- [ ] **Step 1: Create a fresh k3d cluster with the ingress port mapped to loopback**

```bash
k3d cluster create todo-prc --port "80:80@loadbalancer" --wait
```

Expected: `INFO[...] Cluster 'todo-prc' created successfully!`. Takes ~30s.

- [ ] **Step 2: Confirm kubectl context**

```bash
kubectl config current-context
```

Expected: `k3d-todo-prc`.

- [ ] **Step 3: Wait for Traefik to finish initializing**

```bash
kubectl rollout status deploy/traefik -n kube-system --timeout=120s
```

Expected: `deployment "traefik" successfully rolled out`. The Middleware CRD (`traefik.io/v1alpha1`) is installed by Traefik; if Traefik isn't up the chart install will fail with "no matches for kind Middleware".

- [ ] **Step 4: Confirm `todo.local` resolves to loopback**

```bash
getent hosts todo.local || grep -E '^[^#]*todo\.local' /etc/hosts
```

Expected: a line resolving `todo.local` to `127.0.0.1`. If missing, add it:

```bash
echo "127.0.0.1 todo.local" | sudo tee -a /etc/hosts
```

- [ ] **Step 5: Ensure both app images are loaded into the cluster**

The chart's image helper always renders `<image.registry>/<image.repository>/<name>:<tag>`, so the local Docker tags must match that full reference exactly. Bare-name imports (`todo-pwa-vite:dev`) will _not_ satisfy the rendered Deployment spec — the kubelet will fall through to a GHCR pull and fail (403 if the package is private).

```bash
REG="ghcr.io/jonpham/2026-project-todo-skeleton-monorepo"
docker tag todo-pwa-vite:dev   "$REG/todo-pwa-vite:dev"   2>/dev/null || true
docker tag todo-api-nestjs:dev "$REG/todo-api-nestjs:dev" 2>/dev/null || true
k3d image import "$REG/todo-pwa-vite:dev" "$REG/todo-api-nestjs:dev" -c todo-prc
```

Expected: import lines for each image, no error. If either image is missing locally, rebuild via Task 0 Step 4 (and tag with the full `$REG/` reference from the start to skip the `docker tag` step).

- [ ] **Step 6: Install the chart with the k3d overlay**

```bash
helm install todo-skeleton infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `NAME: todo-skeleton ... STATUS: deployed ... REVISION: 1`.

- [ ] **Step 7: Confirm both Deployments reach Ready**

```bash
kubectl rollout status deploy/todo-skeleton-pwa --timeout=120s
kubectl rollout status deploy/todo-skeleton-api --timeout=120s
kubectl get pods -l app.kubernetes.io/instance=todo-skeleton
```

Expected: both rollouts succeed; `kubectl get pods` shows the PWA pods (2) and the API pod (1) all `Running`, `1/1` ready.

If a pod is `ImagePullBackOff`, re-run Step 5 — k3d's image import is cluster-scoped, and a fresh cluster needs a fresh import.

- [ ] **Step 8: Smoke-test the API through the ingress**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://todo.local/api/v1/todos
```

Expected: `200`. If `404`, the strip-prefix Middleware likely didn't bind — check `kubectl get middleware` and the Ingress annotation.

- [ ] **Step 9: Create a todo and read it back**

```bash
curl -sS -X POST http://todo.local/api/v1/todos \
  -H 'content-type: application/json' \
  -d '{"description":"phase-10 persistence test"}'
curl -sS http://todo.local/api/v1/todos
```

Expected: a JSON array containing the just-created todo with the description `"phase-10 persistence test"`. Note the post body key is `description` (per the API's contract from PR-B notes); adjust if your local API schema uses `title`.

- [ ] **Step 10: Delete the API pod and verify durability**

```bash
kubectl delete pod -l app.kubernetes.io/component=api
kubectl rollout status deploy/todo-skeleton-api --timeout=60s
curl -sS http://todo.local/api/v1/todos
```

Expected: the deleted pod is replaced (Recreate strategy waits for old pod termination before scheduling new), and the returned JSON still contains `"phase-10 persistence test"`. Persistence proven.

- [ ] **Step 11: Smoke-test the PWA through the ingress**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://todo.local/
```

Expected: `200`. (The HTML body itself is not inspected — the index.html landing is enough to prove `/` routes to the PWA Service.)

- [ ] **Step 12: Uninstall and confirm PVC retention**

```bash
helm uninstall todo-skeleton
kubectl get pvc
kubectl get all -l app.kubernetes.io/instance=todo-skeleton
```

Expected:

- `helm uninstall` reports `release "todo-skeleton" uninstalled`.
- `kubectl get pvc` still lists `todo-skeleton-api-data` (the `helm.sh/resource-policy: keep` annotation prevents deletion).
- `kubectl get all -l app.kubernetes.io/instance=todo-skeleton` reports `No resources found` — all Deployments, Services, ConfigMaps, and the Ingress are gone.

- [ ] **Step 13: Tear the cluster down**

```bash
k3d cluster delete todo-prc
```

Expected: `INFO[...] Successfully deleted cluster todo-prc!`.

No commit.

---

## Task 4: Update the feature doc (rename + frontmatter + checklist)

**Files:**

- Rename: `docs/features/[TODO]GH47_k8s-helm-deploy.md` → `docs/features/[DONE]GH47_k8s-helm-deploy.md`
- Modify the renamed file in place.

- [ ] **Step 1: Rename the file via git**

```bash
git mv docs/features/[TODO]GH47_k8s-helm-deploy.md docs/features/[DONE]GH47_k8s-helm-deploy.md
```

Expected: no output; `git status` shows a rename.

- [ ] **Step 2: Update the frontmatter**

In `docs/features/[DONE]GH47_k8s-helm-deploy.md`, replace lines 1–11 with:

```yaml
---
project: "2026-project-todo-skeleton-monorepo"
phase: 10
slug: "k8s-helm-deploy"
status: DONE
step_gating: true
epic_issue: null
branch: "feat/GH47-pr-c-ingress-docs"
pr: "<set after Task 8 opens the PR>"
completed_at: "2026-05-19"
---
```

After Task 8 opens the PR, replace `<set after Task 8 opens the PR>` with the actual PR number (e.g. `"#NN"`).

- [ ] **Step 3: Tick the Steps checklist**

Find the `## Steps` section in the same file and turn every `- [ ]` into `- [x]` (Steps 1 through 7).

- [ ] **Step 4: Tick the Acceptance Criteria checklist**

Find the `## Acceptance Criteria` section in the same file and turn every `- [ ]` into `- [x]` — all six criteria were exercised end-to-end in Task 3.

- [ ] **Step 5: Append a change-log entry**

In the `## Change Log` table at the end of the file, append a new row below the existing TODO row:

```markdown
| 2026-05-19 | PR-C (`#<NN>`) | DONE | Phase 10 complete: PR-A chart scaffold (#<A>), PR-B workloads + storage (#<B>), PR-C ingress + docs + closure. End-to-end k3d verification passed (todo persists across API pod restart; `helm uninstall` retains PVC). |
```

Fill in PR numbers after Task 8. Leave the placeholder format `#<NN>` if you don't yet know them; correct in a follow-up commit before merge.

- [ ] **Step 6: Commit**

```bash
git add docs/features
git commit -m "docs(features): mark Phase 10 GH47 k8s-helm-deploy DONE

Rename [TODO]GH47_… → [DONE]GH47_…; frontmatter status=DONE with
branch and completed_at; Steps and Acceptance Criteria fully ticked;
change-log entry for PR-C and Phase 10 closure."
```

---

## Task 5: Update `docs/PROJECT_STATUS.md`

**Files:**

- Modify: `docs/PROJECT_STATUS.md`

- [ ] **Step 1: Rewrite the status header**

Replace the existing header block (lines 1–10) of `docs/PROJECT_STATUS.md` with:

```markdown
# Project and Feature Status

**Last completed phase:** Phase 10 — K8s/Helm Deploy (GH47, branch `feat/GH47-pr-c-ingress-docs`)
**Active feature doc:** None — all roadmap phases (1–10) complete.
**Active spec:** None.
**Active plan:** None.
**Active skill:** None.
**Branch:** None (Phase 10 closed; next work starts a new branch).
**Current step:** Phase 10 ships PR-C; awaiting merge. After merge, the project's first ten phases are all DONE.
**Known blockers:** None.
**Next action:** Plan the GHCR image-build CI workflow follow-up, or stand up the Proxmox k3s cluster. Both are listed in `docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md` under "Follow-Up Phases".
```

- [ ] **Step 2: Update the Phase Summary table**

In the same file, find the Phase 10 row:

```markdown
| Phase 10 — K8s/Helm Deploy (W4) | `[TODO]GH47_k8s-helm-deploy.md` | 🔲 Todo (parallel) |
```

Replace with:

```markdown
| Phase 10 — K8s/Helm Deploy (W4) | `[DONE]GH47_k8s-helm-deploy.md` | ✅ Done |
```

- [ ] **Step 3: Commit**

```bash
git add docs/PROJECT_STATUS.md
git commit -m "chore: PROJECT_STATUS — Phase 10 complete; no active phase"
```

---

## Task 6: Stage the plan file itself and run final repository gates

The plan file is a tracked artifact under `docs/specs/`. It must be committed as part of PR-C.

**Files:**

- Add: `docs/specs/W4K8sHelmDeploy/2026-05-19-pr-c-ingress-docs-plan.md`

- [ ] **Step 1: Stage and commit the plan**

```bash
git add docs/specs/W4K8sHelmDeploy/2026-05-19-pr-c-ingress-docs-plan.md
git commit -m "docs(specs): add PR-C ingress + docs + closure plan

Implementation plan for Phase 10 PR-C. Drives ingress.yaml,
chart README, end-to-end cluster verification, and Phase 10 closure."
```

- [ ] **Step 2: Final chart lint sweep (base + overlay)**

```bash
helm lint infra/helm/todo-skeleton && \
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: both invocations report `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Final full render (overlay) — kind/name summary**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  | grep -E '^kind:|^  name:' | head -30
```

Expected output (eight resources rendered, in a stable order — Middleware and Ingress join the six from PR-B):

```
kind: ConfigMap
  name: test-todo-skeleton-api-config
kind: Deployment
  name: test-todo-skeleton-api
kind: Deployment
  name: test-todo-skeleton-pwa
kind: Ingress
  name: test-todo-skeleton
kind: Middleware
  name: test-todo-skeleton-strip-api
kind: PersistentVolumeClaim
  name: test-todo-skeleton-api-data
kind: Service
  name: test-todo-skeleton-api
kind: Service
  name: test-todo-skeleton-pwa
```

- [ ] **Step 4: Confirm changed-file count is within the AGENTS.md cap**

```bash
git diff --stat $(git merge-base HEAD main)..HEAD -- . ':(exclude)pnpm-lock.yaml' ':(exclude)pnpm-workspace.yaml'
```

If PR-B is not yet merged, the merge-base will be at `main`'s tip pre-PR-B, and the diff will include both PR-B's 8 files and PR-C's new files. That is over the cap **only because PR-B isn't yet merged**. After Task 7's rebase onto post-merge `main`, the same command will report PR-C's files only.

Expected at this point (still based on PR-B's tip, PR-B not yet merged):

```
... ~13 files ...
```

That's expected pre-rebase. Do not panic.

Expected after Task 7's rebase (PR-B merged into `main`):

```
infra/helm/todo-skeleton/README.md                                 | NNN ++++
infra/helm/todo-skeleton/templates/ingress.yaml                    |  NN +++
docs/features/[DONE]GH47_k8s-helm-deploy.md (renamed from [TODO]…) |   N +-
docs/PROJECT_STATUS.md                                             |   N +-
docs/specs/W4K8sHelmDeploy/2026-05-19-pr-c-ingress-docs-plan.md    | NNN ++++
5 files changed, ...
```

Five files, well under the 10-file cap.

No commit.

---

## Task 7: Rebase onto post-merge `main` (only after PR-B merges)

**Files:** None — git operations only.

**Precondition:** PR-B has been merged into `main`. If PR-B is still open, **stop here** and resume Task 7 after PR-B merges.

- [ ] **Step 1: Confirm PR-B is merged**

```bash
gh pr view <PR-B-number> --json state,mergedAt
```

Expected: `"state": "MERGED"`. If `"OPEN"`, stop and resume later.

- [ ] **Step 2: Fetch the latest `main`**

```bash
git fetch origin main
```

Expected: a fast-forward fetch line (or nothing if already up to date).

- [ ] **Step 3: Rebase the PR-C branch onto the updated `main`**

```bash
git rebase origin/main
```

Expected: clean fast-forward / replay. Every PR-C commit (Tasks 1, 2, 4, 5, 6) replays on top of the merged PR-B history with no conflicts — PR-C's files are all new or PR-B-orthogonal.

If a conflict occurs in `docs/PROJECT_STATUS.md` (likely, since PR-B also edits it), open the file, keep the PR-C version of the header (Phase 10 complete), accept the PR-B-merged Phase Summary table form for Phase 10, and:

```bash
git add docs/PROJECT_STATUS.md
git rebase --continue
```

- [ ] **Step 4: Verify file count after rebase**

```bash
git diff --stat main..HEAD -- . ':(exclude)pnpm-lock.yaml' ':(exclude)pnpm-workspace.yaml' | tail -2
```

Expected: 5 files changed, under the 10-file cap.

- [ ] **Step 5: Re-run lint after rebase**

```bash
helm lint infra/helm/todo-skeleton && \
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: both pass. (Sanity check; rebases sometimes drop a brace.)

No commit.

---

## Task 8: Open pull request PR-C (the safe way)

Same explicit-refspec push pattern from PR-B Task 9. Memory: never use `git push -u` with ambiguous tracking.

**Files:** None — git/GitHub operations only.

- [ ] **Step 1: Push the branch using an explicit refspec**

```bash
git push origin feat/GH47-pr-c-ingress-docs:refs/heads/feat/GH47-pr-c-ingress-docs
```

Expected:

```
remote:
remote: Create a pull request for 'feat/GH47-pr-c-ingress-docs' on GitHub by visiting:
remote:    https://github.com/jonpham/2026-project-todo-skeleton-monorepo/pull/new/feat/GH47-pr-c-ingress-docs
remote:
To github.com:jonpham/2026-project-todo-skeleton-monorepo.git
 * [new branch]      feat/GH47-pr-c-ingress-docs -> feat/GH47-pr-c-ingress-docs
```

- [ ] **Step 2: Set upstream tracking now that the remote branch exists**

```bash
git branch --set-upstream-to=origin/feat/GH47-pr-c-ingress-docs feat/GH47-pr-c-ingress-docs
git rev-parse --abbrev-ref --symbolic-full-name '@{u}'
```

Expected: `origin/feat/GH47-pr-c-ingress-docs`.

- [ ] **Step 3: Open the pull request**

```bash
gh pr create --base main --head feat/GH47-pr-c-ingress-docs \
  --title "feat(infra/helm): PR-C — todo-skeleton ingress + docs + Phase 10 closure (GH47)" \
  --body "$(cat <<'EOF'
## Summary

PR-C of three for Phase 10 (Kubernetes / Helm Deployment, W4). Adds the external-entry primitive (Traefik Middleware + Ingress), the chart's user-facing README, and the Phase 10 closure artifacts (feature doc → DONE, PROJECT_STATUS update).

- Spec: \`docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md\`
- Plan: \`docs/specs/W4K8sHelmDeploy/2026-05-19-pr-c-ingress-docs-plan.md\`
- Feature doc: \`docs/features/[DONE]GH47_k8s-helm-deploy.md\`

## What changed

- \`templates/ingress.yaml\` — Traefik strip-prefix Middleware (mirrors \`infra/nginx/nginx.conf\` strip behavior) + Ingress routing \`/api\` → API and \`/\` → PWA. Middleware emits only when \`ingress.className == traefik\`.
- \`README.md\` — chart usage, k3d + Proxmox-k3s install recipes, single-replica rationale, PVC retention semantics, non-Traefik override guidance.
- Feature doc renamed \`[TODO]\` → \`[DONE]\`, frontmatter status=DONE, full checklist tick.
- \`docs/PROJECT_STATUS.md\` — Phase 10 complete; no active phase.

## Test plan

- [x] \`helm lint\` passes on base and overlay
- [x] \`helm template\` renders eight resources with expected names
- [x] Middleware suppressed when \`ingress.className != traefik\`
- [x] \`ingress.enabled=false\` produces empty render
- [x] k3d \`helm install\` succeeds; both Deployments reach Ready
- [x] \`curl http://todo.local/api/v1/todos\` returns 200
- [x] Created todo survives \`kubectl delete pod -l app.kubernetes.io/component=api\`
- [x] \`helm uninstall\` removes everything except the PVC
- [x] File-count within ≤10 cap (5 files)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: GitHub URL of the new pull request.

- [ ] **Step 4: Backfill the PR number into the feature doc**

Edit `docs/features/[DONE]GH47_k8s-helm-deploy.md`:

- Frontmatter `pr:` → the actual PR-C number (e.g. `"#48"`).
- Change-log row PR cell → the same number.

```bash
git add docs/features/[DONE]GH47_k8s-helm-deploy.md
git commit -m "docs(features): backfill PR-C number into Phase 10 feature doc"
git push
```

- [ ] **Step 5: Stop**

Wait for review and merge. Phase 10 closes when PR-C lands.

---

## Self-Review

**Spec coverage (every PR-C item in the spec maps to a task):**

| Spec requirement                                                            | Task                        |
| --------------------------------------------------------------------------- | --------------------------- |
| `templates/ingress.yaml` with host-based routing                            | Task 1                      |
| Strip-prefix mechanism (mirror Docker Compose nginx behavior)               | Task 1 (Traefik Middleware) |
| `infra/helm/todo-skeleton/README.md` — install workflow for k3d and k3s     | Task 2                      |
| End-to-end k3d cluster verification (helm install → curl → pod-delete loop) | Task 3                      |
| PVC retained on `helm uninstall`                                            | Task 3 Step 12              |
| Feature doc `[TODO]` → `[DONE]` with frontmatter and checklist tick         | Task 4                      |
| `docs/PROJECT_STATUS.md` updated                                            | Task 5                      |
| File-count within ≤10 cap                                                   | Task 6 Step 4               |
| Pull request opened safely (explicit refspec)                               | Task 8                      |

No gaps.

**Placeholder scan:** No matches for "TBD", "implement later", "fill in details", "add error handling", "handle edge cases", "similar to Task N", or unspecified "Write tests for the above". The two intentional placeholders (`<NN>` PR number, `<A>`/`<B>` for PR-A/PR-B numbers in the change-log row) are explicitly flagged as "backfill in Task 8 Step 4".

**Type consistency:** Helper invocations in `ingress.yaml` use the established `(dict "context" . "component" "...")` shape from PR-A/PR-B. Resource names: `$fullName` (release+chart) for the Ingress itself; `componentName` for PWA/API Service backends; `printf "%s-strip-api" $fullName` for the Middleware. Backend port references go through `.Values.api.service.port` and `.Values.pwa.service.port`, matching the Services landed in PR-B. The Middleware annotation reference uses `<release-namespace>-<middleware-name>@kubernetescrd` per Traefik's binding format.

**Cross-PR coupling check:** PR-C does not modify any PR-B file. Conflict on rebase is only possible in `docs/PROJECT_STATUS.md` (both PRs edit it). Task 7 Step 3 handles that explicitly.

No issues found.
