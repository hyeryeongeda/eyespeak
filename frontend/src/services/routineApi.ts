import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { RoutineCreateRequestDto } from '../types/patient'

export function createRoutineApi(request: RoutineCreateRequestDto, accessToken?: string | null) {
  return apiClient.post<null, RoutineCreateRequestDto>(API_ENDPOINTS.ROUTINES, request, {
    accessToken,
  })
}
