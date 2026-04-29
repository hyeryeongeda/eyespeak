import type {
  LeisureContentCreateRequestDto,
  LeisureContentResponseDto,
  LeisureContentUpdateRequestDto,
} from '../types/leisure'
import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

export function getLeisureContentsApi() {
  return apiClient.get<LeisureContentResponseDto[]>(API_ENDPOINTS.LEISURE_CONTENTS, {
    accessToken: getAccessToken(),
  })
}

export function createLeisureContentApi(payload: LeisureContentCreateRequestDto) {
  return apiClient.post<void, LeisureContentCreateRequestDto>(
    API_ENDPOINTS.LEISURE_CONTENTS,
    payload,
    {
      accessToken: getAccessToken(),
    },
  )
}

export function updateLeisureContentApi(
  contentId: number,
  payload: LeisureContentUpdateRequestDto,
) {
  return apiClient.put<void, LeisureContentUpdateRequestDto>(
    `${API_ENDPOINTS.LEISURE_CONTENTS}/${contentId}`,
    payload,
    {
      accessToken: getAccessToken(),
    },
  )
}

export function deleteLeisureContentApi(contentId: number) {
  return apiClient.delete<void>(
    `${API_ENDPOINTS.LEISURE_CONTENTS}/${contentId}`,
    undefined,
    {
      accessToken: getAccessToken(),
    },
  )
}
