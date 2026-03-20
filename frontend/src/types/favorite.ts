export interface FavoriteResponseDto {
  favoriteId: number
  phraseId: number
  content: string
  categoryId: number
  categoryName: string
}

export interface FavoriteCreateRequestDto {
  phraseId: number
}

export interface FavoriteUpdateRequestDto {
  phraseId: number
}

export interface FavoriteItem {
  favoriteId: number
  phraseId: number
  content: string
  categoryId: number
  categoryName: string
}

export type KnownFavoriteErrorCode =
  | 'COMM-603'
  | 'COMM-605'
  | 'COMM-606'
  | 'COMM-607'
  | 'AUTH-203'
  | 'MATCHING-803'

export type FavoriteErrorCode = KnownFavoriteErrorCode | string
