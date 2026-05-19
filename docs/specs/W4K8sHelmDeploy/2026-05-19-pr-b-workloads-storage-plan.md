# Phase 10 PR-B — Workloads + Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the Kubernetes workload primitives — Deployment, Service, ConfigMap, PersistentVolumeClaim — for both apps so the chart is deployable in-cluster, without external entry. End state: `helm template -f values-k3d-local.yaml | kubectl apply --dry-run=server -f -` passes against a real k3d cluster.

**Architecture:** Per-app template files calling the named templates from `_helpers.tpl` (landed in PR-A). The API deployment carries the special concerns — single-replica enforcement via `{{ fail }}` guard, `Recreate` rolling-update strategy (RollingUpdate would deadlock on a node-local PVC), ConfigMap-sourced env, and PVC-backed `/data` mount. The PWA is plain stateless nginx. Each manifest is verified with a per-template smoke-render before committing.

**Tech Stack:** Helm 4.2.0, k3d 5.8.3, kubectl, Kubernetes 1.33 (k3s default).

**Scope of this plan (PR-B only):** Six new template files under `infra/helm/todo-skeleton/templates/` — `pwa-deployment.yaml`, `pwa-service.yaml`, `api-deployment.yaml`, `api-service.yaml`, `api-configmap.yaml`, `api-pvc.yaml` — plus a `PROJECT_STATUS.md` update. Eight files total in the diff (six templates + plan + status).

**Out of scope for this plan:** Ingress (`templates/ingress.yaml`), chart `README.md`, feature-doc rename to `[DONE]`, end-to-end cluster verification with real images — all PR-C.

---

## File Structure

| File                                                     | Purpose                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `infra/helm/todo-skeleton/templates/pwa-deployment.yaml` | nginx Deployment serving the Vite build. Stateless, 2 replicas, simple probes.                                                                   |
| `infra/helm/todo-skeleton/templates/pwa-service.yaml`    | ClusterIP Service fronting the PWA pods.                                                                                                         |
| `infra/helm/todo-skeleton/templates/api-configmap.yaml`  | Non-secret env (`DATABASE_URL`, `PORT`, `CORS_ALLOWED_ORIGINS`) consumed via `envFrom`.                                                          |
| `infra/helm/todo-skeleton/templates/api-pvc.yaml`        | PersistentVolumeClaim for SQLite at `/data`. `ReadWriteOnce`, `local-path`, `helm.sh/resource-policy: keep`. Gated on `api.persistence.enabled`. |
| `infra/helm/todo-skeleton/templates/api-deployment.yaml` | NestJS API Deployment. Single replica (enforced by `{{ fail }}` guard), `Recreate` strategy, PVC mount, ConfigMap envFrom.                       |
| `infra/helm/todo-skeleton/templates/api-service.yaml`    | ClusterIP Service fronting the API pods.                                                                                                         |
| `docs/PROJECT_STATUS.md`                                 | Mark PR-B active.                                                                                                                                |

**Test strategy at PR-B:**

- After each template lands, render it with `helm template --show-only` under the `values-k3d-local.yaml` overlay and grep for key invariants (resource name, image ref, label set, ports, mount path). This is the snapshot-style assertion.
- Run `helm lint` after every commit. Each task's lint must pass before moving on.
- Final gate (Task 7): spin up a k3d cluster and run `kubectl apply --dry-run=server` against the rendered manifests. Server-side dry-run validates against actual Kubernetes API schemas, catching anything client-side validation misses.
- No production image pull yet — the cluster never actually runs the containers in PR-B. That's PR-C.

---

## Task 0: Confirm branch and tooling state

**Files:** None. Read-only checks.

- [ ] **Step 1: Confirm current branch is `feat/GH47-pr-b-workloads` with no upstream**

```bash
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>&1 || true
```

Expected output:

```
feat/GH47-pr-b-workloads
fatal: no upstream configured for branch 'feat/GH47-pr-b-workloads'
```

The "no upstream configured" error is the **expected** safe state — it prevents the direct-push-to-main pitfall from PR-A. Do not run `git branch --set-upstream-to=origin/main` for any reason.

- [ ] **Step 2: Confirm Helm + kubectl + k3d versions**

```bash
helm version --short && kubectl version --client --output=yaml | head -5 && k3d version
```

