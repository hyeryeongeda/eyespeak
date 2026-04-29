export type RecommendationCategoryKey = 'mood' | 'schedule' | 'frequent' | 'recent' | string

export type RecommendationComposeStep = 'subject' | 'object' | 'predicate' | 'punctuation'

export type RecommendationReplySender = 'guardian' | 'patient'

export type RecommendationReplySource = 'rule' | 'context' | 'fallback'

export type RecommendationSendSource =
  | 'recommended'
  | 'generated'
  | 'manual'
  | 'suggested_reply'
  | 'manual_text'
  | 'word_combination'

export interface RecommendationCategoryDto {
  key: RecommendationCategoryKey
  title: string
  description?: string
  hint?: string
}

export interface RecommendationCategoryListResponseDto {
  categories: RecommendationCategoryDto[]
}

export interface ReplyCategoriesRequestDto {
  message: string
}

export interface ReplyCategoriesResponseDto {
  categories: string[]
  sentimentMap: Record<string, string>
  intentMap: Record<string, string>
}

export interface RecommendationSentencesRequestDto {
  categoryKey: RecommendationCategoryKey
  guardianMessage?: string
  recentMessages?: string[]
}

export interface RecommendationSentencesResponseDto {
  sentences: string[]
}

export interface RecommendationWordsRequestDto {
  categoryKey?: RecommendationCategoryKey
  step: RecommendationComposeStep
  refreshCount?: number
  selectedWords?: {
    subject?: string
    object?: string
  }
}

export interface RecommendationWordsResponseDto {
  step: RecommendationComposeStep
  words: string[]
}

export interface RecommendationComposeRequestDto {
  categoryKey?: RecommendationCategoryKey
  subject?: string
  object?: string
  predicate?: string
  punctuation?: string
  guardianMessage?: string
  recentMessages?: string[]
}

export interface RecommendationComposeResponseDto {
  sentences: string[]
}

export interface RecommendationRecordRequestDto {
  text: string
}

export interface RecommendationRecordResponseDto {
  expressionId: number
  isNew: boolean
}

export interface RecommendationReplyHistoryItemDto {
  sender: RecommendationReplySender
  content: string
}

export interface RecommendationRepliesRequestDto {
  message: string
  history?: RecommendationReplyHistoryItemDto[]
}

export interface RecommendationReplyDto {
  id: string
  label: string
  intentKey: string
  source: RecommendationReplySource
  rank: number
}

export interface RecommendationRepliesResponseDto {
  replies: RecommendationReplyDto[]
}

export interface RecommendationSendRequestDto {
  text: string
  source: RecommendationSendSource
  replyToId?: string
}

export interface RecommendationSendResponseDto {
  messageId?: string
  submittedAt?: string
}
