import { loginApi, logoutApi, refreshApi, withdrawApi } from './authApi'
import type {
  AuthResponseDto,
  AuthSession,
  LoginFormValues,
  LoginRequestDto,
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

export async function login(values: LoginFormValues): Promise<ServiceResult<AuthSession>> {
  try {
    const response = await loginApi(mapLoginValuesToRequest(values))

    return {
      success: true,
      source: 'mock',
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
      source: 'mock',
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
      source: 'mock',
      data: mapAuthResponseToSession(response),
    }
  } catch (error) {
    return createServiceFailure(error, '세션 갱신에 실패했습니다.')
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
      source: 'mock',
      data: null,
    }
  } catch (error) {
    return createServiceFailure(error, '회원 탈퇴 처리에 실패했습니다.')
  }
}
