/**
 * PAT-FAV-001 즐겨찾기 목록 타입
 * API 연동 시 동일 구조로 응답 매핑하면 됨.
 */
export interface FavoriteItem {
  id: string
  phraseId: number
  text: string
  category?: string
  usageCount?: number
  updatedAt?: string
}

/**
 * 정렬 기준 (정책 미확정 시 mock 고정, 추후 교체 용이하도록 타입 분리)
 */
export type FavoritesSortKey = 'recentUsed' | 'guardianOrder' | 'usageCount'

export type FavoritesStatus =
  | 'idle'
  | 'loading'
  | 'visible'
  | 'selecting'
  | 'completed'
  | 'empty'
  | 'transitioning'
  | 'error'

/** 목록 조회 실패 vs 선택 반영 실패 구분 */
export type FavoritesErrorKind = 'fetch' | 'submit'
