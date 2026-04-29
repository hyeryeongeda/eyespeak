export type LeisureCardTone = 'sky' | 'sand' | 'mint' | 'rose' | 'slate'

export type LeisureCategoryId = 'sports' | 'news' | 'music' | 'radio' | 'audiobook'

export type LeisureMainStatus =
  | 'idle'
  | 'loading'
  | 'visible'
  | 'empty'
  | 'selecting'
  | 'transitioning'
  | 'error'

export type LeisureCategoryStatus =
  | 'idle'
  | 'loading'
  | 'visible'
  | 'empty'
  | 'error'
  | 'refreshing'
  | 'selecting'
  | 'transitioning'

export type LeisurePlayerStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'empty'
  | 'error'
  | 'overlay_open'
  | 'transitioning'

export type LeisureOverlayStatus =
  | 'idle'
  | 'loading'
  | 'visible'
  | 'empty'
  | 'error'
  | 'refreshing'
  | 'selecting'
  | 'closing'
  | 'transitioning'

export type LeisureViewStatus =
  | LeisureMainStatus
  | LeisureCategoryStatus
  | LeisurePlayerStatus
  | LeisureOverlayStatus

export interface LeisureCategory {
  id: LeisureCategoryId
  label: string
  description: string
  tone: LeisureCardTone
  accentColor: string
}

export interface LeisureContent {
  id: string
  title: string
  channelName: string
  thumbnailUrl: string
  embedUrl: string
  youtubeUrl: string
  videoId: string
  categoryId: LeisureCategoryId | null
  categoryLabel: string | null
  tags: string[]
  description: string
  durationLabel?: string
}

export interface LeisureMainPayload {
  categories: LeisureCategory[]
  featuredContent: LeisureContent | null
  registeredContents: LeisureContent[]
}

export interface LeisureCategoryPayload {
  category: LeisureCategory
  contents: LeisureContent[]
}

export interface LeisurePlayerRouteState {
  fromPath?: string
  fromLabel?: string
  categoryId?: LeisureCategoryId
}

export interface LeisureContentResponseDto {
  id: number
  name: string
  url: string | null
  category: LeisureCategoryId | null
  categoryName: string | null
}

export interface LeisureContentCreateRequestDto {
  name: string
  url: string | null
  category: LeisureCategoryId | null
}

export type LeisureContentUpdateRequestDto = LeisureContentCreateRequestDto
