import { getActiveApiMode } from '../config/env'
import type { ApiMode } from '../types/api'
import type {
  AuthEntryMode,
  AuthSession,
  UserRole,
} from '../types/auth'
import { normalizeAuthRole } from './authRole'

export const SELECTED_ROLE_STORAGE_KEY = 'selectedRole'
export const AUTH_ENTRY_MODE_STORAGE_KEY = 'authEntryMode'
export const AUTH_SESSION_STORAGE_KEY = 'authSession'
export const LEGACY_AUTH_SESSION_STORAGE_KEY = 'mockAuthSession'
export const VERIFIED_TEAM_CODE_STORAGE_KEY = 'verifiedTeamCode'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function normalizeTeamCode(value: string) {
  return value.trim().toUpperCase()
}

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  return normalizeAuthRole(role)
}

function normalizeStoredNumericId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) ? numericValue : null
}

function normalizeStoredOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

function normalizeStoredAuthMode(
  value: unknown,
  accessToken: string | null | undefined,
): ApiMode | null {
  if (value === 'mock' || value === 'real') {
    return value
  }

  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    return null
  }

  return accessToken.startsWith('mock-access:') ? 'mock' : 'real'
}

export function getStoredRole(): UserRole | null {
  if (!isBrowser()) {
    return null
  }

  const savedRole = sessionStorage.getItem(SELECTED_ROLE_STORAGE_KEY)
  const normalizedRole = normalizeUserRole(savedRole)

  if (!normalizedRole && savedRole) {
    sessionStorage.removeItem(SELECTED_ROLE_STORAGE_KEY)
  }

  return normalizedRole
}

export function setStoredRole(role: UserRole) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(SELECTED_ROLE_STORAGE_KEY, role)
}

export function getStoredEntryMode(): AuthEntryMode | null {
  if (!isBrowser()) {
    return null
  }

  const savedMode = sessionStorage.getItem(AUTH_ENTRY_MODE_STORAGE_KEY)
  return savedMode === 'login' || savedMode === 'signup' ? savedMode : null
}

export function setStoredEntryMode(mode: AuthEntryMode) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(AUTH_ENTRY_MODE_STORAGE_KEY, mode)
}

export function clearStoredEntryMode() {
  if (!isBrowser()) {
    return
  }

  sessionStorage.removeItem(AUTH_ENTRY_MODE_STORAGE_KEY)
}

function isValidStoredSession(parsed: Partial<AuthSession>): parsed is AuthSession {
  const normalizedRole =
    typeof parsed.role === 'string' ? normalizeUserRole(parsed.role) : null

  if (!normalizedRole) {
    return false
  }

  parsed.role = normalizedRole
  parsed.id = String(parsed.id ?? '')
  parsed.userId = normalizeStoredNumericId(parsed.userId)
  parsed.matchingId = normalizeStoredNumericId(parsed.matchingId)
  parsed.refreshToken = normalizeStoredOptionalText(parsed.refreshToken)
  parsed.teamCode = normalizeStoredOptionalText(parsed.teamCode)
  const normalizedAuthMode = normalizeStoredAuthMode(parsed.authMode, parsed.accessToken)

  if (!normalizedAuthMode) {
    return false
  }

  parsed.authMode = normalizedAuthMode

  return (
    (parsed.role === 'guardian' || parsed.role === 'patient') &&
    typeof parsed.id === 'string' &&
    parsed.id.trim().length > 0 &&
    typeof parsed.name === 'string' &&
    typeof parsed.accessToken === 'string' &&
    parsed.accessToken.trim().length > 0 &&
    (typeof parsed.refreshToken === 'string' || parsed.refreshToken === null) &&
    (parsed.authMode === 'mock' || parsed.authMode === 'real')
  )
}

function shouldPersistAuthSession(role: UserRole) {
  return role === 'guardian' || role === 'patient'
}

function getPersistentStorageValue(key: string) {
  if (!isBrowser()) {
    return null
  }

  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function setPersistentStorageValue(key: string, value: string) {
  if (!isBrowser()) {
    return
  }

  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage quota or privacy-mode write failures and keep in-memory session only.
  }
}

function removePersistentStorageValue(key: string) {
  if (!isBrowser()) {
    return
  }

  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures.
  }
}

function getSessionStorageValue() {
  if (!isBrowser()) {
    return null
  }

  return (
    getPersistentStorageValue(AUTH_SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(LEGACY_AUTH_SESSION_STORAGE_KEY)
  )
}

function isStoredSessionCompatibleWithActiveMode(session: Pick<AuthSession, 'authMode'>) {
  return session.authMode === getActiveApiMode()
}

export function getStoredAuthSession(): AuthSession | null {
  const savedSession = getSessionStorageValue()

  if (!savedSession) {
    return null
  }

  try {
    const parsed = JSON.parse(savedSession) as Partial<AuthSession>

    if (isValidStoredSession(parsed)) {
      if (!shouldPersistAuthSession(parsed.role)) {
        clearStoredAuthSession()
        return null
      }

      if (!isStoredSessionCompatibleWithActiveMode(parsed)) {
        return null
      }

      return parsed
    }

    clearStoredAuthSession()
  } catch {
    clearStoredAuthSession()
  }

  return null
}

export function persistAuthSession(session: AuthSession) {
  if (!isBrowser()) {
    return
  }

  if (shouldPersistAuthSession(session.role)) {
    setPersistentStorageValue(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_AUTH_SESSION_STORAGE_KEY)
  } else {
    clearStoredAuthSession()
  }

  setStoredRole(session.role)
}

export function clearStoredAuthSession() {
  if (!isBrowser()) {
    return
  }

  removePersistentStorageValue(AUTH_SESSION_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  sessionStorage.removeItem(LEGACY_AUTH_SESSION_STORAGE_KEY)
}

export function getStoredVerifiedTeamCode(): string | null {
  if (!isBrowser()) {
    return null
  }

  const savedCode = sessionStorage.getItem(VERIFIED_TEAM_CODE_STORAGE_KEY)
  return savedCode ? normalizeTeamCode(savedCode) : null
}

export function storeVerifiedTeamCode(value: string) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(VERIFIED_TEAM_CODE_STORAGE_KEY, normalizeTeamCode(value))
}

export function clearVerifiedTeamCode() {
  if (!isBrowser()) {
    return
  }

  sessionStorage.removeItem(VERIFIED_TEAM_CODE_STORAGE_KEY)
}
