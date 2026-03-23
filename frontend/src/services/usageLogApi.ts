import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { UsageLogCreateRequestDto } from '../types/usageLog'

export function createUsageLogApi(
  request: UsageLogCreateRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<void, UsageLogCreateRequestDto>(API_ENDPOINTS.USAGE_LOGS, request, {
    accessToken,
  })
}
