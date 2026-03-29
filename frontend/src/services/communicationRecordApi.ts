import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { MonthlyRecordResponse, DailyRecordResponse } from '../types/care'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken(): string | null {
  return getActiveAuthSession()?.accessToken ?? null
}

export function getMonthlyRecordsApi(year: number, month: number) {
  return apiClient.get<MonthlyRecordResponse>(
    API_ENDPOINTS.COMMUNICATION_RECORDS_MONTHLY,
    { params: { year, month }, accessToken: getAccessToken() },
  )
}

export function getDailyRecordApi(date: string) {
  return apiClient.get<DailyRecordResponse>(
    API_ENDPOINTS.COMMUNICATION_RECORDS_DAILY,
    { params: { date }, accessToken: getAccessToken() },
  )
}
