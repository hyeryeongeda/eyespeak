// 백엔드 명세 기준 role 값을 그대로 사용한다.
export type UserRole = 'guardian' | 'patient'

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
