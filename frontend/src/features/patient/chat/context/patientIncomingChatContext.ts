import { createContext, useContext } from 'react'
import { PATIENT_CHAT_MESSAGE_PRESETS } from '../../../../services/mockPatientChatService'
import type { RecommendationCategoryKey } from '../../../../types/recommendation'
import type {
  PatientChatManualInputMode,
  PatientChatMessage,
  PatientChatSendOutcome,
  PatientChatSessionState,
  PatientSuggestedResponse,
} from '../../../../types/chat'

export interface PatientIncomingChatContextValue {
  state: PatientChatSessionState
  activeMessage: PatientChatMessage | null
  activeReplyMessage: PatientChatMessage | null
  latestUnresolvedMessage: PatientChatMessage | null
  unreadCount: number
  unresolvedCount: number
  shouldShowInterruptOverlay: boolean
  shouldShowReplyOverlay: boolean
  isTalkRoute: boolean
  manualWordBank: string[]
  timeoutMs: number
  availablePresets: typeof PATIENT_CHAT_MESSAGE_PRESETS
  setRoutePathname: (pathname: string) => void
  triggerIncomingPreset: (
    presetKey: (typeof PATIENT_CHAT_MESSAGE_PRESETS)[number]['key'],
    options?: { messageId?: string },
  ) => void
  triggerDuplicateMessage: () => void
  focusLatestPendingMessage: () => void
  openLatestPendingReply: () => void
  enterReplyMode: (messageId?: string) => void
  retrySuggestions: () => void
  selectRecommendationCategory: (categoryKey: RecommendationCategoryKey) => Promise<void>
  setRecommendationCategoryPage: (page: number) => void
  openManualInputSelect: () => void
  setManualInputMode: (mode: PatientChatManualInputMode) => void
  updateManualDraft: (draft: string) => void
  appendManualWord: (word: string) => void
  clearManualDraft: () => void
  sendSuggestedReply: (suggestion: PatientSuggestedResponse) => Promise<void>
  sendManualReply: () => Promise<void>
  completeReplyCompletion: () => void
  deferActiveMessage: () => void
  closeReplyMode: () => void
  setNextSendOutcome: (outcome: PatientChatSendOutcome) => void
}

export const PatientIncomingChatContext =
  createContext<PatientIncomingChatContextValue | null>(null)

export function usePatientIncomingChat() {
  const context = useContext(PatientIncomingChatContext)

  if (!context) {
    throw new Error('usePatientIncomingChat must be used within PatientIncomingChatProvider')
  }

  return context
}
