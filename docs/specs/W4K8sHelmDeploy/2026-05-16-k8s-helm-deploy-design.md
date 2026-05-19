---
title: "Phase 10 — Kubernetes / Helm Deployment (W4) Design"
date: 2026-05-16
phase: 10
feature_doc: "docs/features/[TODO]GH47_k8s-helm-deploy.md"
status: draft
---

# Phase 10 — Kubernetes / Helm Deployment (W4) Design

## Purpose

Add a Helm chart so the existing two-service stack (PWA via nginx, NestJS API with SQLite)
can be deployed to a Kubernetes cluster. The chart is the skeleton's proof that the same
images we build for Docker Compose work in Kubernetes, and that the deployment shape we
ship locally is the same shape that will eventually run on a self-hosted k3s cluster on
Proxmox.

This phase delivers the chart only. It does not stand up the Proxmox cluster, does not
automate image builds in CI, and does not introduce TLS, autoscaling, or GitOps. Those
are deliberate follow-ups.

## Locked Decisions

| Decision                   | Choice                                                 | Rationale                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local cluster flavor       | **k3d** (k3s in Docker)                                | Same distribution as the eventual Proxmox staging (k3s). Same default ingress (Traefik) and storage class (`local-path`). Maximum parity between local and staging.          |
| Image registry             | **GHCR** (`ghcr.io`)                                   | Auth already wired into the monorepo (`GITHUB_TOKEN`). Free for public images. Lowest-friction path that survives the local → Proxmox transition.                            |
| Image build automation     | **Manual for Phase 10** (`docker buildx build --push`) | Explicitly scoped out by the feature doc. CI image-build workflow is a separately-trackable follow-up.                                                                       |
| Image pull credentials     | **Reference-by-name only** (`imagePullSecrets: [...]`) | Chart does not own credentials. Users create the `docker-registry` Secret with `kubectl create secret` out-of-band and reference it by name. Keeps the chart safe to commit. |
| Chart layout               | **Per-app template files** + strong `_helpers.tpl`     | Skeleton clarity over template DRY. Scales by adding files, not by adding conditionals. Mirrors how mature charts (bitnami, ingress-nginx) are structured.                   |
| API replica count          | **Pinned to 1**                                        | SQLite is single-writer; `local-path` PVC is node-local (`ReadWriteOnce`). Multi-replica would corrupt the database.                                                         |
| PWA replica count          | **2 by default**                                       | Stateless nginx; safe to scale. Teaches the stateful/stateless distinction in the same chart.                                                                                |
| Storage class              | **`local-path`** (k3s default)                         | Works on both k3d and Proxmox-k3s without configuration. Override via values for clusters that ship different defaults.                                                      |
| Ingress controller         | **Traefik** by default                                 | k3s/k3d ship Traefik out of the box. Override `ingress.className` for nginx-ingress users.                                                                                   |
| PVC retention on uninstall | **Keep** (`helm.sh/resource-policy: keep`)             | Prevents accidental data loss on `helm uninstall`. Matches the feature doc's acceptance criterion.                                                                           |

## Out of Scope

- Managed databases (RDS, Cloud SQL); SQLite Peristent Volume Claim (PVC) only.
- Horizontal Pod Autoscaler.
- cert-manager / TLS termination.
- GitOps (ArgoCD, Flux).
- Multi-environment values overlays beyond `values.yaml` (staging-shaped) and `values-k3d-local.yaml`.
- Automated CI image build workflow. **Tracked as a follow-up phase** (will populate GHCR on every merge to `main`, tagging by short SHA + `latest`).
- Automated cluster tests. Phase 10 ships manual verification only.
- RBAC / dedicated ServiceAccount.
- Real Kubernetes Secrets (no credentials to hold yet; `DATABASE_URL` is a path).
- Standing up the Proxmox cluster itself.

## Architecture

### Chart Directory Layout

```
infra/helm/todo-skeleton/
├── Chart.yaml                       # chart metadata
├── values.yaml                      # staging-shaped defaults
├── values-k3d-local.yaml            # overlay for the laptop dev loop
├── README.md                        # install workflow for k3d and Proxmox-k3s
├── .helmignore
└── templates/
    ├── _helpers.tpl                 # named templates: labels, image, fullname, etc.
    ├── pwa-deployment.yaml
    ├── pwa-service.yaml
    ├── api-deployment.yaml
    ├── api-service.yaml
    ├── api-configmap.yaml           # non-secret env (CORS_ALLOWED_ORIGINS, PORT, DATABASE_URL)
    ├── api-pvc.yaml                 # PersistentVolumeClaim for SQLite, "keep" policy
    └── ingress.yaml                 # single Ingress: /api/ → api Service, / → pwa Service
```

