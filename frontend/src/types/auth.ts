// 백엔드 명세 기준 role 값을 그대로 사용한다.
export type UserRole = 'guardian' | 'patient'

export type AuthEntryMode = 'login' | 'signup'

export type GuardianSessionExitReason = 'idle-timeout' | 'refresh-failed'

export interface AuthSession {
  id: string
  userId: number | null
  matchingId: number | null
  role: UserRole
  name: string
  accessToken: string
  refreshToken: string | null
  email?: string
  teamCode?: string | null
}

export interface LoginFormValues {
  identifier: string
  password: string
  role: UserRole
}

export interface AuthUserDto {
  id: string | number
  userId?: string | number | null
  matchingId?: string | number | null
  role: string
  name: string
  email?: string
  teamCode?: string | null
}

export interface AuthResponseDto {
  accessToken: string
  refreshToken: string | null
  user: AuthUserDto
}

export interface LoginRequestDto {
  identifier: string
  password: string
  role: UserRole
}

export interface LogoutRequestDto {
  refreshToken?: string | null
}

export interface RefreshRequestDto {
  refreshToken: string
}

export interface PasswordResetRequestDto {
  identifier: string
  role?: UserRole
}

export interface PasswordResetResponseDto {
  userRole: UserRole
  userName: string
  maskedIdentifier: string
  temporaryPassword: string | null
  message: string
}

export interface WithdrawRequestDto {
  reason?: string
}

export interface GuardianAccountFormValues {
  email: string
  name: string
  password: string
  passwordConfirm: string
}

export interface GuardianSignupRequestDto {
  email: string
  name: string
  password: string
}
