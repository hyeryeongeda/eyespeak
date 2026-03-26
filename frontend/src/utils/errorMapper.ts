import { ApiError, type ApiSource, isApiError, type ServiceFailure } from '../types/api'

const STATUS_MESSAGES: Record<number, string> = {
  400: '입력값을 다시 확인해주세요.',
  401: '인증 정보가 올바르지 않습니다. 다시 확인해주세요.',
  404: '요청한 정보를 찾을 수 없습니다.',
  409: '이미 처리된 요청이거나 현재 상태에서 진행할 수 없습니다.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

const CODE_MESSAGES: Record<string, string> = {
  'AUTH-204': '이미 등록된 이메일입니다.',
  AUTH_INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  GUARDIAN_EMAIL_DUPLICATED: '이미 가입된 이메일입니다.',
  INITIAL_SURVEY_ALREADY_COMPLETED:
    '환자 기본 정보가 이미 저장되어 있습니다. 로그인 후 상태를 확인해주세요.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  NETWORK_ERROR: '네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.',
  PASSWORD_RESET_ROLE_REQUIRED:
    '보호자와 환자 계정이 모두 확인되었습니다. 역할을 다시 선택한 뒤 다시 시도해주세요.',
  PATIENT_ACCOUNT_ALREADY_EXISTS:
    '이 팀코드에는 이미 연결된 환자 계정이 있습니다. 환자 로그인으로 진행해주세요.',
  PATIENT_LOGIN_ID_DUPLICATED: '이미 사용 중인 환자 로그인 이메일입니다.',
  TEAM_CODE_NOT_FOUND: '팀코드를 찾을 수 없습니다. 입력한 팀코드를 다시 확인해주세요.',
}

function getRawErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return undefined
}

function getMessageByCode(code: string | undefined) {
  if (!code) {
    return undefined
  }

  if (CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code]
  }

  if (code.includes('TEAM_CODE') && (code.includes('NOT_FOUND') || code.includes('INVALID'))) {
    return '팀코드를 찾을 수 없습니다. 입력한 팀코드를 다시 확인해주세요.'
  }

  if (code.includes('EMAIL') && code.includes('DUPLICAT')) {
    return '이미 가입된 이메일입니다.'
  }

  if (code.includes('LOGIN_ID') && code.includes('DUPLICAT')) {
    return '이미 사용 중인 환자 로그인 이메일입니다.'
  }

  if (
    code.includes('CREDENTIAL') ||
    code.includes('WRONG_PASSWORD') ||
    code.includes('PASSWORD_MISMATCH')
  ) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  if (code.includes('SURVEY') || code.includes('ROUTINE')) {
    return '설문 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
  }

  return undefined
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
  const code = getApiErrorCode(error)
  const rawMessage = getRawErrorMessage(error)
  const statusCode = getApiErrorStatusCode(error)

  return (
    getMessageByCode(code) ??
    rawMessage ??
    (statusCode ? STATUS_MESSAGES[statusCode] : undefined) ??
    fallbackMessage
  )
}

export function getApiErrorDebugInfo(error: unknown) {
  return {
    source: getApiErrorSource(error),
    statusCode: getApiErrorStatusCode(error),
    code: getApiErrorCode(error),
    rawMessage: getRawErrorMessage(error),
    details: error instanceof ApiError ? error.details : undefined,
  }
}

export function logServiceFailure(
  scope: string,
  error: unknown,
  failure: ServiceFailure,
  context?: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) {
    return
  }

  console.error(`[${scope}] request failed`, {
    ...context,
    userMessage: failure.message,
    failure: {
      source: failure.source,
      statusCode: failure.statusCode,
      code: failure.code,
    },
    debug: getApiErrorDebugInfo(error),
  })
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
