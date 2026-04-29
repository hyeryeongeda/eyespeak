import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type {
  DwellTimeResponseDto,
  DwellTimeRequestDto,
  ActivationDelayResponseDto,
  ActivationDelayRequestDto,
} from '../types/care'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken(): string | null {
  return getActiveAuthSession()?.accessToken ?? null
}

export function getDwellTimeApi() {
  return apiClient.get<DwellTimeResponseDto>(
    API_ENDPOINTS.PATIENT_SETTINGS_DWELL_TIME,
    { accessToken: getAccessToken() },
  )
}

export function updateDwellTimeApi(data: DwellTimeRequestDto) {
  return apiClient.put<DwellTimeResponseDto, DwellTimeRequestDto>(
    API_ENDPOINTS.PATIENT_SETTINGS_DWELL_TIME,
    data,
    { accessToken: getAccessToken() },
  )
}

export function getActivationDelayApi() {
  return apiClient.get<ActivationDelayResponseDto>(
    API_ENDPOINTS.PATIENT_SETTINGS_ACTIVATION_DELAY,
    { accessToken: getAccessToken() },
  )
}

export function updateActivationDelayApi(data: ActivationDelayRequestDto) {
  return apiClient.put<ActivationDelayResponseDto, ActivationDelayRequestDto>(
    API_ENDPOINTS.PATIENT_SETTINGS_ACTIVATION_DELAY,
    data,
    { accessToken: getAccessToken() },
  )
}