Expected: Helm 4.x, kubectl 1.27+, k3d 5.6+.

- [ ] **Step 3: Confirm chart starts in a clean state**

```bash
helm lint infra/helm/todo-skeleton && \
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: both report `1 chart(s) linted, 0 chart(s) failed`.

No commit.

---

## Task 1: Add the PWA Deployment

The PWA is the simpler of the two Deployments. Land it first to validate the helper-call patterns from PR-A against a real manifest.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/pwa-deployment.yaml`

- [ ] **Step 1: Write the PWA Deployment**

File: `infra/helm/todo-skeleton/templates/pwa-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "todo-skeleton.componentName" (dict "context" . "component" "pwa") }}
  labels:
    {{- include "todo-skeleton.labels" (dict "context" . "component" "pwa") | nindent 4 }}
spec:
  replicas: {{ .Values.pwa.replicaCount }}
  selector:
    matchLabels:
      {{- include "todo-skeleton.selectorLabels" (dict "context" . "component" "pwa") | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "todo-skeleton.labels" (dict "context" . "component" "pwa") | nindent 8 }}
    spec:
      {{- include "todo-skeleton.imagePullSecrets" . | nindent 6 }}
      containers:
        - name: pwa
          image: {{ include "todo-skeleton.image" (dict "context" . "name" .Values.pwa.image.name "tag" .Values.pwa.image.tag) }}
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 80
              name: http
              protocol: TCP
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
            failureThreshold: 5
          resources:
            {{- toYaml .Values.pwa.resources | nindent 12 }}
```

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render the PWA Deployment under the k3d overlay and verify key fields**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/pwa-deployment.yaml
```

Expected (key invariants — confirm visually):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-todo-skeleton-pwa
  labels:
    helm.sh/chart: todo-skeleton-0.1.0
    app.kubernetes.io/name: todo-skeleton
    app.kubernetes.io/instance: test
    app.kubernetes.io/component: pwa
    app.kubernetes.io/version: "0.1.0"
    app.kubernetes.io/managed-by: Helm
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: todo-skeleton
      app.kubernetes.io/instance: test
      app.kubernetes.io/component: pwa
  template:
    metadata:
      labels:
        helm.sh/chart: todo-skeleton-0.1.0
        app.kubernetes.io/name: todo-skeleton
        app.kubernetes.io/instance: test
        app.kubernetes.io/component: pwa
        app.kubernetes.io/version: "0.1.0"
        app.kubernetes.io/managed-by: Helm
    spec:
      containers:
        - name: pwa
          image: ghcr.io/jonpham/2026-project-todo-skeleton-monorepo/todo-pwa-vite:dev
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
              name: http
              protocol: TCP
          readinessProbe: { ... }
          livenessProbe: { ... }
          resources: { ... }
```

If the rendered name is not `test-todo-skeleton-pwa` or the image is not `ghcr.io/.../todo-pwa-vite:dev`, the helper calls or values are wrong. Fix in place and re-run.

- [ ] **Step 4: Commit**

```bash
git add infra/helm/todo-skeleton/templates/pwa-deployment.yaml
git commit -m "feat(infra/helm): add PWA Deployment template

Stateless nginx, 2 replicas, HTTP probes on /, resources from values.
Renders to test-todo-skeleton-pwa under the k3d overlay.
helm lint and template both clean."
```

---

## Task 2: Add the PWA Service

ClusterIP Service fronting the PWA pods. Selector targets the Deployment's pod labels via `selectorLabels`.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/pwa-service.yaml`

- [ ] **Step 1: Write the PWA Service**

File: `infra/helm/todo-skeleton/templates/pwa-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name:
    {
      {
        include "todo-skeleton.componentName" (dict "context" . "component" "pwa"),
      },
    }
  labels:
    {
      {
        - include "todo-skeleton.labels" (dict "context" . "component" "pwa") | nindent 4,
      },
    }
spec:
  type: ClusterIP
  ports:
    - name: http
      port: { { .Values.pwa.service.port } }
      targetPort: http
      protocol: TCP
  selector:
    {
      {
        - include "todo-skeleton.selectorLabels" (dict "context" . "component" "pwa") | nindent 4,
      },
    }
```

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render and verify**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/pwa-service.yaml
```

Expected key invariants:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: test-todo-skeleton-pwa
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app.kubernetes.io/name: todo-skeleton
    app.kubernetes.io/instance: test
    app.kubernetes.io/component: pwa
```

The Service name must match the Deployment name (both `test-todo-skeleton-pwa`). Kubernetes allows this because Service and Deployment are distinct resource kinds.

- [ ] **Step 4: Commit**

```bash
git add infra/helm/todo-skeleton/templates/pwa-service.yaml
git commit -m "feat(infra/helm): add PWA Service template

ClusterIP, port 80, targetPort http (named port from the Deployment).
Selector matches the Deployment's pod labels via selectorLabels helper."
```

---

## Task 3: Add the API ConfigMap

Holds `DATABASE_URL`, `PORT`, `CORS_ALLOWED_ORIGINS`. The API Deployment (Task 5) will consume this via `envFrom: configMapRef`. ConfigMap is the right primitive for non-secret config — Secrets are reserved for actual credentials, which we don't have yet.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/api-configmap.yaml`

- [ ] **Step 1: Write the API ConfigMap**

File: `infra/helm/todo-skeleton/templates/api-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ printf "%s-config" (include "todo-skeleton.componentName" (dict "context" . "component" "api")) }}
  labels:
    {{- include "todo-skeleton.labels" (dict "context" . "component" "api") | nindent 4 }}
data:
  {{- range $k, $v := .Values.api.env }}
  {{ $k }}: {{ $v | quote }}
  {{- end }}
```

The `range` walks the `.Values.api.env` map and emits one `key: value` pair per env var. Quoting is essential — Kubernetes requires ConfigMap data values to be strings, and unquoted numbers (e.g. `PORT: 3000`) would be rejected by the API server.

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render and verify**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/api-configmap.yaml
```

Expected key invariants:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-todo-skeleton-api-config
  labels:
    app.kubernetes.io/component: api
    ...
data:
  CORS_ALLOWED_ORIGINS: "http://todo.local"
  DATABASE_URL: "file:/data/prod.db"
  PORT: "3000"
```

The overlay rewrites `CORS_ALLOWED_ORIGINS` to `http://todo.local`. `DATABASE_URL` and `PORT` come from the base values.

- [ ] **Step 4: Commit**

```bash
git add infra/helm/todo-skeleton/templates/api-configmap.yaml
git commit -m "feat(infra/helm): add API ConfigMap template

Maps .Values.api.env to ConfigMap data entries. Values quoted to satisfy
the Kubernetes string-type requirement. Consumed by the API Deployment
via envFrom (next task)."
```

---

## Task 4: Add the API PersistentVolumeClaim

The PersistentVolumeClaim is the storage handle for SQLite. Gated on `api.persistence.enabled` so the chart can be deployed against an ephemeral filesystem (for tests, etc.) by setting `api.persistence.enabled: false`. Annotated with `helm.sh/resource-policy: keep` so `helm uninstall` will not delete it — that policy is critical for preventing accidental data loss.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/api-pvc.yaml`

- [ ] **Step 1: Write the API PersistentVolumeClaim**

File: `infra/helm/todo-skeleton/templates/api-pvc.yaml`

```yaml
{{- if .Values.api.persistence.enabled }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ printf "%s-data" (include "todo-skeleton.componentName" (dict "context" . "component" "api")) }}
  labels:
    {{- include "todo-skeleton.labels" (dict "context" . "component" "api") | nindent 4 }}
  annotations:
    # Tells Helm to never delete this resource on `helm uninstall`. Prevents
    # accidental data loss; the operator must `kubectl delete pvc <name>`
    # manually when they truly want to discard the database.
    "helm.sh/resource-policy": keep
spec:
  accessModes:
    - {{ .Values.api.persistence.accessMode }}
  storageClassName: {{ .Values.api.persistence.storageClass }}
  resources:
    requests:
      storage: {{ .Values.api.persistence.size }}
{{- end }}
```

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render and verify**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/api-pvc.yaml
```

Expected:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-todo-skeleton-api-data
  annotations:
    helm.sh/resource-policy: keep
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
```

- [ ] **Step 4: Verify the persistence gate works (rendering with `enabled: false` produces no manifest)**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --set api.persistence.enabled=false \
  --show-only templates/api-pvc.yaml
```

