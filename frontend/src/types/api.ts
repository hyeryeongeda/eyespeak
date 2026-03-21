import type { AxiosRequestConfig } from 'axios'

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ApiMode = 'mock' | 'real'

export type ApiSource = 'mock' | 'api'

export interface ApiRequestOptions<TBody = unknown> {
  method: ApiMethod
  url: string
  data?: TBody
  accessToken?: string | null
  params?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  responseType?: AxiosRequestConfig['responseType']
  withCredentials?: boolean
}

export interface ApiTransport {
  request<TResponse, TBody = unknown>(options: ApiRequestOptions<TBody>): Promise<TResponse>
}

export class ApiError extends Error {
  statusCode: number
  source: ApiSource
  code?: string
  details?: unknown

  constructor({
    message,
    statusCode,
    source = 'api',
    code,
    details,
  }: {
    message: string
    statusCode: number
    source?: ApiSource
    code?: string
    details?: unknown
  }) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.source = source
    this.code = code
    this.details = details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export interface ServiceSuccess<T> {
  success: true
  data: T
  source: ApiSource
}

export interface ServiceFailure {
  success: false
  message: string
  source: ApiSource
  statusCode?: number
  code?: string
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure
