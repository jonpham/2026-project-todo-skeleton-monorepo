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
