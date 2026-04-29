import type { RecommendationCategoryKey } from './recommendation'

export type PatientChatMessageSender = 'guardian' | 'patient'

export type PatientChatMessageType =
  | 'text'
  | 'stt'
  | 'suggested_reply'
  | 'manual_text'
  | 'word_combination'

export type PatientChatMessageStatus =
  | 'received'
  | 'unread'
  | 'pending_reply'
  | 'replied'

export type PatientChatSessionStatus =
  | 'idle'
  | 'waiting_message'
  | 'receiving'
  | 'received'
  | 'unread'
  | 'incoming_interrupt'
  | 'reply_mode'
  | 'category_loading'
  | 'category_ready'
  | 'suggestion_loading'
  | 'suggestion_ready'
  | 'suggestion_failed'
  | 'manual_input_select'
  | 'manual_input_typing'
  | 'sending'
  | 'sent'
  | 'reply_completion_pending'
  | 'send_failed'
  | 'conversation_active'
  | 'timeout'
  | 'deferred'
  | 'restoring'
  | 'restored'

export type PatientChatInterruptState =
  | 'none'
  | 'incoming_interrupt'
  | 'reply_mode'
  | 'completion_pending'
  | 'deferred'
  | 'restoring'
  | 'restored'

export type PatientChatFallbackState =
  | 'none'
  | 'suggestion_failed'
  | 'manual_input_select'
  | 'manual_input_typing'
  | 'send_failed'

export type PatientChatSuggestionState = 'idle' | 'loading' | 'ready' | 'failed'

export type PatientChatRecommendationMode = 'category' | 'sentence'

export type PatientChatCategoryState = 'idle' | 'loading' | 'ready' | 'failed'

export type PatientChatSuggestionMode = 'success' | 'failure' | 'empty'

export type PatientChatSendOutcome = 'auto' | 'success' | 'failure'

export type PatientChatManualInputMode = 'word_combination' | 'keyboard'

export type PatientChatRouteKind =
  | 'main'
  | 'talk'
  | 'leisure'
  | 'leisure_player'
  | 'body_mind'
  | 'favorites'
  | 'custom_talk'
  | 'unknown'

export interface PatientChatRouteContext {
  pathname: string
  label: string
  kind: PatientChatRouteKind
  responseSurface: 'inline' | 'overlay'
  canEnterReplyMode: boolean
  shouldPauseMediaOnInterrupt: boolean
}

export interface PatientChatMessageMeta {
  sourcePresetKey?: string
  suggestionMode?: PatientChatSuggestionMode
  sttConfidence?: number
  contentType?: 'TEXT' | 'PHRASE' | 'EXPRESSION'
  clientMessageId?: string | null
  phraseId?: number | null
  exprId?: number | null
  isOptimistic?: boolean
  historySource?: 'rest' | 'stomp' | 'local'
}

export interface PatientChatMessage {
  id: string
  sender: PatientChatMessageSender
  type: PatientChatMessageType
  content: string
  createdAt: string
  status: PatientChatMessageStatus
  replyToId?: string
  meta?: PatientChatMessageMeta
}

export interface PatientSuggestedResponse {
  id: string
  label: string
  intentKey: string
  source: 'rule' | 'context' | 'fallback' | 'category'
  rank: number
}

export interface PatientRecommendationCategory {
  key: RecommendationCategoryKey
  title: string
  description?: string
  hint?: string | null
}

export interface PatientChatSessionState {
  status: PatientChatSessionStatus
  interruptState: PatientChatInterruptState
  fallbackState: PatientChatFallbackState
  recommendationMode: PatientChatRecommendationMode
  categoryState: PatientChatCategoryState
  suggestionState: PatientChatSuggestionState
  messages: PatientChatMessage[]
  categories: PatientRecommendationCategory[]
  suggestions: PatientSuggestedResponse[]
  currentRoute: PatientChatRouteContext | null
  previousRoute: PatientChatRouteContext | null
  activeMessageId: string | null
  activeReplyMessageId: string | null
  selectedCategoryKey: RecommendationCategoryKey | null
  categoryPage: number
  manualInputMode: PatientChatManualInputMode | null
  manualDraft: string
  suggestionError: string | null
  sendError: string | null
  selectedSuggestionId: string | null
  responseTimeoutMessageId: string | null
  responseTimeoutAt: number | null
  nextSendOutcome: PatientChatSendOutcome
  suggestionAttempts: Record<string, number>
  isMediaPausedByInterrupt: boolean
  lastEventLabel: string
  duplicateReceiveCount: number
}
