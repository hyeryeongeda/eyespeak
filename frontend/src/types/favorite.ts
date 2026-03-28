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

export interface CategoryTreeResponseDto {
  categoryId: number
  name: string
  depth: number
  orderIndex: number
  children: CategoryTreeResponseDto[]
  phrases: PhraseResponseDto[]
}

export interface PhraseResponseDto {
  phraseId: number
  content: string
  orderIndex: number
}

export interface PhraseCategory {
  categoryId: number
  categoryName: string
  phrases: PhraseItem[]
}

export interface PhraseItem {
  phraseId: number
  content: string
}
