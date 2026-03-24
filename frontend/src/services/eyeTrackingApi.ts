import { API_ENDPOINTS } from './apiEndpoints'
import { getEyeTrackingApiBaseUrl, getEyeTrackingRequestTimeoutMs } from './eyeTrackingServiceConfig'
import { ApiError } from '../types/api'
import type {
  EyeTrackingCalibrationLoadResponseDto,
  EyeTrackingHealthResponseDto,
  EyeTrackingHealthStatus,
  EyeTrackingSelectionResponseDto,
} from '../types/eyeTracking'

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
