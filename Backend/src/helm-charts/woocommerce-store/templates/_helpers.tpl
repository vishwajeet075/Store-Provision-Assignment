{{/*
Expand the name of the chart.
*/}}
{{- define "woocommerce-store.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "woocommerce-store.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "store-%s" (.Values.storeId | toString) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}


{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "woocommerce-store.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}


{{/*
Common labels
*/}}
{{- define "woocommerce-store.labels" -}}
helm.sh/chart: {{ include "woocommerce-store.chart" . }}
{{ include "woocommerce-store.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: woocommerce-saas
store-id: {{ .Values.storeId | toString | quote }}
{{- end }}


{{/*
Selector labels
*/}}
{{- define "woocommerce-store.selectorLabels" -}}
app.kubernetes.io/name: {{ include "woocommerce-store.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
store-name: {{ .Values.storeName | quote }}
{{- end }}


{{/*
Create the name of the service account to use
*/}}
{{- define "woocommerce-store.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (printf "%s-sa" (include "woocommerce-store.fullname" .)) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}