Expected output: `Error: could not find template templates/api-pvc.yaml in chart` — this is the **expected** behavior. When the file renders to empty (because the outer `{{- if ... }}` is false), `--show-only` reports it as "not found". That confirms the gate is working.

- [ ] **Step 5: Commit**

```bash
git add infra/helm/todo-skeleton/templates/api-pvc.yaml
git commit -m "feat(infra/helm): add API PersistentVolumeClaim template

ReadWriteOnce, local-path StorageClass, 1Gi from values. Annotated with
helm.sh/resource-policy: keep so helm uninstall preserves the database.
Gated on .Values.api.persistence.enabled; setting it false renders empty."
```

---

## Task 5: Add the API Deployment

The complex one. Four concerns layered into a single template:

1. **Replica guard.** `{{ fail }}` if `api.replicaCount > 1` — SQLite plus ReadWriteOnce PVC would corrupt the database. The guard converts a foot-gun into an explicit refusal at `helm install` time.
2. **`Recreate` rolling-update strategy.** The default `RollingUpdate` strategy would deadlock here: Kubernetes tries to bring up the new pod before terminating the old, but both want to mount the same `ReadWriteOnce` PVC and only one node can hold the lock. `Recreate` terminates the old pod first, then schedules the new.
3. **ConfigMap envFrom.** Pulls all keys from `<fullname>-api-config` into the container as env vars. Cleaner than inline `env:` when several env vars share a config source.
4. **PVC volume mount.** Mounts the PVC at `.Values.api.persistence.mountPath` (default `/data`). The Deployment template gates both the `volumeMounts` entry and the `volumes` entry on `persistence.enabled` so the same template works ephemeral or persistent.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/api-deployment.yaml`

- [ ] **Step 1: Write the API Deployment**

File: `infra/helm/todo-skeleton/templates/api-deployment.yaml`

```yaml
{{- if gt (int .Values.api.replicaCount) 1 -}}
{{- fail "api.replicaCount must be 1. SQLite is single-writer and the PersistentVolumeClaim is node-local (ReadWriteOnce); scaling > 1 will corrupt the database. To deploy multiple API replicas, switch to a multi-writer datastore (e.g. Postgres) and remove the PVC mount from the API Deployment." -}}
{{- end -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "todo-skeleton.componentName" (dict "context" . "component" "api") }}
  labels:
    {{- include "todo-skeleton.labels" (dict "context" . "component" "api") | nindent 4 }}
spec:
  # Recreate: terminate old pod before starting new. Required because
  # ReadWriteOnce PVCs allow only one node to mount at a time; RollingUpdate
  # would deadlock waiting for the new pod to mount what the old still holds.
  strategy:
    type: Recreate
  replicas: {{ .Values.api.replicaCount }}
  selector:
    matchLabels:
      {{- include "todo-skeleton.selectorLabels" (dict "context" . "component" "api") | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "todo-skeleton.labels" (dict "context" . "component" "api") | nindent 8 }}
    spec:
      {{- include "todo-skeleton.imagePullSecrets" . | nindent 6 }}
      containers:
        - name: api
          image: {{ include "todo-skeleton.image" (dict "context" . "name" .Values.api.image.name "tag" .Values.api.image.tag) }}
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.api.service.port }}
              name: http
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ printf "%s-config" (include "todo-skeleton.componentName" (dict "context" . "component" "api")) }}
          {{- if .Values.api.persistence.enabled }}
          volumeMounts:
            - name: data
              mountPath: {{ .Values.api.persistence.mountPath }}
          {{- end }}
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
            failureThreshold: 5
          resources:
            {{- toYaml .Values.api.resources | nindent 12 }}
      {{- if .Values.api.persistence.enabled }}
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: {{ printf "%s-data" (include "todo-skeleton.componentName" (dict "context" . "component" "api")) }}
      {{- end }}
```

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render and verify**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/api-deployment.yaml
```

Expected key invariants:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-todo-skeleton-api
spec:
  strategy:
    type: Recreate
  replicas: 1
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/jonpham/2026-project-todo-skeleton-monorepo/todo-api-nestjs:dev
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - configMapRef:
                name: test-todo-skeleton-api-config
          volumeMounts:
            - name: data
              mountPath: /data
          readinessProbe: { httpGet: { path: /health, port: http }, ... }
          livenessProbe: { httpGet: { path: /health, port: http }, ... }
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: test-todo-skeleton-api-data
```

If any of these names, ports, or paths drift, fix in place.

- [ ] **Step 4: Verify the replica guard fires when `replicaCount > 1`**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --set api.replicaCount=2 \
  --show-only templates/api-deployment.yaml 2>&1 | head -5
```

