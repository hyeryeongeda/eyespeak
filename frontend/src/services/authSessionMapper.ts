import type { ApiMode } from '../types/api'
import type { AuthResponseDto, AuthSession } from '../types/auth'
import { requireAuthRole } from './authRole'

function normalizeSessionId(rawId: string | number): string {
  const normalizedId = String(rawId).trim()

  if (!normalizedId) {
    throw new Error(`Unsupported user id: ${rawId}`)
  }

  return normalizedId
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

export function mapAuthResponseToSession(
  response: AuthResponseDto,
  authMode: ApiMode,
): AuthSession {
  const normalizedUserId =
    normalizeNumericId(response.user.userId) ??
    normalizeNumericId(response.user.id)
  const normalizedMatchingId =
    normalizeNumericId(response.user.matchingId) ??
    normalizeNumericId(response.matchingId)

  return {
    id: normalizeSessionId(response.user.id),
    userId: normalizedUserId,
    matchingId: normalizedMatchingId,
    role: requireAuthRole(String(response.user.role ?? '')),
    authMode,
    name: response.user.name,
    email: response.user.email,
    teamCode: response.user.teamCode ?? null,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? null,
  }
}

export default mapAuthResponseToSession
