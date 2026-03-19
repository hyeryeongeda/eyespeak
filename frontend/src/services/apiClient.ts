import axios from 'axios'
import type { AxiosError } from 'axios'
import { ApiError, type ApiRequestOptions, type ApiSource, type ApiTransport } from '../types/api'
import { mockApiTransport } from './mockAuthApi'

const AUTH_API_MODE = import.meta.env.VITE_AUTH_API_MODE === 'real' ? 'real' : 'mock'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function getApiSource(): ApiSource {
  return AUTH_API_MODE === 'real' ? 'api' : 'mock'
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
})

function unwrapApiEnvelope<TResponse>(value: unknown) {
  if (value && typeof value === 'object' && 'data' in value) {
    // ASSUMED: 실 API가 공통 응답 래퍼 { data, ... } 를 사용할 가능성을 우선 반영.
    return (value as { data: TResponse }).data
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
        'API 요청에 실패했습니다.',
      code: axiosError.response?.data?.code,
      details: axiosError.response?.data,
    })
  }

  return new ApiError({
    statusCode: 500,
    source: getApiSource(),
    message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    details: error,
  })
}

const realApiTransport: ApiTransport = {
  async request<TResponse, TBody>({
    method,
    url,
    data,
    accessToken,
  }: ApiRequestOptions<TBody>) {
    try {
      const response = await axiosInstance.request({
        method,
        url,
        data,
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      })

      return unwrapApiEnvelope<TResponse>(response.data)
    } catch (error) {
      throw toApiError(error)
    }
  },
}

const activeTransport = AUTH_API_MODE === 'real' ? realApiTransport : mockApiTransport

export const apiClient = {
  request<TResponse, TBody = unknown>(options: ApiRequestOptions<TBody>) {
    return activeTransport.request<TResponse, TBody>(options)
  },
  post<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    options?: Pick<ApiRequestOptions<TBody>, 'accessToken'>,
  ) {
    return activeTransport.request<TResponse, TBody>({
      method: 'POST',
      url,
      data,
      accessToken: options?.accessToken,
    })
  },
  delete<TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    options?: Pick<ApiRequestOptions<TBody>, 'accessToken'>,
  ) {
    return activeTransport.request<TResponse, TBody>({
      method: 'DELETE',
      url,
      data,
      accessToken: options?.accessToken,
    })
  },
}

export function getActiveApiMode() {
  return AUTH_API_MODE
}