Expected output (the `{{ fail }}` directive aborts rendering with a clear message):

```
Error: execution error at (todo-skeleton/templates/api-deployment.yaml:2:4): api.replicaCount must be 1. SQLite is single-writer and the PersistentVolumeClaim is node-local (ReadWriteOnce); scaling > 1 will corrupt the database. To deploy multiple API replicas, switch to a multi-writer datastore (e.g. Postgres) and remove the PVC mount from the API Deployment.
```

That error is the success signal. The guard converted a silent data-corruption foot-gun into a noisy, explanatory refusal.

- [ ] **Step 5: Commit**

```bash
git add infra/helm/todo-skeleton/templates/api-deployment.yaml
git commit -m "feat(infra/helm): add API Deployment template

NestJS API container with envFrom ConfigMap, /data PVC mount, /health
probes. strategy: Recreate (required for single-replica + RWO PVC; RollingUpdate
would deadlock). Includes {{ fail }} guard that aborts helm install when
api.replicaCount > 1 with an explanatory error pointing to the SQLite
single-writer constraint."
```

---

## Task 6: Add the API Service

ClusterIP Service fronting the API pods. Same shape as the PWA Service from Task 2.

**Files:**

- Create: `infra/helm/todo-skeleton/templates/api-service.yaml`

- [ ] **Step 1: Write the API Service**

File: `infra/helm/todo-skeleton/templates/api-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name:
    {
      {
        include "todo-skeleton.componentName" (dict "context" . "component" "api"),
      },
    }
  labels:
    {
      {
        - include "todo-skeleton.labels" (dict "context" . "component" "api") | nindent 4,
      },
    }
spec:
  type: ClusterIP
  ports:
    - name: http
      port: { { .Values.api.service.port } }
      targetPort: http
      protocol: TCP
  selector:
    {
      {
        - include "todo-skeleton.selectorLabels" (dict "context" . "component" "api") | nindent 4,
      },
    }
```

- [ ] **Step 2: Lint, expect pass**

```bash
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected: `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Render and verify**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  --show-only templates/api-service.yaml
```

Expected:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: test-todo-skeleton-api
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 3000
      targetPort: http
      protocol: TCP
  selector:
    app.kubernetes.io/name: todo-skeleton
    app.kubernetes.io/instance: test
    app.kubernetes.io/component: api
```

- [ ] **Step 4: Commit**

```bash
git add infra/helm/todo-skeleton/templates/api-service.yaml
git commit -m "feat(infra/helm): add API Service template

ClusterIP, port 3000, targetPort http. Mirrors the PWA Service shape;
selector targets the API Deployment's pod labels via selectorLabels helper."
```

---

## Task 7: Cluster dry-run validation against a real k3d cluster

Up to here we have only verified template syntax and rendering. Server-side dry-run sends the rendered manifests to a real Kubernetes API server, which validates them against actual schemas (catches things client-side schema validation misses, like invalid `storageClassName` references, port conflicts, or label-selector immutability checks). After this task passes, the chart is provably deployable.

**Files:** None. Cluster operations only.

- [ ] **Step 1: Create a throwaway k3d cluster**

```bash
k3d cluster create todo-prb --wait
```

Expected output: `INFO[...] Cluster 'todo-prb' created successfully!`. The cluster takes ~30 seconds to come up.

- [ ] **Step 2: Confirm kubectl context points at the new cluster**

```bash
kubectl config current-context
```

Expected output:

```
k3d-todo-prb
```

- [ ] **Step 3: Wait for the cluster's default Traefik install to finish initializing**

```bash
kubectl rollout status deploy/traefik -n kube-system --timeout=120s
```

Expected output: `deployment "traefik" successfully rolled out`. We do not use Traefik in PR-B (Ingress lands in PR-C), but waiting prevents flaky behavior on the next steps.

