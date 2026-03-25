import axios from 'axios'
import type { AxiosError } from 'axios'
import { getApiBaseUrl, getApiWithCredentials } from '../config/env'
import { ApiError, type ApiRequestOptions } from '../types/api'
import { applyActiveAuthSession, getActiveAuthSession } from './authSessionRegistry'

const DEFAULT_WITH_CREDENTIALS = getApiWithCredentials()

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000,
  withCredentials: DEFAULT_WITH_CREDENTIALS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

type InternalRequestOptions<TBody = unknown> = ApiRequestOptions<TBody>

function shouldInvalidateActiveSession(
  error: ApiError,
  options: InternalRequestOptions,
) {
  if (options.skipAuthInvalidation) {
    return false
  }

  if (error.statusCode !== 401) {
    return false
  }

  return getActiveAuthSession() !== null
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
    const apiError = toApiError(error)

    if (shouldInvalidateActiveSession(apiError, options)) {
      applyActiveAuthSession(null)
    }

    throw apiError
  }
}

type SimpleRequestOptions<TBody = unknown> = Omit<ApiRequestOptions<TBody>, 'method' | 'url'>

export const apiClient = {
  request<TResponse, TBody = unknown>(options: ApiRequestOptions<TBody>) {
    return callTransport<TResponse, TBody>(options)
  },
  get<TResponse>(url: string, options?: SimpleRequestOptions<never>) {
    return callTransport<TResponse, never>({
      method: 'GET',
      url,
      ...options,
    })
  },
  post<TResponse, TBody = unknown>(url: string, data?: TBody, options?: SimpleRequestOptions<TBody>) {
    return callTransport<TResponse, TBody>({
      method: 'POST',
      url,
      data,
      ...options,
    })
  },
  put<TResponse, TBody = unknown>(url: string, data?: TBody, options?: SimpleRequestOptions<TBody>) {
    return callTransport<TResponse, TBody>({
      method: 'PUT',
      url,
      data,
      ...options,
    })
  },
  patch<TResponse, TBody = unknown>(url: string, data?: TBody, options?: SimpleRequestOptions<TBody>) {
    return callTransport<TResponse, TBody>({
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
    return callTransport<TResponse, TBody>({
      method: 'DELETE',
      url,
      data,
      ...options,
    })
  },
}

export { getActiveApiMode, getApiBaseUrl } from '../config/env'
