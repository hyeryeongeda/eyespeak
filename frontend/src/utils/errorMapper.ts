import { ApiError, type ApiSource, isApiError, type ServiceFailure } from '../types/api'

const STATUS_MESSAGES: Record<number, string> = {
  400: '입력값을 다시 확인해주세요.',
  401: '인증에 실패했습니다. 다시 로그인해주세요.',
  404: '요청한 정보를 찾을 수 없습니다.',
  409: '이미 등록된 정보이거나 현재 상태에서 처리할 수 없습니다.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

export function getApiErrorStatusCode(error: unknown) {
  return isApiError(error) ? error.statusCode : undefined
}

export function getApiErrorSource(error: unknown): ApiSource {
  return isApiError(error) ? error.source : 'api'
}

export function getApiErrorCode(error: unknown) {
  return isApiError(error) ? error.code : undefined
}

export function mapApiErrorToMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return STATUS_MESSAGES[error.statusCode] ?? error.message ?? fallbackMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

export function createServiceFailure(
  error: unknown,
  fallbackMessage: string,
): ServiceFailure {
  return {
    success: false,
    message: mapApiErrorToMessage(error, fallbackMessage),
    source: getApiErrorSource(error),
    statusCode: getApiErrorStatusCode(error),
    code: getApiErrorCode(error),
  }
}
