import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { LeisureContentItem, LeisureContentRequest } from '../types/care'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

export function getLeisureContentsApi() {
  return apiClient.get<LeisureContentItem[]>(
    API_ENDPOINTS.LEISURE_CONTENTS,
    { accessToken: getAccessToken() },
  )
}

export function createLeisureContentApi(data: LeisureContentRequest) {
  return apiClient.post<unknown, LeisureContentRequest>(
    API_ENDPOINTS.LEISURE_CONTENTS,
    data,
    { accessToken: getAccessToken() },
  )
}

export function updateLeisureContentApi(contentId: number, data: LeisureContentRequest) {
  return apiClient.put<unknown, LeisureContentRequest>(
    `${API_ENDPOINTS.LEISURE_CONTENTS}/${contentId}`,
    data,
    { accessToken: getAccessToken() },
  )
}

export function deleteLeisureContentApi(contentId: number) {
  return apiClient.delete<unknown>(
    `${API_ENDPOINTS.LEISURE_CONTENTS}/${contentId}`,
    undefined,
    { accessToken: getAccessToken() },
  )
}
