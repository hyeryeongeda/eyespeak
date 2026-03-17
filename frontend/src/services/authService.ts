import type {
  AuthEntryMode,
  AuthSession,
  MockLoginPayload,
  MockLoginResult,
  UserRole,
} from '../types/auth'

export const SELECTED_ROLE_STORAGE_KEY = 'selectedRole'
export const AUTH_ENTRY_MODE_STORAGE_KEY = 'authEntryMode'
export const AUTH_SESSION_STORAGE_KEY = 'mockAuthSession'
export const VERIFIED_TEAM_CODE_STORAGE_KEY = 'verifiedTeamCode'
export const MOCK_PATIENT_TEAM_CODE = 'TEAM123'

const MOCK_ACCOUNTS: Record<UserRole, { id: string; password: string; name: string }> = {
  caregiver: {
    id: 'care123',
    password: 'e205e205@',
    name: '보호자 목업 사용자',
  },
  patient: {
    id: 'pat123',
    password: 'e205e205@',
    name: '환자 목업 사용자',
  },
}

function isBrowser() {
  return typeof window !== 'undefined'
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

export function getStoredAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null
  }

  const savedSession = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
  if (!savedSession) {
    return null
  }

  try {
    const parsed = JSON.parse(savedSession) as Partial<AuthSession>

    if (
      (parsed.role === 'caregiver' || parsed.role === 'patient') &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string'
    ) {
      return {
        id: parsed.id,
        role: parsed.role,
        name: parsed.name,
      }
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
  setStoredRole(session.role)
}

export function clearStoredAuthSession() {
  if (!isBrowser()) {
    return
  }

  sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export function normalizeTeamCode(value: string) {
  return value.trim().toUpperCase()
}

export function verifyMockTeamCode(value: string) {
  return normalizeTeamCode(value) === MOCK_PATIENT_TEAM_CODE
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

export function authenticateMockUser(payload: MockLoginPayload): MockLoginResult {
  const targetAccount = MOCK_ACCOUNTS[payload.role]

  if (payload.id.trim() !== targetAccount.id || payload.password !== targetAccount.password) {
    return {
      success: false,
      message:
        payload.role === 'caregiver'
          ? '보호자 계정 정보가 올바르지 않습니다.'
          : '환자 계정 정보가 올바르지 않습니다.',
    }
  }

  return {
    success: true,
    user: {
      id: targetAccount.id,
      role: payload.role,
      name: targetAccount.name,
    },
  }
}
