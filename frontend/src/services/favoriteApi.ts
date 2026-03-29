import type {
  CategoryTreeResponseDto,
  FavoriteCreateRequestDto,
  FavoriteResponseDto,
  FavoriteUpdateRequestDto,
} from '../types/favorite'
import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'

export function getFavoritesApi(accessToken?: string | null) {
  return apiClient.get<FavoriteResponseDto[]>(API_ENDPOINTS.FAVORITES, {
    accessToken,
  })
}

export function createFavoriteApi(
  request: FavoriteCreateRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<Record<string, never>, FavoriteCreateRequestDto>(
    API_ENDPOINTS.FAVORITES,
    request,
    {
      accessToken,
    },
  )
}

export function updateFavoriteApi(
  favoriteId: number,
  request: FavoriteUpdateRequestDto,
  accessToken?: string | null,
) {
  return apiClient.put<Record<string, never>, FavoriteUpdateRequestDto>(
    `${API_ENDPOINTS.FAVORITES}/${favoriteId}`,
    request,
    {
      accessToken,
    },
  )
}

export function deleteFavoriteApi(favoriteId: number, accessToken?: string | null) {
  return apiClient.delete<Record<string, never>>(
    `${API_ENDPOINTS.FAVORITES}/${favoriteId}`,
    undefined,
    {
      accessToken,
    },
  )
}

export function getCategoryTreeApi(accessToken?: string | null) {
  return apiClient.get<CategoryTreeResponseDto[]>(API_ENDPOINTS.CATEGORIES_TREE, {
    accessToken,
  })
}
