import type { AuthResponseDto, AuthSession } from '../types/auth'

export function mapAuthResponseToSession(response: AuthResponseDto): AuthSession {
  return {
    id: response.user.id,
    role: response.user.role,
    name: response.user.name,
    email: response.user.email,
    teamCode: response.user.teamCode ?? null,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  }
}

export default mapAuthResponseToSession
