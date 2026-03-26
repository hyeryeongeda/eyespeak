import { getActiveApiMode, resolveApiSource } from '../config/env'
import type { ServiceResult } from '../types/api'
import type { UsageLogCreateRequestDto } from '../types/usageLog'
import { createServiceFailure, logServiceFailure } from '../utils/errorMapper'
import { getActiveAuthSession } from './authSessionRegistry'
import { createUsageLogApi } from './usageLogApi'

function getUsageLogAccessToken(accessToken?: string | null) {
  return accessToken ?? getActiveAuthSession()?.accessToken ?? null
}

function sanitizeUsageLogRequest(request: UsageLogCreateRequestDto) {
  return {
    phraseId: request.phraseId,
    exprId: request.exprId,
    content: request.content,
    moodType: request.moodType,
    moodLevel: request.moodLevel,
  }
}

export async function createUsageLog(
  request: UsageLogCreateRequestDto,
  accessToken?: string | null,
): Promise<ServiceResult<null>> {
  const apiMode = getActiveApiMode()

  if (apiMode !== 'real') {
    return {
      success: true,
      source: resolveApiSource(apiMode),
      data: null,
    }
  }

  const resolvedAccessToken = getUsageLogAccessToken(accessToken)

  if (!resolvedAccessToken) {
    return {
      success: false,
      source: resolveApiSource(apiMode),
      statusCode: 401,
      message: '사용 로그 전송을 위한 인증 정보가 없습니다.',
    }
  }

  try {
    await createUsageLogApi(request, resolvedAccessToken)

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data: null,
    }
  } catch (error) {
    const failure = createServiceFailure(error, '사용 로그 전송에 실패했습니다.')
    logServiceFailure('usage-log.create', error, failure, sanitizeUsageLogRequest(request))
    return failure
  }
}

export function createUsageLogSilently(
  request: UsageLogCreateRequestDto,
  accessToken?: string | null,
) {
  void createUsageLog(request, accessToken)
}

export function logPhraseUsageSilently(phraseId: number, accessToken?: string | null) {
  createUsageLogSilently(
    {
      phraseId,
    },
    accessToken,
  )
}
