---
project: "2026-project-todo-skeleton-monorepo"
phase: 10
slug: "k8s-helm-deploy"
status: DONE
step_gating: true
epic_issue: null
branch: "feat/GH47-pr-c-ingress-docs"
pr: "#61"
completed_at: "2026-05-19"
---

# Phase 10 — Kubernetes / Helm Deployment (W4)

## Context

Phase 8 delivers Docker Compose for local development. This phase adds a Helm chart so the
same stack can be deployed to a Kubernetes cluster (e.g. local k3s, EKS, GKE). W4 is a
non-blocking parallel track — it does not gate Phases 6, 7, 8, or 9.

The Helm chart wraps the same two services (PWA via nginx, NestJS API) and a PersistentVolumeClaim
for SQLite. This demonstrates that the skeleton is cluster-deployable, not just Docker Compose.

## Scope

**Included:**

- `infra/helm/todo-skeleton/` — Helm chart with templates for Deployment, Service, Ingress, PVC
- `infra/helm/todo-skeleton/values.yaml` — configurable image tags, replica counts, storage size
- `infra/helm/todo-skeleton/Chart.yaml` — chart metadata
- Basic Ingress for nginx (host-based routing)
- PersistentVolumeClaim for SQLite (`/data` in API pod)
- `README` section documenting `helm install` workflow

**Excluded:**

- Managed databases (RDS, Cloud SQL) — SQLite PVC only in Phase 1
- Horizontal Pod Autoscaler
- cert-manager / TLS
- GitOps (ArgoCD, Flux)
- Multi-environment values overlays (dev/staging/prod)

## Dependencies

- Phase 8 complete (Docker images buildable from monorepo)
- A local Kubernetes cluster available (k3s, minikube, or kind) for verification

## Acceptance Criteria

- [x] `helm lint infra/helm/todo-skeleton` passes with no errors
- [x] `helm install todo-skeleton infra/helm/todo-skeleton` deploys both pods to the cluster
- [x] `kubectl get pods` shows both PWA and API pods in `Running` state
- [x] PWA accessible at the configured Ingress host; creates a todo, todo persists after pod restart
- [x] SQLite data persists across API pod deletion (PVC survives pod lifecycle)
- [x] `helm uninstall todo-skeleton` cleanly removes all resources except the PVC

## Steps

- [x] **Step 1** — Create `infra/helm/todo-skeleton/Chart.yaml`: name, version, appVersion
- [x] **Step 2** — Create `infra/helm/todo-skeleton/values.yaml`: image repositories, tags, replica counts, ingress host, storage size (default 1Gi)
- [x] **Step 3** — Create Deployment templates: `pwa-deployment.yaml` (nginx image), `api-deployment.yaml` (NestJS image, mounts PVC at `/data`, sets `DATABASE_URL`)
- [x] **Step 4** — Create Service templates: `pwa-service.yaml` (ClusterIP), `api-service.yaml` (ClusterIP)
- [x] **Step 5** — Create `pvc.yaml` (PersistentVolumeClaim for SQLite) and `ingress.yaml` (routes `/api/` to API service, `/` to PWA service)
- [x] **Step 6** — Verify on local cluster: `helm install`, check pod health, create todo via ingress host, delete API pod, verify todo survives restart
- [x] **Step 7** — Update this feature doc to DONE

## Technical Notes

- **SQLite in Kubernetes:** SQLite with a PVC works for single-replica deployments. Do NOT set `api` replicas > 1 — concurrent SQLite writers across pods will corrupt the database. The `values.yaml` should default `api.replicaCount: 1` and include a comment warning about this.
- **PVC lifecycle:** Helm does not delete PVCs on `helm uninstall` by default (they are retained). This is intentional — prevents data loss on accidental uninstall. Document this in the chart README.
- **Image build:** The Helm chart references pre-built images. Engineers must `docker build` and push before `helm install`. A future CI step will automate this; for Phase 1 it is manual.
- **Ingress controller:** The chart assumes an nginx Ingress controller is installed in the cluster. For local k3s, Traefik is the default — either install nginx ingress or add a `traefik` values override.
- **`DATABASE_URL` in API pod:** Set via Kubernetes env in the Deployment template: `DATABASE_URL: file:/data/prod.db`. The PVC mounts to `/data`.

## Test Strategy

Manual verification only for Phase 1 — no automated cluster tests. The acceptance criteria
serve as the manual test checklist. L4 automated cluster tests are a Phase 2 concern.

## Assumptions

- Engineers have a local Kubernetes cluster (k3s recommended for simplicity).
- Docker images are built and pushed to a registry accessible by the cluster before `helm install`.
- The Ingress controller is already installed in the cluster.

## Change Log

| Date       | PR           | Status Change | Notes                                                                                                                                                                                                                                                       |
| ---------- | ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|            |              | TODO          | Created for W4 workstream (eng review 2026-04-28)                                                                                                                                                                                                           |
| 2026-05-19 | PR-C (`#61`) | DONE          | Phase 10 complete: PR-A chart scaffold (landed directly on `main` via `2713218`), PR-B workloads + storage (`#60`), PR-C ingress + docs + closure. End-to-end k3d verification passed (todo persists across API pod restart; `helm uninstall` retains PVC). |
