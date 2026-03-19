// ASSUMED: 기존 프론트 전반에서 사용하는 caregiver role key를 유지하고,
// 백엔드 guardian 개념/엔드포인트와 매핑한다.
export type UserRole = 'caregiver' | 'patient'

export type AuthEntryMode = 'login' | 'signup'

export interface AuthSession {
  id: string
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
  id: string
  role: UserRole
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