- [ ] **Step 4: Server-side dry-run apply of the rendered chart**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  | kubectl apply --dry-run=server -f -
```

Expected output (each resource reports `(server dry run)`):

```
configmap/test-todo-skeleton-api-config created (server dry run)
deployment.apps/test-todo-skeleton-api created (server dry run)
deployment.apps/test-todo-skeleton-pwa created (server dry run)
persistentvolumeclaim/test-todo-skeleton-api-data created (server dry run)
service/test-todo-skeleton-api created (server dry run)
service/test-todo-skeleton-pwa created (server dry run)
```

Any `Error: ...` line is a real schema violation. Read it, fix the offending template, re-render, re-apply.

- [ ] **Step 5: Tear the cluster down**

```bash
k3d cluster delete todo-prb
```

Expected output: `INFO[...] Successfully deleted cluster todo-prb!`.

No commit.

---

## Task 8: Update `PROJECT_STATUS.md` and run final pull-request gates

**Files:**

- Modify: `docs/PROJECT_STATUS.md`

- [ ] **Step 1: Update the status header**

Replace the existing header block (lines 1–10) of `docs/PROJECT_STATUS.md` with:

```markdown
# Project and Feature Status

**Last completed phase:** Phase 7 — Integration Tests + E2E (GH40, branch `feat/GH37-GH40-w3-pwa-offline-sync`)
**Active feature doc:** `[TODO]GH47_k8s-helm-deploy.md` (Phase 10 — K8s/Helm Deploy, W4)
**Active spec:** `docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md`
**Active plan:** `docs/specs/W4K8sHelmDeploy/2026-05-19-pr-b-workloads-storage-plan.md` (PR-B — Workloads + storage)
**Active skill:** superpowers:executing-plans
**Branch:** `feat/GH47-pr-b-workloads`
**Current step:** PR-B — Workloads + storage complete locally; cluster dry-run-server passed. Awaiting PR open + review.
**Known blockers:** None.
**Next action:** Open PR-B; on merge, rebase the branch and begin PR-C (ingress + docs + phase closure).
```

The Phase Summary table (lines 12+) is unchanged.

- [ ] **Step 2: Final lint sweep (base + overlay)**

```bash
helm lint infra/helm/todo-skeleton && \
helm lint infra/helm/todo-skeleton -f infra/helm/todo-skeleton/values-k3d-local.yaml
```

Expected output: both invocations report `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Final full render under the overlay**

```bash
helm template test infra/helm/todo-skeleton \
  -f infra/helm/todo-skeleton/values-k3d-local.yaml \
  | grep -E '^kind:|^  name:' | head -20
```

Expected output (six kinds, six names):

```
kind: ConfigMap
  name: test-todo-skeleton-api-config
kind: Deployment
  name: test-todo-skeleton-api
kind: Deployment
  name: test-todo-skeleton-pwa
kind: PersistentVolumeClaim
  name: test-todo-skeleton-api-data
kind: Service
  name: test-todo-skeleton-api
kind: Service
  name: test-todo-skeleton-pwa
```

- [ ] **Step 4: Confirm changed-file count is within the pull-request cap**

```bash
git diff --stat main..HEAD
```

Expected output: 8 files changed (six templates + this plan + PROJECT_STATUS.md). Under the 10-file cap.

- [ ] **Step 5: Commit the status update**

```bash
git add docs/PROJECT_STATUS.md
git commit -m "chore: PROJECT_STATUS to PR-B workloads + storage"
```

---

## Task 9: Open pull request PR-B (the safe way)

Per the lesson learned from PR-A: use an explicit refspec on the first push so the upstream tracking ambiguity cannot push to main.

**Files:** None — git/GitHub operations only.

- [ ] **Step 1: Push the branch using an explicit refspec**

```bash
git push origin feat/GH47-pr-b-workloads:refs/heads/feat/GH47-pr-b-workloads
```

The explicit `:refs/heads/...` refspec guarantees the push lands on a new remote branch with the same name, regardless of upstream tracking state. Do NOT use the `-u` flag here — that's the form that misfired on PR-A.

Expected output:

```
remote:
remote: Create a pull request for 'feat/GH47-pr-b-workloads' on GitHub by visiting:
remote:    https://github.com/jonpham/2026-project-todo-skeleton-monorepo/pull/new/feat/GH47-pr-b-workloads
remote:
To github.com:jonpham/2026-project-todo-skeleton-monorepo.git
 * [new branch]      feat/GH47-pr-b-workloads -> feat/GH47-pr-b-workloads
```

