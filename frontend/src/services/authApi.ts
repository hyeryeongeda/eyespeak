import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type {
  AuthResponseDto,
  EmailCheckRequestDto,
  GuardianSignupRequestDto,
  LoginRequestDto,
  LogoutRequestDto,
  PasswordResetRequestDto,
  PasswordResetResponseDto,
  RefreshRequestDto,
  WithdrawRequestDto,
} from '../types/auth'

export function checkEmailApi(request: EmailCheckRequestDto) {
  return apiClient.post<void, EmailCheckRequestDto>(API_ENDPOINTS.AUTH_CHECK_EMAIL, request)
}

export function loginApi(request: LoginRequestDto) {
  return apiClient.post<AuthResponseDto, LoginRequestDto>(API_ENDPOINTS.AUTH_LOGIN, request)
}

export function logoutApi(request: LogoutRequestDto, accessToken?: string | null) {
  return apiClient.post<{ success: boolean }, LogoutRequestDto>(API_ENDPOINTS.AUTH_LOGOUT, request, {
    accessToken,
  })
}

export function signUpGuardianApi(request: GuardianSignupRequestDto) {
  return apiClient.post<AuthResponseDto, GuardianSignupRequestDto>(
    API_ENDPOINTS.AUTH_SIGNUP_GUARDIAN,
    request,
  )
}

export function refreshApi(request: RefreshRequestDto) {
  return apiClient.post<AuthResponseDto, RefreshRequestDto>(API_ENDPOINTS.AUTH_REFRESH, request)
}

export function requestPasswordResetApi(request: PasswordResetRequestDto) {
  return apiClient.post<PasswordResetResponseDto, PasswordResetRequestDto>(
    API_ENDPOINTS.AUTH_RESET_PASSWORD,
    request,
  )
}

export function withdrawApi(request: WithdrawRequestDto, accessToken?: string | null) {
  return apiClient.delete<{ success: boolean }, WithdrawRequestDto>(
    API_ENDPOINTS.AUTH_WITHDRAW,
    request,
    {
      accessToken,
    },
  )
}
