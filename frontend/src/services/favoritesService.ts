import type { FavoriteItem, FavoritesSortKey } from '../types/favorites'

const FAVORITES_PAGE_SIZE = 4

/** API 연동 시 이 함수만 교체하면 됨. 반환 타입은 그대로 FavoriteItem[] 유지 */
export async function fetchFavorites(
  _patientId: string,
  _sortKey: FavoritesSortKey = 'recentUsed',
): Promise<FavoriteItem[]> {
  // TODO: Replace with real API, e.g. GET /api/patient/favorites?sort=recentUsed
  await new Promise<void>(resolve => setTimeout(resolve, 400))

  return getMockFavorites()
}

/**
 * 즐겨찾기 항목 선택 전송.
 * API 연동 시 이 함수 내부만 수정하면 됨.
 */
export interface SubmitFavoriteSelectionResult {
  success: boolean
  source: 'mock' | 'api'
  errorMessage?: string
}

export async function submitFavoriteSelection(
  _patientId: string,
  _favoriteId: string,
  _text: string,
): Promise<SubmitFavoriteSelectionResult> {
  // TODO: Replace with real API, e.g. POST /api/patient/favorites/select { favoriteId, text }
  await new Promise<void>(resolve => setTimeout(resolve, 300))

  return { success: true, source: 'mock' }
}

/** 현재 mock 기준 고정 정렬. 정책 확정 후 sortKey에 따라 정렬 로직 추가 */
function getMockFavorites(): FavoriteItem[] {
  return [
    { id: 'fav-1', text: '물 마시고 싶어요', category: '식사', usageCount: 12, updatedAt: '2025-03-18T10:00:00Z' },
    { id: 'fav-2', text: '화장실 가고 싶어요', category: '배변', usageCount: 8, updatedAt: '2025-03-18T09:30:00Z' },
    { id: 'fav-3', text: '아파요', category: '몸과마음', usageCount: 15, updatedAt: '2025-03-18T09:00:00Z' },
    { id: 'fav-4', text: '잘 모르겠어요', category: '일반', usageCount: 5, updatedAt: '2025-03-17T14:00:00Z' },
    { id: 'fav-5', text: '네, 좋아요', category: '일반', usageCount: 20, updatedAt: '2025-03-17T12:00:00Z' },
    { id: 'fav-6', text: '조금만 더 주세요', category: '식사', usageCount: 3, updatedAt: '2025-03-16T11:00:00Z' },
  ]
}

/** 페이지당 개수 (목록 조회와 무관하게 UI에서 사용하는 상수) */
export const FAVORITES_PAGE_SIZE_EXPORT = FAVORITES_PAGE_SIZE
