export type EyeTrackingApiMode = 'real' | 'mock'

function getPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

const EYE_TRACKING_API_MODE: EyeTrackingApiMode =
  import.meta.env.VITE_EYE_TRACKING_API_MODE === 'real' ? 'real' : 'mock'

const EYE_TRACKING_API_BASE_URL =
  import.meta.env.VITE_EYE_TRACKING_API_BASE_URL?.trim() ||
  (import.meta.env.DEV ? '/eye-tracking-api' : '')

const EYE_TRACKING_UI_URL =
  import.meta.env.VITE_EYE_TRACKING_UI_URL?.trim() ||
  import.meta.env.VITE_EYE_TRACKING_PROXY_TARGET?.trim() ||
  ''

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
