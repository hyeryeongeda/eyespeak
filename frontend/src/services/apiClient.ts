import axios from 'axios'
import type { AxiosError } from 'axios'
import { getApiBaseUrl, getApiWithCredentials } from '../config/env'
import { ApiError, type ApiRequestOptions } from '../types/api'
import type { AuthResponseDto, AuthSession, RefreshRequestDto } from '../types/auth'
import { API_ENDPOINTS } from './apiEndpoints'
import { mapAuthResponseToSession } from './authSessionMapper'
import { applyActiveAuthSession, getActiveAuthSession } from './authSessionRegistry'
import { setStoredEntryMode, setStoredRole, storeGuardianSessionExitReason } from './authStorage'

const DEFAULT_WITH_CREDENTIALS = getApiWithCredentials()

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000,
  withCredentials: DEFAULT_WITH_CREDENTIALS,
})

type InternalRequestOptions<TBody = unknown> = ApiRequestOptions<TBody> & {
  skipGuardianRefreshRetry?: boolean
}

function unwrapApiEnvelope<TResponse>(value: unknown) {
  if (!value || typeof value !== 'object') {
    return value as TResponse
  }

  const envelope = value as Record<string, unknown>

  if ('data' in envelope) {
    return envelope.data as TResponse
  }

  if ('cal' in envelope) {
    return envelope.cal as TResponse
  }

  return value as TResponse
}

function readApiResponseTextField(value: unknown, fieldName: 'message' | 'code') {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const fieldValue = (value as Record<string, unknown>)[fieldName]
  return typeof fieldValue === 'string' && fieldValue.trim() ? fieldValue : undefined
}

function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>
    const statusCode = axiosError.response?.status ?? 500
    const isNetworkError = !axiosError.response
    const responseMessage = readApiResponseTextField(axiosError.response?.data, 'message')
    const responseCode = readApiResponseTextField(axiosError.response?.data, 'code')
    const code = responseCode ?? (isNetworkError ? 'NETWORK_ERROR' : undefined)

    return new ApiError({
      statusCode,
      source: 'api',
      message:
        responseMessage ??
        (isNetworkError ? '네트워크 연결 상태를 확인한 뒤 다시 시도해주세요.' : undefined) ??
        axiosError.message ??
        'API request failed.',
      code,
      details: isNetworkError
        ? {
            axiosCode: axiosError.code,
            isNetworkError: true,
          }
        : axiosError.response?.data,
    })
  }

  return new ApiError({
    statusCode: 500,
    source: 'api',
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

async function callTransport<TResponse, TBody = unknown>(
  options: InternalRequestOptions<TBody>,
) {
  const { skipGuardianRefreshRetry: _skipGuardianRefreshRetry, ...requestOptions } = options

  try {
    const response = await axiosInstance.request({
      method: requestOptions.method,
      url: requestOptions.url,
      data: requestOptions.data,
      params: requestOptions.params,
      headers: buildHeaders(requestOptions.accessToken, requestOptions.headers),
      responseType: requestOptions.responseType,
      withCredentials: requestOptions.withCredentials ?? DEFAULT_WITH_CREDENTIALS,
    })

    return unwrapApiEnvelope<TResponse>(response.data)
  } catch (error) {
    throw toApiError(error)
  }
}

let guardianRefreshPromise: Promise<AuthSession | null> | null = null

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

  if (
    !session ||
    session.authMode !== 'real' ||
    session.role !== 'guardian' ||
    !session.refreshToken
  ) {
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

    if (
      !session ||
      session.authMode !== 'real' ||
      session.role !== 'guardian' ||
      !session.refreshToken
    ) {
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

      const nextSession = mapAuthResponseToSession(response, 'real')
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
  patch<TResponse, TBody = unknown>(url: string, data?: TBody, options?: SimpleRequestOptions<TBody>) {
    return requestWithGuardianRefreshRetry<TResponse, TBody>({
      method: 'PATCH',
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

export { getActiveApiMode, getApiBaseUrl } from '../config/env'