- [ ] **Step 2: Set upstream tracking now that the remote branch exists**

```bash
git branch --set-upstream-to=origin/feat/GH47-pr-b-workloads feat/GH47-pr-b-workloads
git rev-parse --abbrev-ref --symbolic-full-name '@{u}'
```

Expected output: `origin/feat/GH47-pr-b-workloads`. Now safe to use bare `git push` on subsequent commits.

- [ ] **Step 3: Open the pull request**

```bash
gh pr create --base main --head feat/GH47-pr-b-workloads \
  --title "feat(infra/helm): PR-B — todo-skeleton workloads + storage (GH47)" \
  --body "$(cat <<'EOF'
## Summary

PR-B of three for Phase 10 (Kubernetes / Helm Deployment, W4). Adds Kubernetes workload primitives — Deployment, Service, ConfigMap, PersistentVolumeClaim — for both apps. Chart is now in-cluster deployable; external entry (Ingress) lands in PR-C.

- Spec: \`docs/specs/W4K8sHelmDeploy/2026-05-16-k8s-helm-deploy-design.md\`
- Plan: \`docs/specs/W4K8sHelmDeploy/2026-05-19-pr-b-workloads-storage-plan.md\`
- Feature doc: \`docs/features/[TODO]GH47_k8s-helm-deploy.md\`

## What changed

- \`templates/pwa-deployment.yaml\` — nginx Deployment, 2 replicas, HTTP probes
- \`templates/pwa-service.yaml\` — ClusterIP Service, port 80
- \`templates/api-configmap.yaml\` — env from \`.Values.api.env\`
- \`templates/api-pvc.yaml\` — ReadWriteOnce, local-path, \`helm.sh/resource-policy: keep\`
- \`templates/api-deployment.yaml\` — NestJS API, single-replica enforced, Recreate strategy, PVC mount at /data, ConfigMap envFrom, /health probes
- \`templates/api-service.yaml\` — ClusterIP Service, port 3000
- \`docs/PROJECT_STATUS.md\` — marks PR-B active

## Test plan

- [ ] \`helm lint\` passes on base and overlay
- [ ] \`helm template\` renders six resources with the expected names
- [ ] Setting \`api.replicaCount=2\` triggers the \`{{ fail }}\` guard with an explanatory message
- [ ] \`helm template ... | kubectl apply --dry-run=server\` reports six resources as \`created (server dry run)\` against a real k3d cluster

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected output: the GitHub URL of the new pull request.

- [ ] **Step 4: Stop**

Wait for review and merge. Do not begin PR-C planning until PR-B is merged.

---

## Self-Review

**Spec coverage (every PR-B item in the spec maps to a task):**

| Spec requirement                                                                                             | Task                                     |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `templates/pwa-deployment.yaml`                                                                              | Task 1                                   |
| `templates/api-deployment.yaml` (with single-replica guard, Recreate strategy, PVC mount, ConfigMap envFrom) | Task 5                                   |
| `templates/pwa-service.yaml`                                                                                 | Task 2                                   |
| `templates/api-service.yaml`                                                                                 | Task 6                                   |
| `templates/api-configmap.yaml`                                                                               | Task 3                                   |
| `templates/api-pvc.yaml` (with `helm.sh/resource-policy: keep`)                                              | Task 4                                   |
| `helm lint` passes on base and overlay                                                                       | Per-task lint steps + Task 8 final sweep |
| `helm template --dry-run=server` against real cluster                                                        | Task 7                                   |
| PVC gated on `persistence.enabled`                                                                           | Task 4 (gate verified in Step 4)         |
| `PROJECT_STATUS.md` updated                                                                                  | Task 8                                   |
| Pull request opened safely                                                                                   | Task 9                                   |
| File-count within ≤10 cap                                                                                    | Task 8 Step 4                            |

No gaps.

**Placeholder scan:** zero matches for "TBD", "TODO", "implement later", "fill in details", "add error handling", "handle edge cases", "similar to Task N". Every step has exact content.

**Type consistency:** Helper invocations use the same `(dict "context" . "component" "...")` shape established in PR-A. Resource names use `componentName` consistently. The `api-config` and `api-data` suffixes are computed via `printf "%s-config"` and `printf "%s-data"` against the API component name, matching the spec's `<fullname>-api-config` and `<fullname>-api-data` patterns.

No issues found.