### Component Inventory

| Resource                | Kind                  | Source File           | Purpose                                        |
| ----------------------- | --------------------- | --------------------- | ---------------------------------------------- |
| `<fullname>-pwa`        | Deployment            | `pwa-deployment.yaml` | nginx serving the Vite PWA build               |
| `<fullname>-pwa`        | Service (ClusterIP)   | `pwa-service.yaml`    | In-cluster endpoint for the PWA pods           |
| `<fullname>-api`        | Deployment            | `api-deployment.yaml` | NestJS API; mounts PVC at `/data`              |
| `<fullname>-api`        | Service (ClusterIP)   | `api-service.yaml`    | In-cluster endpoint for the API pods           |
| `<fullname>-api-config` | ConfigMap             | `api-configmap.yaml`  | `PORT`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS` |
| `<fullname>-api-data`   | PersistentVolumeClaim | `api-pvc.yaml`        | SQLite storage, `ReadWriteOnce`, `local-path`  |
| `<fullname>`            | Ingress               | `ingress.yaml`        | Host-based routing into both Services          |

`<fullname>` is assembled by `todo-skeleton.fullname` from release name + chart name, truncated to 63 chars.

### Data Flow

External request → cluster Ingress controller (Traefik) → matches `host: <ingress.host>` →

- Path `/api/*` → `<fullname>-api` Service (port 3000) → API pod (NestJS) → SQLite file on PVC at `/data/prod.db`
- Path `/*` → `<fullname>-pwa` Service (port 80) → PWA pod (nginx) → Vite static build

Inside the API pod: `DATABASE_URL=file:/data/prod.db`. `/data` is the mount point of the PVC (`local-path` provisioned). Pod restart → PVC re-mounts → same file → todos persist.

### `_helpers.tpl` — Named Templates

| Helper                                     | Returns                                                 | Used by                                      |
| ------------------------------------------ | ------------------------------------------------------- | -------------------------------------------- |
| `todo-skeleton.name`                       | chart name (truncated 63)                               | label values                                 |
| `todo-skeleton.fullname`                   | release name + chart name (truncated 63)                | resource names                               |
| `todo-skeleton.componentName <component>`  | `<fullname>-<component>` (e.g. `-pwa`, `-api`)          | resource names, selectors                    |
| `todo-skeleton.labels <component>`         | full `app.kubernetes.io/*` label set + component        | resource `metadata.labels`                   |
| `todo-skeleton.selectorLabels <component>` | minimal stable subset for selector ↔ pod label matching | Service `selector`, Deployment `matchLabels` |
| `todo-skeleton.image <component>`          | `<registry>/<repository>/<image.name>:<image.tag>`      | Deployment `containers[].image`              |
| `todo-skeleton.imagePullSecrets`           | rendered `imagePullSecrets:` block or nothing           | Deployment pod spec                          |

### values.yaml Shape

```yaml
image:
  registry: ghcr.io
  repository: jonpham/2026-project-todo-skeleton-monorepo
  pullPolicy: IfNotPresent

imagePullSecrets: []
# - name: ghcr-pull

pwa:
  image:
    name: todo-pwa-vite
    tag: "0.1.0"
  replicaCount: 2
  service:
    port: 80
  resources:
    requests: { cpu: 50m, memory: 64Mi }
    limits: { cpu: 200m, memory: 128Mi }

api:
  image:
    name: todo-api-nestjs
    tag: "0.1.0"
  # MUST stay 1. SQLite is single-writer and the PVC is node-local (ReadWriteOnce).
  # Scaling >1 will corrupt the database. See README.
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
    requests: { cpu: 100m, memory: 128Mi }
    limits: { cpu: 500m, memory: 256Mi }

ingress:
  enabled: true
  className: traefik
  host: todo.example.com
  annotations: {}
  tls: []
```

### `values-k3d-local.yaml` Overlay

```yaml
imagePullSecrets: []
pwa:
  image: { tag: "dev" }
api:
  image: { tag: "dev" }
  env:
    CORS_ALLOWED_ORIGINS: "http://todo.local"
ingress:
  className: traefik
  host: todo.local
```

### Probes

| App | Probe     | Endpoint                       | Initial Delay | Period | Failure Threshold |
| --- | --------- | ------------------------------ | ------------- | ------ | ----------------- |
| PWA | readiness | HTTP GET `/` (port 80)         | 5s            | 10s    | 3                 |
| PWA | liveness  | HTTP GET `/` (port 80)         | 15s           | 20s    | 5                 |
| API | readiness | HTTP GET `/health` (port 3000) | 5s            | 10s    | 3                 |
| API | liveness  | HTTP GET `/health` (port 3000) | 15s           | 20s    | 5                 |

`readinessProbe` gates traffic to the pod (Service won't route to it until ready). `livenessProbe` restarts the container if it hangs. Liveness is intentionally more forgiving than readiness so transient slowness doesn't trigger restart loops.

## PR Sequencing

AGENTS.md caps pull requests at ≤10 changed files (lockfile exemptions only). Phase 10 totals ~15 files (5 chart-root + 8 templates + 2 docs), so the work splits into three sequential pull requests against the same feature branch `feat/GH47-k8s-helm-deploy`. Each PR is independently meaningful, independently lintable, and bounded by a teaching theme.

| PR                               | Theme                                                                                                                                          | Files                                                                                                                                                                                                            | Approx. count | Acceptance gate                                                                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR-A — Chart scaffold**        | Helm mechanics: chart structure, values, named templates. Zero Kubernetes resources yet.                                                       | `Chart.yaml`, `values.yaml`, `values-k3d-local.yaml`, `.helmignore`, `templates/_helpers.tpl`, `docs/PROJECT_STATUS.md`                                                                                          | 6             | `helm lint` passes (base + overlay); `helm template` renders empty manifest set without error.                                                                                                                                            |
| **PR-B — Workloads + storage**   | Kubernetes workload primitives: Deployment, Service, ConfigMap, PersistentVolumeClaim. Both apps deployable in-cluster, no external entry yet. | `templates/pwa-deployment.yaml`, `templates/api-deployment.yaml`, `templates/pwa-service.yaml`, `templates/api-service.yaml`, `templates/api-configmap.yaml`, `templates/api-pvc.yaml`, `docs/PROJECT_STATUS.md` | 7             | `helm lint`, `helm template -f values-k3d-local.yaml`, and `kubectl apply --dry-run=server` all pass. Optional cluster smoke: `helm install`, both deployments reach `Ready`, in-cluster `kubectl exec` curl of the API service succeeds. |
| **PR-C — Ingress + docs + done** | External entry + documentation + phase closure.                                                                                                | `templates/ingress.yaml`, `infra/helm/todo-skeleton/README.md`, feature doc rename `[TODO]GH47_…` → `[DONE]GH47_…`, `docs/PROJECT_STATUS.md`                                                                     | 4             | Full end-to-end verification (k3d image import → `helm install` → ingress curl → pod delete → todo persists → `helm uninstall` → PVC retained). Feature doc frontmatter set to DONE with branch/PR/completed_at.                          |

**Why this split (teaching rationale):**

- **Cognitive load per review.** A reviewer of PR-A only needs Helm scaffolding context. They never have to evaluate a Deployment or an Ingress in the same review. PR-B introduces Kubernetes workload primitives in isolation. PR-C adds the single new concept (Ingress) plus closure.
- **Failure isolation.** If PR-B's chart fails to render valid Kubernetes manifests, the bug is provably inside the 7 template-related files — not tangled with chart structure or ingress routing.
- **Each PR stands alone.** PR-A merged-but-not-PR-B leaves a valid (if empty-of-resources) Helm chart. PR-B merged-but-not-PR-C leaves a fully deployable in-cluster stack; only external entry is missing. The repo never lands in a broken half-state.
- **Maps to natural test gates.** PR-A → lint. PR-B → lint + server-side dry-run. PR-C → real cluster install.

**Branching mechanics.** All three PRs target `main` from the same branch `feat/GH47-k8s-helm-deploy`. PR-A merges first; PR-B is rebased on the new `main` (now containing PR-A) and merged; PR-C follows. Alternative — stacked branches — is acceptable if the user prefers, but sequential single-branch is simpler and matches the AGENTS.md guidance.

## Implementation Steps (mirrors feature doc)

The chart is built in feature-doc order. Each step is independently verifiable via `helm lint` + `helm template | kubectl apply --dry-run=client`. Full cluster verification is reserved for Step 6. Step boundaries map to PR boundaries as noted.

1. **Chart skeleton** — `Chart.yaml`, empty `values.yaml`, empty `templates/_helpers.tpl`, `.helmignore`. `helm lint` passes against the empty chart. _(PR-A)_
2. **`values.yaml`** populated as specified above; `values-k3d-local.yaml` overlay added; `_helpers.tpl` populated with the seven named templates. Lint still passes against both base and overlay. _(PR-A)_
3. **Deployment templates** — `pwa-deployment.yaml` and `api-deployment.yaml` consuming the helpers; API includes PersistentVolumeClaim volume mount and ConfigMap `envFrom` (the referenced ConfigMap and PVC files arrive in Step 5). _(PR-B)_
4. **Service templates** — `pwa-service.yaml`, `api-service.yaml` (both ClusterIP). _(PR-B)_
5. **`api-configmap.yaml`**, **`api-pvc.yaml`** (with `helm.sh/resource-policy: keep`). After this step `helm template -f values-k3d-local.yaml | kubectl apply --dry-run=server -f -` passes against a real cluster. _(PR-B)_
6. **`ingress.yaml`** + chart **`README.md`**, then end-to-end cluster verification: build images, `k3d image import`, `helm install`, hit the API through the ingress, create a todo, delete the API pod, confirm the todo survives. `helm uninstall`, confirm the PVC remains. _(PR-C)_
7. **Feature doc → DONE.** Update frontmatter (`status: DONE`, `branch`, `pr`, `completed_at`), rename file `[TODO]` → `[DONE]`, tick step checklist, update `PROJECT_STATUS.md`. _(PR-C)_

## Verification Commands

Per-step (no cluster required):

```bash
helm lint    infra/helm/todo-skeleton
helm lint    infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
helm template infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  | kubectl apply --dry-run=client -f -
```

End-to-end (Step 6):

```bash
k3d cluster create todo --port "80:80@loadbalancer"

docker build -t todo-pwa-vite:dev   apps/todo-pwa-vite
docker build -t todo-api-nestjs:dev apps/todo-api-nestjs
k3d image import todo-pwa-vite:dev todo-api-nestjs:dev -c todo

echo "127.0.0.1 todo.local" | sudo tee -a /etc/hosts   # one-time

helm install todo-skeleton infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml

kubectl rollout status deploy/todo-skeleton-pwa
kubectl rollout status deploy/todo-skeleton-api

curl http://todo.local/api/v1/todos                            # API reachable
curl -X POST http://todo.local/api/v1/todos \
  -H 'content-type: application/json' \
  -d '{"title":"persistence test"}'

kubectl delete pod -l app.kubernetes.io/component=api
kubectl rollout status deploy/todo-skeleton-api
curl http://todo.local/api/v1/todos                            # todo still there

helm uninstall todo-skeleton
kubectl get pvc                                                # PVC retained
```

## Acceptance Mapping

| Feature-doc criterion                                            | How this design satisfies it                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| `helm lint` passes                                               | Per-step verification block runs lint after every change          |
| `helm install` deploys both pods                                 | Step 6 cluster verification                                       |
| Both pods reach `Running`                                        | Probes are well-defined; `kubectl rollout status` waits for ready |
| PWA accessible at Ingress host; todo persists across pod restart | Step 6 includes the create + delete pod + re-fetch loop           |
| SQLite survives API pod deletion                                 | PVC mounted at `/data`; `DATABASE_URL=file:/data/prod.db`         |
| `helm uninstall` removes everything except PVC                   | `helm.sh/resource-policy: keep` annotation on the PVC             |

## Risks & Mitigations

| Risk                                                           | Mitigation                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineer scales `api.replicaCount > 1` and corrupts SQLite     | Inline comment in `values.yaml` + warning in README. Considered: a Helm fail-on-bad-values guard via `{{- if gt (int .Values.api.replicaCount) 1 }}{{ fail "..." }}{{ end }}`. **Adopted** — it's a one-line guard that converts a foot-gun into an explicit refusal at `helm install`. |
| `local-path` storage class not present on a target cluster     | `storageClass` is overridable; README documents this.                                                                                                                                                                                                                                   |
| Traefik not the ingress controller on Proxmox cluster          | `ingress.className` is overridable.                                                                                                                                                                                                                                                     |
| GHCR images private without pull secret configured             | README documents the `kubectl create secret docker-registry ghcr-pull` workflow.                                                                                                                                                                                                        |
| `k3d image import` forgotten → pod stuck in `ImagePullBackOff` | `values-k3d-local.yaml` sets `pullPolicy: IfNotPresent`; README sequences the import before `helm install`.                                                                                                                                                                             |

## Open Questions (resolved before implementation)

None — all decisions locked in the table above.

## Follow-Up Phases (Not in This Spec)

- **GHCR image-build CI workflow.** Build and push both app images on every merge to `main`, tagging by short SHA + `latest`. Chart `appVersion` and per-app tags tracked by SHA.
- **Proxmox cluster bring-up.** Provision the k3s cluster on Proxmox VMs; first real `helm install` against staging.
- **TLS via cert-manager.** Add Issuer/Certificate resources, wire `ingress.tls`.
- **Real Secrets management.** ExternalSecrets or SealedSecrets, once any real credentials enter the chart.
- **Automated cluster tests** (Helm `helm test`, or Kyverno policy checks).
