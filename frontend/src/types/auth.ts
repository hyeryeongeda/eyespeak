export type UserRole = 'caregiver' | 'patient'

export type AuthEntryMode = 'login' | 'signup'

export interface AuthSession {
  id: string
  role: UserRole
  name: string
}

export interface MockLoginPayload {
  id: string
  password: string
  role: UserRole
}

export interface MockLoginSuccess {
  success: true
  user: AuthSession
}

export interface MockLoginFailure {
  success: false
  message: string
}

export type MockLoginResult = MockLoginSuccess | MockLoginFailure
