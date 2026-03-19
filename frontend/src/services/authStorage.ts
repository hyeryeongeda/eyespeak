import type { AuthEntryMode, AuthSession, UserRole } from '../types/auth'

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

export function getStoredRole(): UserRole | null {
  if (!isBrowser()) {
    return null
  }

  const savedRole = sessionStorage.getItem(SELECTED_ROLE_STORAGE_KEY)
  return savedRole === 'caregiver' || savedRole === 'patient' ? savedRole : null
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
  return (
    (parsed.role === 'caregiver' || parsed.role === 'patient') &&
    typeof parsed.id === 'string' &&
    typeof parsed.name === 'string' &&
    typeof parsed.accessToken === 'string' &&
    (typeof parsed.refreshToken === 'string' || parsed.refreshToken === null)
  )
}

function getSessionStorageValue() {
  if (!isBrowser()) {
    return null
  }

  return (
    sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(LEGACY_AUTH_SESSION_STORAGE_KEY)
  )
}

export function getStoredAuthSession(): AuthSession | null {
  const savedSession = getSessionStorageValue()

  if (!savedSession) {
    return null
  }

  try {
    const parsed = JSON.parse(savedSession) as Partial<AuthSession>

    if (isValidStoredSession(parsed)) {
      return parsed
    }
  } catch {
    clearStoredAuthSession()
  }

  return null
}

export function persistAuthSession(session: AuthSession) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
  sessionStorage.removeItem(LEGACY_AUTH_SESSION_STORAGE_KEY)
  setStoredRole(session.role)
}

export function clearStoredAuthSession() {
  if (!isBrowser()) {
    return
  }

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
