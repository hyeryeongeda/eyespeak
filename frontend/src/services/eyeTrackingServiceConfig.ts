export type EyeTrackingApiMode = 'real' | 'mock' | 'disabled'

function normalizeTextValue(value: string | undefined) {
  return value?.trim() ?? ''
}

function normalizeModeValue(value: string | undefined) {
  return normalizeTextValue(value).toLowerCase()
}

function resolveEyeTrackingApiMode(value: string | undefined): EyeTrackingApiMode {
  const normalizedValue = normalizeModeValue(value)

  if (normalizedValue === 'real') {
    return 'real'
  }

  if (
    normalizedValue === 'disabled' ||
    normalizedValue === 'off' ||
    normalizedValue === 'false' ||
    normalizedValue === 'none'
  ) {
    return 'disabled'
  }

  return 'mock'
}

function getPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

const RAW_EYE_TRACKING_API_MODE = import.meta.env.VITE_EYE_TRACKING_API_MODE
const NORMALIZED_EYE_TRACKING_API_MODE = normalizeModeValue(RAW_EYE_TRACKING_API_MODE)
const EYE_TRACKING_API_MODE = resolveEyeTrackingApiMode(RAW_EYE_TRACKING_API_MODE)
const EYE_TRACKING_DIAGNOSTICS_ENABLED = Boolean(import.meta.env.DEV)

const EYE_TRACKING_API_BASE_URL =
  normalizeTextValue(import.meta.env.VITE_EYE_TRACKING_API_BASE_URL) ||
  (import.meta.env.DEV ? '/eye-tracking-api' : '')

const EYE_TRACKING_UI_URL =
  normalizeTextValue(import.meta.env.VITE_EYE_TRACKING_UI_URL) ||
  normalizeTextValue(import.meta.env.VITE_EYE_TRACKING_PROXY_TARGET) ||
  ''

const EYE_TRACKING_REQUEST_TIMEOUT_MS = getPositiveNumber(
  import.meta.env.VITE_EYE_TRACKING_REQUEST_TIMEOUT_MS,
  5000,
)

export function getEyeTrackingConfigSnapshot() {
  return {
    rawApiMode: RAW_EYE_TRACKING_API_MODE ?? '',
    normalizedApiMode: NORMALIZED_EYE_TRACKING_API_MODE,
    resolvedApiMode: EYE_TRACKING_API_MODE,
    apiEnabled: EYE_TRACKING_API_MODE === 'real',
    apiBaseUrl: EYE_TRACKING_API_BASE_URL,
    uiUrl: EYE_TRACKING_UI_URL,
    appBaseUrl: import.meta.env.BASE_URL,
    proxyTarget: normalizeTextValue(import.meta.env.VITE_EYE_TRACKING_PROXY_TARGET),
    diagnosticsEnabled: EYE_TRACKING_DIAGNOSTICS_ENABLED,
    isDevelopment: Boolean(import.meta.env.DEV),
  }
}

export function isEyeTrackingApiEnabled() {
  return EYE_TRACKING_API_MODE === 'real'
}

export function getEyeTrackingApiBaseUrl() {
  return EYE_TRACKING_API_BASE_URL
}

export function getEyeTrackingUiUrl() {
  return EYE_TRACKING_UI_URL
}

export function getEyeTrackingRequestTimeoutMs() {
  return EYE_TRACKING_REQUEST_TIMEOUT_MS
}
