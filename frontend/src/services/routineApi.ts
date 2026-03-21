import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { RoutineCreateRequestDto } from '../types/patient'
import type { RoutineResponseItem, RoutineRequestItem } from '../types/care'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken(): string | null {
  return getActiveAuthSession()?.accessToken ?? null
}

// POST /routines — 초기 루틴 생성 (회원가입 플로우)
export function createRoutineApi(request: RoutineCreateRequestDto, accessToken?: string | null) {
  return apiClient.post<null, RoutineCreateRequestDto>(API_ENDPOINTS.ROUTINES, request, {
    accessToken,
  })
}

// GET /routines — 루틴 조회
export function getRoutinesApi() {
  return apiClient.get<{ routines: RoutineResponseItem[] }>(
    API_ENDPOINTS.ROUTINES,
    { accessToken: getAccessToken() },
  )
}

// PUT /routines — 루틴 수정
export function updateRoutinesApi(routines: RoutineRequestItem[]) {
  return apiClient.put<null, { routines: RoutineRequestItem[] }>(
    API_ENDPOINTS.ROUTINES,
    { routines },
    { accessToken: getAccessToken() },
  )
}

