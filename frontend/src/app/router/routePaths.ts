import type { AuthEntryMode, UserRole } from '../../types/auth'

export const ROUTE_PATHS = {
  HOME: '/',
  AUTH_ROLE: '/auth/role',
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGIN_CARE: '/auth/login/care',
  AUTH_LOGIN_PATIENT: '/auth/login/patient',
  AUTH_SIGNUP: '/auth/signup',
  AUTH_SIGNUP_CARE: '/auth/signup/care',
  AUTH_SIGNUP_PATIENT: '/auth/signup/patient',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  CARE_HOME: '/care/home',
  PATIENT_MAIN: '/patient/main',
} as const

export function getAuthPathByRole(mode: AuthEntryMode, role: UserRole) {
  if (mode === 'login') {
    return role === 'caregiver' ? ROUTE_PATHS.AUTH_LOGIN_CARE : ROUTE_PATHS.AUTH_LOGIN_PATIENT
  }

  return role === 'caregiver' ? ROUTE_PATHS.AUTH_SIGNUP_CARE : ROUTE_PATHS.AUTH_SIGNUP_PATIENT
}

export function getHomePathByRole(role: UserRole) {
  return role === 'caregiver' ? ROUTE_PATHS.CARE_HOME : ROUTE_PATHS.PATIENT_MAIN
}
