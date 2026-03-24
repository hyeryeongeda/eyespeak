import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type {
  DailyMoodCreateRequestDto,
  DailyMoodResponseDto,
} from '../types/dailyMood'

export function getTodayDailyMoodApi(accessToken?: string | null) {
  return apiClient.get<DailyMoodResponseDto | null>(API_ENDPOINTS.DAILY_MOOD, {
    accessToken,
  })
}

export function createDailyMoodApi(
  request: DailyMoodCreateRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<DailyMoodResponseDto, DailyMoodCreateRequestDto>(
    API_ENDPOINTS.DAILY_MOOD,
    request,
    {
      accessToken,
    },
  )
}
