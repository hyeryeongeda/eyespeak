import { getActiveApiMode, resolveApiSource } from '../config/env'
import type { ServiceResult } from '../types/api'
import type {
  DailyMoodCreateRequestDto,
  DailyMoodResponseDto,
} from '../types/dailyMood'
import { createServiceFailure, logServiceFailure } from '../utils/errorMapper'
import { getActiveAuthSession } from './authSessionRegistry'
import { createDailyMoodApi, getTodayDailyMoodApi } from './dailyMoodApi'

const MOCK_DAILY_MOOD_STORAGE_KEY = 'mockDailyMood:v1'

function getDailyMoodAccessToken(accessToken?: string | null) {
  return accessToken ?? getActiveAuthSession()?.accessToken ?? null
}

function getDailyMoodSessionKey() {
  const session = getActiveAuthSession()

  if (!session) {
    return null
  }

  return `${session.userId ?? session.id}`
}

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readMockDailyMoodStorage() {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_DAILY_MOOD_STORAGE_KEY)

    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue) as Record<string, DailyMoodResponseDto>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMockDailyMoodStorage(nextValue: Record<string, DailyMoodResponseDto>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    MOCK_DAILY_MOOD_STORAGE_KEY,
    JSON.stringify(nextValue),
  )
}

function getMockDailyMoodStorageKey() {
  const sessionKey = getDailyMoodSessionKey()

  if (!sessionKey) {
    return null
  }

  return `${sessionKey}:${getTodayDateString()}`
}

function sanitizeDailyMoodRequest(request: DailyMoodCreateRequestDto) {
  return {
    moodType: request.moodType,
    moodLevel: request.moodLevel,
  }
}

function isDailyMoodResponseDto(value: unknown): value is DailyMoodResponseDto {
  if (!value || typeof value !== 'object') {
    return false
  }

  const response = value as Partial<DailyMoodResponseDto>

  return (
    typeof response.moodId === 'number' &&
    typeof response.moodDate === 'string' &&
    typeof response.moodType === 'string' &&
    typeof response.moodLevel === 'number'
  )
}

function normalizeTodayDailyMoodResponse(value: unknown): DailyMoodResponseDto | null {
  if (value == null) {
    return null
  }

  if (isDailyMoodResponseDto(value)) {
    return value
  }

  if (typeof value === 'object') {
    const envelope = value as Record<string, unknown>
    const isSuccessEnvelopeWithoutData =
      envelope.code === 'SUCCESS' &&
      typeof envelope.message === 'string' &&
      !('data' in envelope)

    if (isSuccessEnvelopeWithoutData) {
      return null
    }
  }

  return value as DailyMoodResponseDto
}

export async function getTodayDailyMood(
  accessToken?: string | null,
): Promise<ServiceResult<DailyMoodResponseDto | null>> {
  const apiMode = getActiveApiMode()

  if (apiMode !== 'real') {
    const storageKey = getMockDailyMoodStorageKey()
    const storedMoods = readMockDailyMoodStorage()

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data: storageKey ? storedMoods[storageKey] ?? null : null,
    }
  }

  const resolvedAccessToken = getDailyMoodAccessToken(accessToken)

  if (!resolvedAccessToken) {
    return {
      success: false,
      source: resolveApiSource(apiMode),
      statusCode: 401,
      message: '오늘의 기분을 조회할 인증 정보가 없습니다.',
    }
  }

  try {
    const data = normalizeTodayDailyMoodResponse(
      await getTodayDailyMoodApi(resolvedAccessToken),
    )

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data,
    }
  } catch (error) {
    const failure = createServiceFailure(
      error,
      '오늘의 기분을 불러오지 못했습니다.',
    )
    if (failure.statusCode === 404) {
      return {
        success: true,
        source: resolveApiSource(apiMode),
        data: null,
      }
    }

    logServiceFailure('daily-mood.get-today', error, failure)
    return failure
  }
}

export async function createDailyMood(
  request: DailyMoodCreateRequestDto,
  accessToken?: string | null,
): Promise<ServiceResult<DailyMoodResponseDto>> {
  const apiMode = getActiveApiMode()

  if (apiMode !== 'real') {
    const storageKey = getMockDailyMoodStorageKey()

    if (!storageKey) {
      return {
        success: false,
        source: resolveApiSource(apiMode),
        statusCode: 401,
        message: '오늘의 기분을 저장할 사용자 정보가 없습니다.',
      }
    }

    const storedMoods = readMockDailyMoodStorage()

    if (storedMoods[storageKey]) {
      return {
        success: false,
        source: resolveApiSource(apiMode),
        statusCode: 409,
        code: 'MOOD-1201',
        message: '오늘의 기분은 이미 등록되어 있습니다.',
      }
    }

    const nextRecord: DailyMoodResponseDto = {
      moodId: Date.now(),
      moodDate: getTodayDateString(),
      moodType: request.moodType,
      moodLevel: request.moodLevel,
    }

    writeMockDailyMoodStorage({
      ...storedMoods,
      [storageKey]: nextRecord,
    })

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data: nextRecord,
    }
  }

  const resolvedAccessToken = getDailyMoodAccessToken(accessToken)

  if (!resolvedAccessToken) {
    return {
      success: false,
      source: resolveApiSource(apiMode),
      statusCode: 401,
      message: '오늘의 기분을 저장할 인증 정보가 없습니다.',
    }
  }

  try {
    const data = await createDailyMoodApi(request, resolvedAccessToken)

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data,
    }
  } catch (error) {
    const failure = createServiceFailure(
      error,
      '오늘의 기분 저장에 실패했습니다.',
    )
    logServiceFailure(
      'daily-mood.create',
      error,
      failure,
      sanitizeDailyMoodRequest(request),
    )
    return failure
  }
}
