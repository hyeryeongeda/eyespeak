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
  | 'suggestion_loading'
  | 'suggestion_ready'
  | 'suggestion_failed'
  | 'manual_input_select'
  | 'manual_input_typing'
  | 'sending'
  | 'sent'
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
  source: 'rule' | 'context' | 'fallback'
  rank: number
}

export interface PatientChatSessionState {
  status: PatientChatSessionStatus
  interruptState: PatientChatInterruptState
  fallbackState: PatientChatFallbackState
  suggestionState: PatientChatSuggestionState
  messages: PatientChatMessage[]
  suggestions: PatientSuggestedResponse[]
  currentRoute: PatientChatRouteContext | null
  previousRoute: PatientChatRouteContext | null
  activeMessageId: string | null
  activeReplyMessageId: string | null
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
