import { API_ENDPOINTS } from './apiEndpoints'
import { getEyeTrackingApiBaseUrl, getEyeTrackingRequestTimeoutMs } from './eyeTrackingServiceConfig'
import { ApiError } from '../types/api'
import type {
  EyeTrackingCalibrationLoadResponseDto,
  EyeTrackingFrame,
  EyeTrackingFrameResponseDto,
  EyeTrackingHealthResponseDto,
  EyeTrackingHealthStatus,
  EyeTrackingSelectionResponseDto,
  EyeTrackingTrigger,
} from '../types/eyeTracking'

function clamp01(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(1, Math.max(0, value as number))
}

function toOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeTrigger(value: unknown): EyeTrackingTrigger {
  if (
    value === 'none' ||
    value === 'select' ||
    value === 'start' ||
    value === 'stop' ||
    value === 'sos'
  ) {
    return value
  }

  return 'none'
}

function buildUrl(path: string) {
  const baseUrl = getEyeTrackingApiBaseUrl().trim()

  if (!baseUrl) {
    return path
  }

  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

function createTimeoutController(signal?: AbortSignal) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort(new DOMException('The operation timed out.', 'AbortError'))
  }, getEyeTrackingRequestTimeoutMs())

  const handleAbort = () => {
    controller.abort(signal?.reason)
  }

  signal?.addEventListener('abort', handleAbort, { once: true })

  return {
    signal: controller.signal,
    dispose() {
      window.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', handleAbort)
    },
  }
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function getResponseErrorMessage(payload: unknown, fallbackMessage: string) {
  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? payload.error : undefined
    const message = 'message' in payload ? payload.message : undefined

    if (typeof error === 'string' && error.trim()) {
      return error
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  return fallbackMessage
}

async function requestEyeTrackingApi<TResponse, TBody = unknown>(args: {
  method: 'GET' | 'POST'
  path: string
  body?: TBody
  signal?: AbortSignal
}) {
  const { method, path, body, signal } = args
  const timeout = createTimeoutController(signal)

  try {
    const response = await fetch(buildUrl(path), {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: timeout.signal,
    })

    const payload = await parseResponseBody(response)

    if (!response.ok) {
      throw new ApiError({
        statusCode: response.status,
        source: 'api',
        message: getResponseErrorMessage(payload, 'Eye tracking request failed.'),
        details: payload,
      })
    }

    return payload as TResponse
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError({
        statusCode: 408,
        source: 'api',
        message: signal?.aborted ? 'Eye tracking request was aborted.' : 'Eye tracking request timed out.',
        details: error,
      })
    }

    throw new ApiError({
      statusCode: 500,
      source: 'api',
      message: error instanceof Error ? error.message : 'Unexpected eye tracking request error.',
      details: error,
    })
  } finally {
    timeout.dispose()
  }
}

function mapFrameResponse(value: EyeTrackingFrameResponseDto): EyeTrackingFrame {
  return {
    cell: Number.isInteger(value.cell) ? value.cell : null,
    ratioX: toOptionalNumber(value.rx),
    ratioY: toOptionalNumber(value.ry),
    rawRatioX: toOptionalNumber(value.raw_rx),
    rawRatioY: toOptionalNumber(value.raw_ry),
    eyeAspectRatio: toOptionalNumber(value.ear) ?? 0,
    faceDetected: Boolean(value.face),
    blinkDetected: Boolean(value.blink),
    trigger: normalizeTrigger(value.trigger),
    screenX: clamp01(toOptionalNumber(value.screen_x), 0.5),
    screenY: clamp01(toOptionalNumber(value.screen_y), 0.5),
  }
}

function mapHealthResponse(value: EyeTrackingHealthResponseDto): EyeTrackingHealthStatus {
  return {
    status: typeof value.status === 'string' && value.status.trim() ? value.status : 'unknown',
    calibrated: Boolean(value.calibrated),
  }
}

export async function getEyeTrackingHealthApi(signal?: AbortSignal) {
  const response = await requestEyeTrackingApi<EyeTrackingHealthResponseDto>({
    method: 'GET',
    path: API_ENDPOINTS.EYE_TRACKING_HEALTH,
    signal,
  })

  return mapHealthResponse(response)
}

export async function analyzeEyeTrackingFrameApi(
  imageBase64: string,
  signal?: AbortSignal,
) {
  const response = await requestEyeTrackingApi<EyeTrackingFrameResponseDto, { image: string }>({
    method: 'POST',
    path: API_ENDPOINTS.EYE_TRACKING_GAZE,
    body: {
      image: imageBase64,
    },
    signal,
  })

  return mapFrameResponse(response)
}

export function loadEyeTrackingCalibrationApi(userId: string, signal?: AbortSignal) {
  return requestEyeTrackingApi<EyeTrackingCalibrationLoadResponseDto, { user_id: string }>({
    method: 'POST',
    path: API_ENDPOINTS.EYE_TRACKING_CALIBRATE_LOAD,
    body: {
      user_id: userId,
    },
    signal,
  })
}

export function submitEyeTrackingSelectionApi(cell: number, signal?: AbortSignal) {
  return requestEyeTrackingApi<EyeTrackingSelectionResponseDto, { cell: number }>({
    method: 'POST',
    path: API_ENDPOINTS.EYE_TRACKING_SELECTION,
    body: {
      cell,
    },
    signal,
  })
}
