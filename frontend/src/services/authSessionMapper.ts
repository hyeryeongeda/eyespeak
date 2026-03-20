import type { AuthResponseDto, AuthSession } from '../types/auth'

function normalizeSessionId(rawId: string | number): string {
  const normalizedId = String(rawId).trim()

  if (!normalizedId) {
    throw new Error(`Unsupported user id: ${rawId}`)
  }

  return normalizedId
}

function normalizeUserRole(rawRole: string): AuthSession['role'] {
  const normalizedRole = rawRole.trim().toLowerCase()

  if (normalizedRole === 'patient') {
    return 'patient'
  }

  if (normalizedRole === 'guardian' || normalizedRole === 'caregiver' || normalizedRole === 'care') {
    return 'guardian'
  }

  throw new Error(`Unsupported user role: ${rawRole}`)
}

function normalizeNumericId(rawId: string | number | null | undefined): number | null {
  if (typeof rawId === 'number') {
    return Number.isFinite(rawId) ? rawId : null
  }

  if (typeof rawId !== 'string') {
    return null
  }

  const normalizedId = rawId.trim()

  if (!normalizedId) {
    return null
  }

  const numericId = Number(normalizedId)
  return Number.isFinite(numericId) ? numericId : null
}

export function mapAuthResponseToSession(response: AuthResponseDto): AuthSession {
  return {
    id: normalizeSessionId(response.user.id),
    userId: normalizeNumericId(response.user.userId ?? response.user.id),
    matchingId: normalizeNumericId(response.user.matchingId),
    role: normalizeUserRole(String(response.user.role ?? '')),
    name: response.user.name,
    email: response.user.email,
    teamCode: response.user.teamCode ?? null,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  }
}

export default mapAuthResponseToSession
