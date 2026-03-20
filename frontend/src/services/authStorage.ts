import type {
  AuthEntryMode,
  AuthSession,
  GuardianSessionExitReason,
  UserRole,
} from '../types/auth'

export const SELECTED_ROLE_STORAGE_KEY = 'selectedRole'
export const AUTH_ENTRY_MODE_STORAGE_KEY = 'authEntryMode'
export const AUTH_SESSION_STORAGE_KEY = 'authSession'
export const LEGACY_AUTH_SESSION_STORAGE_KEY = 'mockAuthSession'
export const VERIFIED_TEAM_CODE_STORAGE_KEY = 'verifiedTeamCode'
export const GUARDIAN_SESSION_EXIT_REASON_STORAGE_KEY = 'guardianSessionExitReason'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function normalizeTeamCode(value: string) {
  return value.trim().toUpperCase()
}

export function normalizeUserRole(role: string | null | undefined): UserRole | null {
  const normalizedRole = role?.trim().toLowerCase()

  return normalizedRole === 'guardian' || normalizedRole === 'patient'
    ? normalizedRole
    : null
}

function normalizeGuardianSessionExitReason(
  value: string | null | undefined,
): GuardianSessionExitReason | null {
  return value === 'idle-timeout' || value === 'refresh-failed' ? value : null
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

export function storeGuardianSessionExitReason(reason: GuardianSessionExitReason) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(GUARDIAN_SESSION_EXIT_REASON_STORAGE_KEY, reason)
}

export function consumeGuardianSessionExitReason(): GuardianSessionExitReason | null {
  if (!isBrowser()) {
    return null
  }

  const savedReason = sessionStorage.getItem(GUARDIAN_SESSION_EXIT_REASON_STORAGE_KEY)
  sessionStorage.removeItem(GUARDIAN_SESSION_EXIT_REASON_STORAGE_KEY)
  return normalizeGuardianSessionExitReason(savedReason)
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

  return (
    (parsed.role === 'guardian' || parsed.role === 'patient') &&
    typeof parsed.id === 'string' &&
    parsed.id.trim().length > 0 &&
    typeof parsed.name === 'string' &&
    typeof parsed.accessToken === 'string' &&
    (typeof parsed.refreshToken === 'string' || parsed.refreshToken === null)
  )
}

function shouldPersistAuthSession(role: UserRole) {
  return role === 'patient'
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
      if (!shouldPersistAuthSession(parsed.role)) {
        clearStoredAuthSession()
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
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
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
