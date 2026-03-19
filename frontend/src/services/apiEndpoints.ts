export const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_LOGOUT: '/api/v1/auth/log-out',
  AUTH_SIGNUP_GUARDIAN: '/api/v1/auth/sign-up/guardian',
  AUTH_SIGNUP_PATIENT: '/api/v1/auth/patients',
  PATIENTS: '/api/v1/patients',
  ROUTINES: '/api/v1/routines',
  AUTH_RESET_PASSWORD: '/api/v1/auth/reset-password',
  AUTH_REFRESH: '/api/v1/auth/refresh',
  AUTH_WITHDRAW: '/api/v1/auth/withdraw',
} as const
