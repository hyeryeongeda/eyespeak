import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { PatientInfo, PatientInfoUpdateRequest } from '../types/care'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken(): string | null {
  return getActiveAuthSession()?.accessToken ?? null
}

export function getPatientInfoApi() {
  return apiClient.get<PatientInfo>(API_ENDPOINTS.PATIENTS_INFO, {
    accessToken: getAccessToken(),
  })
}

export function updatePatientInfoApi(info: PatientInfoUpdateRequest) {
  return apiClient.put<unknown, PatientInfoUpdateRequest>(API_ENDPOINTS.PATIENTS_INFO, info, {
    accessToken: getAccessToken(),
  })
}
