import { getActiveApiMode } from '../config/env'

export type EyeTrackingApiMode = 'real' | 'mock' | 'disabled'

const EYE_TRACKING_PROXY_PATH = '/eye-tracking-api'
const envValues = import.meta.env as Record<string, string | undefined>

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

function readFirstEnvValue(keys: readonly string[]) {
  for (const key of keys) {
    const normalizedValue = normalizeTextValue(envValues[key])

    if (normalizedValue) {
      return normalizedValue
    }
  }

  return ''
}

function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function stripApiSuffix(value: string) {
  return value.replace(/\/api(?:\/v\d+)?\/?$/i, '')
}

const EXPLICIT_EYE_TRACKING_MODE = readFirstEnvValue([
  'VITE_EYE_TRACKING_API_MODE',
  'VITE_EYE_TRACKING_MODE',
])
const EXPLICIT_EYE_TRACKING_API_BASE_URL = readFirstEnvValue([
  'VITE_EYE_TRACKING_API_BASE_URL',
  'VITE_EYE_TRACKING_BASE_URL',
])
const EXPLICIT_EYE_TRACKING_UI_URL = readFirstEnvValue([
  'VITE_EYE_TRACKING_UI_URL',
  'VITE_EYE_TRACKING_URL',
])
const EYE_TRACKING_PROXY_TARGET = readFirstEnvValue(['VITE_EYE_TRACKING_PROXY_TARGET'])

const hasExplicitEyeTrackingConnectionConfig = Boolean(
  EXPLICIT_EYE_TRACKING_API_BASE_URL ||
    EXPLICIT_EYE_TRACKING_UI_URL ||
    EYE_TRACKING_PROXY_TARGET,
)

const RAW_EYE_TRACKING_API_MODE =
  EXPLICIT_EYE_TRACKING_MODE ||
  (hasExplicitEyeTrackingConnectionConfig ? 'real' : getActiveApiMode())
const NORMALIZED_EYE_TRACKING_API_MODE = normalizeModeValue(RAW_EYE_TRACKING_API_MODE)
const EYE_TRACKING_API_MODE = resolveEyeTrackingApiMode(RAW_EYE_TRACKING_API_MODE)
const EYE_TRACKING_DIAGNOSTICS_ENABLED = Boolean(import.meta.env.DEV)

const EYE_TRACKING_API_BASE_URL = stripTrailingSlashes(
  EXPLICIT_EYE_TRACKING_API_BASE_URL ||
    (EYE_TRACKING_API_MODE === 'real' || import.meta.env.DEV ? EYE_TRACKING_PROXY_PATH : ''),
)

const EYE_TRACKING_UI_URL = stripTrailingSlashes(
  EXPLICIT_EYE_TRACKING_UI_URL ||
    stripApiSuffix(EYE_TRACKING_API_BASE_URL) ||
    stripApiSuffix(EYE_TRACKING_PROXY_TARGET) ||
    (EYE_TRACKING_API_MODE === 'real' ? EYE_TRACKING_PROXY_PATH : ''),
)

const EYE_TRACKING_REQUEST_TIMEOUT_MS = getPositiveNumber(
  import.meta.env.VITE_EYE_TRACKING_REQUEST_TIMEOUT_MS,
  5000,
)

const EYE_TRACKING_RUNTIME_POLL_INTERVAL_MS = getPositiveNumber(
  import.meta.env.VITE_EYE_TRACKING_RUNTIME_POLL_INTERVAL_MS,
  250,
)

const EYE_TRACKING_CAPTURE_SAMPLE_INTERVAL_MS = getPositiveNumber(
  import.meta.env.VITE_EYE_TRACKING_CAPTURE_SAMPLE_INTERVAL_MS,
  120,
)

const EYE_TRACKING_READY_STREAK = Math.max(
  1,
  Math.round(getPositiveNumber(import.meta.env.VITE_EYE_TRACKING_READY_STREAK, 2)),
)

const EYE_TRACKING_FRAME_MAX_WIDTH = Math.max(
  160,
  Math.round(getPositiveNumber(import.meta.env.VITE_EYE_TRACKING_FRAME_MAX_WIDTH, 480)),
)

const EYE_TRACKING_FRAME_JPEG_QUALITY = Math.min(
  0.95,
  Math.max(
    0.3,
    Number.isFinite(Number(import.meta.env.VITE_EYE_TRACKING_FRAME_JPEG_QUALITY))
      ? Number(import.meta.env.VITE_EYE_TRACKING_FRAME_JPEG_QUALITY)
      : 0.72,
  ),
)

export function getActiveEyeTrackingApiMode() {
  return EYE_TRACKING_API_MODE
}

export function getEyeTrackingConfigSnapshot() {
  return {
    rawApiMode: RAW_EYE_TRACKING_API_MODE,
    normalizedApiMode: NORMALIZED_EYE_TRACKING_API_MODE,
    resolvedApiMode: EYE_TRACKING_API_MODE,
    apiEnabled: EYE_TRACKING_API_MODE === 'real',
    apiBaseUrl: EYE_TRACKING_API_BASE_URL,
    uiUrl: EYE_TRACKING_UI_URL,
    appBaseUrl: import.meta.env.BASE_URL,
    proxyTarget: EYE_TRACKING_PROXY_TARGET,
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

export function getEyeTrackingRuntimePollIntervalMs() {
  return EYE_TRACKING_RUNTIME_POLL_INTERVAL_MS
}

export function getEyeTrackingCaptureSampleIntervalMs() {
  return EYE_TRACKING_CAPTURE_SAMPLE_INTERVAL_MS
}

export function getEyeTrackingReadyStreak() {
  return EYE_TRACKING_READY_STREAK
}

export function getEyeTrackingFrameMaxWidth() {
  return EYE_TRACKING_FRAME_MAX_WIDTH
}

export function getEyeTrackingFrameJpegQuality() {
  return EYE_TRACKING_FRAME_JPEG_QUALITY
}
