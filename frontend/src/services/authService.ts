import { getActiveApiMode } from './apiClient'
import { loginApi, logoutApi, refreshApi, requestPasswordResetApi, withdrawApi } from './authApi'
import { mapAuthResponseToSession } from './authSessionMapper'
import type {
  AuthSession,
  LoginFormValues,
  LoginRequestDto,
  PasswordResetRequestDto,
  PasswordResetResponseDto,
} from '../types/auth'
import type { ServiceResult } from '../types/api'
import { createServiceFailure } from '../utils/errorMapper'

function mapLoginValuesToRequest(values: LoginFormValues): LoginRequestDto {
  // TODO(BE): /auth/login 요청 필드(identifier/email/loginId) 계약 확정 시 여기서만 교체.
  return {
    identifier: values.identifier.trim(),
    password: values.password,
    role: values.role,
  }
}

export async function login(values: LoginFormValues): Promise<ServiceResult<AuthSession>> {
  try {
    const response = await loginApi(mapLoginValuesToRequest(values))

    return {
      success: true,
      source: getActiveApiMode() === 'mock' ? 'mock' : 'api',
      data: mapAuthResponseToSession(response),
    }
  } catch (error) {
    return createServiceFailure(error, '로그인에 실패했습니다.')
  }
}

export async function logout(session: AuthSession | null): Promise<ServiceResult<null>> {
  if (!session) {
    return {
      success: true,
      source: 'mock',
      data: null,
    }
  }

  try {
    await logoutApi(
      {
        refreshToken: session.refreshToken,
      },
      session.accessToken,
    )

    return {
      success: true,
      source: getActiveApiMode() === 'mock' ? 'mock' : 'api',
      data: null,
    }
  } catch (error) {
    return createServiceFailure(error, '로그아웃 처리에 실패했습니다.')
  }
}

export async function refreshSession(
  session: AuthSession | null,
): Promise<ServiceResult<AuthSession>> {
  if (!session?.refreshToken) {
    return {
      success: false,
      source: 'mock',
      message: '리프레시 토큰이 없습니다.',
      statusCode: 401,
    }
  }

  try {
    const response = await refreshApi({
      refreshToken: session.refreshToken,
    })

    return {
      success: true,
      source: getActiveApiMode() === 'mock' ? 'mock' : 'api',
      data: mapAuthResponseToSession(response),
    }
  } catch (error) {
    return createServiceFailure(error, '세션 갱신에 실패했습니다.')
  }
}

export async function requestPasswordReset(
  values: PasswordResetRequestDto,
): Promise<ServiceResult<PasswordResetResponseDto>> {
  try {
    const response = await requestPasswordResetApi({
      identifier: values.identifier.trim(),
      role: values.role,
    })

    return {
      success: true,
      source: getActiveApiMode() === 'mock' ? 'mock' : 'api',
      data: response,
    }
  } catch (error) {
    return createServiceFailure(error, '비밀번호 재설정 요청에 실패했습니다.')
  }
}

export async function withdraw(
  session: AuthSession | null,
  reason?: string,
): Promise<ServiceResult<null>> {
  if (!session) {
    return {
      success: false,
      source: 'mock',
      message: '로그인 정보가 없습니다.',
      statusCode: 401,
    }
  }

  try {
    await withdrawApi({ reason }, session.accessToken)

    return {
      success: true,
      source: getActiveApiMode() === 'mock' ? 'mock' : 'api',
      data: null,
    }
  } catch (error) {
    return createServiceFailure(error, '회원 탈퇴 처리에 실패했습니다.')
  }
}
