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
  -d '{"description":"hello k8s"}'

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
