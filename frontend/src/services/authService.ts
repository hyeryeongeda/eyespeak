import { getActiveApiMode, resolveApiSource } from '../config/env'
import type { ApiMode, ServiceResult } from '../types/api'
import type {
  AuthSession,
  EmailCheckRequestDto,
  EmailCheckResponseDto,
  LoginFormValues,
  LoginRequestDto,
  PasswordResetRequestDto,
  PasswordResetResponseDto,
} from '../types/auth'
import { createServiceFailure, logServiceFailure } from '../utils/errorMapper'
import { checkEmailApi, loginApi, logoutApi, refreshApi, requestPasswordResetApi, withdrawApi } from './authApi'
import { mapAuthResponseToSession } from './authSessionMapper'
import {
  checkEmailMockApi,
  loginMockApi,
  logoutMockApi,
  refreshMockApi,
  requestPasswordResetMockApi,
  withdrawMockApi,
} from './mockAuthApi'

function isExpectedEmailCheckFailure(code?: string, statusCode?: number) {
  if (code === 'AUTH-204') {
    return true
  }

  if (code === 'GUARDIAN_EMAIL_DUPLICATED' || code === 'PATIENT_LOGIN_ID_DUPLICATED') {
    return true
  }

  return statusCode === 409
}

function mapLoginValuesToRequest(values: LoginFormValues): LoginRequestDto {
  return {
    identifier: values.identifier.trim(),
    password: values.password,
    role: values.role,
  }
}

function getSessionApiMode(session?: Pick<AuthSession, 'authMode'> | null): ApiMode {
  return session?.authMode ?? getActiveApiMode()
}

export async function checkEmailAvailability(email: string) {
  const authMode = getActiveApiMode()
  const request: EmailCheckRequestDto = {
    email: email.trim().toLowerCase(),
  }

  try {
    let response: EmailCheckResponseDto | null = null

    if (authMode === 'mock') {
      response = await checkEmailMockApi(request)
    } else {
      response = await checkEmailApi(request)
    }

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: response,
    } as const
  } catch (error) {
    const failure = createServiceFailure(error, '이메일 중복 확인에 실패했습니다.')
    if (!isExpectedEmailCheckFailure(failure.code, failure.statusCode)) {
      logServiceFailure('auth.check-email', error, failure, { email: request.email })
    }
    return failure
  }
}

export async function login(values: LoginFormValues): Promise<ServiceResult<AuthSession>> {
  const authMode = getActiveApiMode()

  try {
    const response =
      authMode === 'mock'
        ? await loginMockApi(mapLoginValuesToRequest(values))
        : await loginApi(mapLoginValuesToRequest(values))

    const session = mapAuthResponseToSession(response, authMode)

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: session,
    }
  } catch (error) {
    const failure = createServiceFailure(error, '로그인에 실패했습니다.')
    logServiceFailure('auth.login', error, failure, { role: values.role })
    return failure
  }
}

export async function logout(session: AuthSession | null): Promise<ServiceResult<null>> {
  const authMode = getSessionApiMode(session)

  if (!session) {
    return {
      success: true,
      source: resolveApiSource(authMode),
      data: null,
    }
  }

  try {
    const request = {
      refreshToken: session.refreshToken,
    }

    if (authMode === 'mock') {
      await logoutMockApi(request, session.accessToken)
    } else {
      await logoutApi(request, session.accessToken)
    }

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: null,
    }
  } catch (error) {
    const failure = createServiceFailure(error, '로그아웃에 실패했습니다.')
    logServiceFailure('auth.logout', error, failure, { role: session.role })
    return failure
  }
}

export async function refreshSession(
  session: AuthSession | null,
): Promise<ServiceResult<AuthSession>> {
  const authMode = getSessionApiMode(session)

  if (!session?.refreshToken) {
    return {
      success: false,
      source: resolveApiSource(authMode),
      message: '리프레시 토큰이 없습니다.',
      statusCode: 401,
    }
  }

  try {
    const request = {
      refreshToken: session.refreshToken,
    }
    const response =
      authMode === 'mock' ? await refreshMockApi(request) : await refreshApi(request)

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: mapAuthResponseToSession(response, authMode),
    }
  } catch (error) {
    const failure = createServiceFailure(error, '세션 갱신에 실패했습니다.')
    logServiceFailure('auth.refresh', error, failure, { role: session.role })
    return failure
  }
}

export async function requestPasswordReset(
  values: PasswordResetRequestDto,
): Promise<ServiceResult<PasswordResetResponseDto>> {
  const authMode = getActiveApiMode()

  try {
    const request = {
      identifier: values.identifier.trim(),
      role: values.role,
    }
    const response =
      authMode === 'mock'
        ? await requestPasswordResetMockApi(request)
        : await requestPasswordResetApi(request)

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: response,
    }
  } catch (error) {
    const failure = createServiceFailure(error, '비밀번호 재설정 요청에 실패했습니다.')
    logServiceFailure('auth.reset-password', error, failure, { role: values.role ?? null })
    return failure
  }
}

export async function withdraw(
  session: AuthSession | null,
  reason?: string,
): Promise<ServiceResult<null>> {
  const authMode = getSessionApiMode(session)

  if (!session) {
    return {
      success: false,
      source: resolveApiSource(authMode),
      message: '로그인 정보가 없습니다.',
      statusCode: 401,
    }
  }

  try {
    const request = { reason }

    if (authMode === 'mock') {
      await withdrawMockApi(request, session.accessToken)
    } else {
      await withdrawApi(request, session.accessToken)
    }

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: null,
    }
  } catch (error) {
    const failure = createServiceFailure(error, '회원 탈퇴에 실패했습니다.')
    logServiceFailure('auth.withdraw', error, failure, { role: session.role })
    return failure
  }
}
