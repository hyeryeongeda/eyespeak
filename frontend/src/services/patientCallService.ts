import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { MockPatientCallRequestResult } from '../types/patientCall'

export async function requestMockPatientCall(
  matchingId: number,
  accessToken: string,
): Promise<MockPatientCallRequestResult> {
  const requestedAt = Date.now()

  await apiClient.post(
    API_ENDPOINTS.CALL_CREATE,
    { matchingId, type: 'NORMAL' },
    { accessToken },
  )

  return {
    success: true,
    requestedAt,
  }
}
