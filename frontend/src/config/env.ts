import type { ApiMode, ApiSource } from '../types/api'

export type AppEnvName = 'local' | 'dev' | 'prod'

function normalizeTextValue(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAppEnvName(value: string | undefined): AppEnvName {
  const normalizedValue = normalizeTextValue(value).toLowerCase()

  if (normalizedValue === 'dev' || normalizedValue === 'prod') {
    return normalizedValue
  }

  return 'local'
}

function normalizeApiMode(value: string | undefined): ApiMode {
  return value === 'mock' ? 'mock' : 'real'
}

const envConfig = {
  appEnv: normalizeAppEnvName(import.meta.env.VITE_APP_ENV),
  apiMode: normalizeApiMode(import.meta.env.VITE_API_MODE),
  apiBaseUrl: normalizeTextValue(import.meta.env.VITE_API_BASE_URL),
  apiWithCredentials: import.meta.env.VITE_API_WITH_CREDENTIALS === 'true',
} as const

export function getAppEnvName() {
  return envConfig.appEnv
}

export function getActiveApiMode() {
  return envConfig.apiMode
}

export function getApiBaseUrl() {
  return envConfig.apiBaseUrl
}

export function getApiWithCredentials() {
  return envConfig.apiWithCredentials
}

export function isMockApiModeEnabled() {
  return envConfig.apiMode === 'mock'
}

export function resolveApiSource(mode: ApiMode): ApiSource {
  return mode === 'mock' ? 'mock' : 'api'
}

export function getActiveApiSource() {
  return resolveApiSource(envConfig.apiMode)
}
