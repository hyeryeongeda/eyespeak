import axios from 'axios'
import type { AxiosError } from 'axios'
import { ApiError, type ApiRequestOptions, type ApiSource, type ApiTransport } from '../types/api'
import type { AuthResponseDto, AuthSession, RefreshRequestDto } from '../types/auth'
import { API_ENDPOINTS } from './apiEndpoints'
import { mapAuthResponseToSession } from './authSessionMapper'
import { applyActiveAuthSession, getActiveAuthSession } from './authSessionRegistry'
import { setStoredEntryMode, setStoredRole, storeGuardianSessionExitReason } from './authStorage'
import { mockApiTransport } from './mockAuthApi'

type ApiMode = 'real' | 'mock'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const configuredApiMode = import.meta.env.VITE_API_MODE ?? import.meta.env.VITE_AUTH_API_MODE
const API_MODE: ApiMode = configuredApiMode === 'mock' ? 'mock' : 'real'
const DEFAULT_WITH_CREDENTIALS = import.meta.env.VITE_API_WITH_CREDENTIALS === 'true'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  withCredentials: DEFAULT_WITH_CREDENTIALS,
})

type InternalRequestOptions<TBody = unknown> = ApiRequestOptions<TBody> & {
  skipGuardianRefreshRetry?: boolean
}

function getApiSource(): ApiSource {
  return API_MODE === 'real' ? 'api' : 'mock'
}

function unwrapApiEnvelope<TResponse>(value: unknown) {
  if (!value || typeof value !== 'object') {
    return value as TResponse
  }

  const envelope = value as Record<string, unknown>

  if ('data' in envelope) {
    return envelope.data as TResponse
  }

  // 일부 백엔드 응답이 payload를 cal 키로 내려주는 케이스 호환.
  if ('cal' in envelope) {
    return envelope.cal as TResponse
  }

  return value as TResponse
}

function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; code?: string }>
    const statusCode = axiosError.response?.status ?? 500

    return new ApiError({
      statusCode,
      source: 'api',
      message:
        axiosError.response?.data?.message ??
        axiosError.message ??
        'API request failed.',
      code: axiosError.response?.data?.code,
      details: axiosError.response?.data,
    })
  }

  return new ApiError({
    statusCode: 500,
    source: getApiSource(),
    message: error instanceof Error ? error.message : 'Unexpected error occurred.',
    details: error,
  })
}

function buildHeaders(
  accessToken?: string | null,
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  const nextHeaders = { ...(headers ?? {}) }

  if (accessToken) {
    nextHeaders.Authorization = `Bearer ${accessToken}`
  }

  return Object.keys(nextHeaders).length > 0 ? nextHeaders : undefined
}

const realApiTransport: ApiTransport = {
  async request<TResponse, TBody>(options: ApiRequestOptions<TBody>) {
    try {
      const response = await axiosInstance.request({
        method: options.method,
        url: options.url,
        data: options.data,
        params: options.params,
        headers: buildHeaders(options.accessToken, options.headers),
        responseType: options.responseType,
        withCredentials: options.withCredentials ?? DEFAULT_WITH_CREDENTIALS,
      })

      return unwrapApiEnvelope<TResponse>(response.data)
    } catch (error) {
      throw toApiError(error)
    }
  },
}

const activeTransport = API_MODE === 'real' ? realApiTransport : mockApiTransport
let guardianRefreshPromise: Promise<AuthSession | null> | null = null

function callTransport<TResponse, TBody = unknown>(options: InternalRequestOptions<TBody>) {
  const { skipGuardianRefreshRetry: _skipGuardianRefreshRetry, ...transportOptions } = options
  return activeTransport.request<TResponse, TBody>(transportOptions)
}

function getGuardianRetrySession<TBody>(
  options: InternalRequestOptions<TBody>,
): AuthSession | null {
  if (options.skipGuardianRefreshRetry || options.url === API_ENDPOINTS.AUTH_REFRESH) {
    return null
  }

  if (!options.accessToken) {
    return null
  }

  const session = getActiveAuthSession()

  if (!session || session.role !== 'guardian' || !session.refreshToken) {
    return null
  }

  return session
}

async function refreshGuardianSession(): Promise<AuthSession | null> {
  if (guardianRefreshPromise) {
    return guardianRefreshPromise
  }

  guardianRefreshPromise = (async () => {
    const session = getActiveAuthSession()

    if (!session || session.role !== 'guardian' || !session.refreshToken) {
      return null
    }

    try {
      const response = await callTransport<AuthResponseDto, RefreshRequestDto>({
        method: 'POST',
        url: API_ENDPOINTS.AUTH_REFRESH,
        data: {
          refreshToken: session.refreshToken,
        },
        skipGuardianRefreshRetry: true,
      })

      const nextSession = mapAuthResponseToSession(response)
      applyActiveAuthSession(nextSession)
      return nextSession
    } catch {
      setStoredRole('guardian')
      setStoredEntryMode('login')
      storeGuardianSessionExitReason('refresh-failed')
      applyActiveAuthSession(null)
      return null
    } finally {
      guardianRefreshPromise = null
    }
  })()

  return guardianRefreshPromise
}

async function requestWithGuardianRefreshRetry<TResponse, TBody = unknown>(
  options: InternalRequestOptions<TBody>,
) {
  try {
    return await callTransport<TResponse, TBody>(options)
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 401) {
      throw error
    }

    const guardianSession = getGuardianRetrySession(options)

    if (!guardianSession) {
      throw error
    }

    if (guardianSession.accessToken && guardianSession.accessToken !== options.accessToken) {
      return callTransport<TResponse, TBody>({
        ...options,
        accessToken: guardianSession.accessToken,
        skipGuardianRefreshRetry: true,
      })
    }

    const refreshedSession = await refreshGuardianSession()

    if (!refreshedSession?.accessToken) {
      throw error
    }

    return callTransport<TResponse, TBody>({
      ...options,
      accessToken: refreshedSession.accessToken,
      skipGuardianRefreshRetry: true,
    })
  }
}

type SimpleRequestOptions<TBody = unknown> = Omit<ApiRequestOptions<TBody>, 'method' | 'url'>

export const apiClient = {
  request<TResponse, TBody = unknown>(options: ApiRequestOptions<TBody>) {
    return requestWithGuardianRefreshRetry<TResponse, TBody>(options)
  },
  get<TResponse>(url: string, options?: SimpleRequestOptions<never>) {
    return requestWithGuardianRefreshRetry<TResponse, never>({
      method: 'GET',
      url,
      ...options,
    })
  },
  post<TResponse, TBody = unknown>(url: string, data?: TBody, options?: SimpleRequestOptions<TBody>) {
    return requestWithGuardianRefreshRetry<TResponse, TBody>({
      method: 'POST',
      url,
      data,
      ...options,
    })
  },
  put<TResponse, TBody = unknown>(url: string, data?: TBody, options?: SimpleRequestOptions<TBody>) {
    return requestWithGuardianRefreshRetry<TResponse, TBody>({
      method: 'PUT',
      url,
      data,
      ...options,
    })
  },
  delete<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    options?: SimpleRequestOptions<TBody>,
  ) {
    return requestWithGuardianRefreshRetry<TResponse, TBody>({
      method: 'DELETE',
      url,
      data,
      ...options,
    })
  },
}

export function getActiveApiMode() {
  return API_MODE
}

export function getApiBaseUrl() {
  return API_BASE_URL
}
