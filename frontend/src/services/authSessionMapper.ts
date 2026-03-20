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

export function mapAuthResponseToSession(response: AuthResponseDto): AuthSession {
  return {
    id: normalizeSessionId(response.user.id),
    role: normalizeUserRole(String(response.user.role ?? '')),
    name: response.user.name,
    email: response.user.email,
    teamCode: response.user.teamCode ?? null,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  }
}

export default mapAuthResponseToSession
