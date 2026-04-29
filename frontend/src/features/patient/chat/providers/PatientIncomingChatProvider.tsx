import { type PropsWithChildren, useCallback, useEffect, useReducer, useRef } from 'react'
import {
  PATIENT_CHAT_MESSAGE_PRESETS,
  PATIENT_CHAT_RESPONSE_TIMEOUT_MS,
  createMockIncomingPatientChatMessage,
} from '../../../../services/mockPatientChatService'
import {
  MAX_SUGGESTION_RETRIES,
  buildManualWordBank,
} from '../../../../services/mockSuggestionService'
import {
  fetchSuggestedReplyCategories,
  fetchSuggestedReplies,
  fetchSuggestedSentences,
  playPatientUtteranceTts,
  sendPatientReply,
} from '../../../../services/recommendationService'
import {
  PatientIncomingChatContext,
  type PatientIncomingChatContextValue,
} from '../context/patientIncomingChatContext'
import { getActiveApiMode } from '../../../../config/env'
import { usePatientStomp } from '../hooks/usePatientStomp'
import { useCallStatusStore } from '../../../../stores/callStatusStore'
import { usePatientChatHistory } from '../hooks/usePatientChatHistory'
import {
  registerPatientChatDispatcher,
  type DispatchPatientChatInput,
  type DispatchPatientChatResult,
} from '../../../../services/patientChatDispatch'
import type { StompChatInbound } from '../../../../services/websocket'
import type {
  PatientChatManualInputMode,
  PatientChatMessage,
  PatientRecommendationCategory,
  PatientChatRouteContext,
  PatientChatSendOutcome,
  PatientChatSessionState,
  PatientSuggestedResponse,
} from '../../../../types/chat'
import type { RecommendationCategoryKey } from '../../../../types/recommendation'
import { createClientMessageId } from '../../../../utils/clientMessageId'

type PatientChatAction =
  | { type: 'SET_ROUTE_CONTEXT'; route: PatientChatRouteContext }
  | { type: 'SET_ACTIVE_MESSAGE'; messageId: string | null }
  | { type: 'MERGE_MESSAGES'; messages: PatientChatMessage[]; lastEventLabel?: string }
  | { type: 'START_RECEIVING' }
  | { type: 'RECORD_RECEIVED_MESSAGE'; message: PatientChatMessage; previousRoute: PatientChatRouteContext | null }
  | { type: 'MARK_MESSAGE_UNREAD'; messageId: string }
  | {
      type: 'OPEN_INTERRUPT'
      messageId: string
      pauseMedia: boolean
      focusMessageId: string
    }
  | { type: 'ENTER_REPLY_MODE'; messageId: string; pauseMedia: boolean }
  | { type: 'CATEGORY_LOADING'; messageId: string }
  | { type: 'CATEGORY_READY'; categories: PatientRecommendationCategory[] }
  | { type: 'SET_CATEGORY_PAGE'; page: number }
  | { type: 'SUGGESTION_LOADING'; messageId: string; categoryKey?: RecommendationCategoryKey | null }
  | { type: 'SUGGESTION_READY'; suggestions: PatientSuggestedResponse[] }
  | { type: 'SUGGESTION_FAILED'; error: string }
  | { type: 'OPEN_MANUAL_INPUT_SELECT' }
  | { type: 'SET_MANUAL_INPUT_MODE'; mode: PatientChatManualInputMode }
  | { type: 'SET_MANUAL_DRAFT'; draft: string }
  | { type: 'APPEND_MANUAL_WORD'; word: string }
  | { type: 'CLEAR_MANUAL_DRAFT' }
  | { type: 'START_SENDING'; selectedSuggestionId: string | null }
  | { type: 'SEND_SUCCEEDED'; replyMessage: PatientChatMessage }
  | { type: 'CLEAR_SENT_FEEDBACK' }
  | { type: 'SEND_FAILED'; error: string }
  | { type: 'SET_NEXT_SEND_OUTCOME'; outcome: PatientChatSendOutcome }
  | { type: 'CLEAR_NEXT_SEND_OUTCOME' }
  | { type: 'ARM_TIMEOUT'; messageId: string; timeoutAt: number }
  | { type: 'CLEAR_TIMEOUT' }
  | { type: 'TIMEOUT_EXPIRED'; messageId: string }
  | { type: 'REPLY_COMPLETION_TTS_FINISHED' }
  | { type: 'COMPLETE_REPLY_COMPLETION' }
  | { type: 'DEFER_ACTIVE_MESSAGE' }
  | { type: 'START_RESTORE' }
  | { type: 'FINISH_RESTORE' }
  | { type: 'RESET_AFTER_RESTORE' }
  | { type: 'DUPLICATE_RECEIVED'; messageId: string }

const initialState: PatientChatSessionState = {
  status: 'idle',
  interruptState: 'none',
  fallbackState: 'none',
  replyCompletionTtsPending: false,
  recommendationMode: 'category',
  categoryState: 'idle',
  suggestionState: 'idle',
  messages: [],
  categories: [],
  suggestions: [],
  currentRoute: null,
  previousRoute: null,
  activeMessageId: null,
  activeReplyMessageId: null,
  selectedCategoryKey: null,
  categoryPage: 0,
  manualInputMode: null,
  manualDraft: '',
  suggestionError: null,
  sendError: null,
  selectedSuggestionId: null,
  responseTimeoutMessageId: null,
  responseTimeoutAt: null,
  nextSendOutcome: 'auto',
  suggestionAttempts: {},
  isMediaPausedByInterrupt: false,
  lastEventLabel: '대화 대기',
  duplicateReceiveCount: 0,
}

const LOCAL_OUTGOING_MATCH_WINDOW_MS = 60_000
const OPTIMISTIC_ECHO_REPLY_TARGET_GRACE_MS = 600_000
function normalizeTimestampForCompare(value: string) {
  return value.includes('T') ? value : value.replace(' ', 'T')
}

function hasExplicitTimestampTimezone(value: string) {
  return /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value)
}

function getTimestampCandidates(
  value: string,
  options?: { includeUtcFallback?: boolean },
) {
  const normalizedValue = normalizeTimestampForCompare(value)
  const candidates = new Set<number>()
  const parsedTimestamp = Date.parse(normalizedValue)

  if (!Number.isNaN(parsedTimestamp)) {
    candidates.add(parsedTimestamp)
  }

  if (options?.includeUtcFallback && !hasExplicitTimestampTimezone(normalizedValue)) {
    const parsedUtcTimestamp = Date.parse(`${normalizedValue}Z`)

    if (!Number.isNaN(parsedUtcTimestamp)) {
      candidates.add(parsedUtcTimestamp)
    }
  }

  return [...candidates]
}

function getMessageTimestamp(message: PatientChatMessage) {
  const timestamp = getTimestampCandidates(message.createdAt)[0] ?? 0

  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getMessageContentType(message: PatientChatMessage) {
  return message.meta?.contentType ?? 'TEXT'
}

function getMessageClientMessageId(message: PatientChatMessage) {
  const clientMessageId = message.meta?.clientMessageId?.trim()
  return clientMessageId ? clientMessageId : null
}

function isTimestampWithinWindow(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
  windowMs: number,
  options?: { includeUtcFallback?: boolean },
) {
  const currentCandidates = getTimestampCandidates(currentMessage.createdAt, options)
  const nextCandidates = getTimestampCandidates(nextMessage.createdAt, options)

  if (currentCandidates.length === 0 || nextCandidates.length === 0) {
    return true
  }

  return currentCandidates.some(currentTimestamp =>
    nextCandidates.some(nextTimestamp => Math.abs(currentTimestamp - nextTimestamp) <= windowMs),
  )
}

function resolveGuardianStatus(
  previousStatus: PatientChatMessage['status'],
  nextStatus: PatientChatMessage['status'],
): PatientChatMessage['status'] {
  if (previousStatus === 'pending_reply' || nextStatus === 'pending_reply') {
    return 'pending_reply'
  }

  if (previousStatus === 'unread' || nextStatus === 'unread') {
    return 'unread'
  }

  if (previousStatus === 'received' || nextStatus === 'received') {
    return 'received'
  }

  return 'replied'
}

function mergeMessagePair(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
): PatientChatMessage {
  const resolvedType =
    currentMessage.sender === 'patient' && nextMessage.type === 'text'
      ? currentMessage.type
      : nextMessage.type

  return {
    ...currentMessage,
    ...nextMessage,
    type: resolvedType,
    status:
      currentMessage.sender === 'guardian'
        ? resolveGuardianStatus(currentMessage.status, nextMessage.status)
        : nextMessage.status,
    replyToId: nextMessage.replyToId ?? currentMessage.replyToId,
    meta: {
      ...currentMessage.meta,
      ...nextMessage.meta,
      isOptimistic:
        nextMessage.meta?.isOptimistic ??
        (nextMessage.id === currentMessage.id
          ? currentMessage.meta?.isOptimistic ?? false
          : false),
    },
  }
}

function getOptimisticPatientEchoPair(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  if (currentMessage.sender !== 'patient' || nextMessage.sender !== 'patient') {
    return null
  }

  const currentIsOptimistic = currentMessage.meta?.isOptimistic === true
  const nextIsOptimistic = nextMessage.meta?.isOptimistic === true

  if (currentIsOptimistic === nextIsOptimistic) {
    return null
  }

  return {
    optimistic: currentIsOptimistic ? currentMessage : nextMessage,
    confirmed: currentIsOptimistic ? nextMessage : currentMessage,
  }
}

function hasCompatibleEchoReplyTarget(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  const pair = getOptimisticPatientEchoPair(currentMessage, nextMessage)

  if (!pair) {
    return (currentMessage.replyToId ?? null) === (nextMessage.replyToId ?? null)
  }

  const optimisticReplyToId = pair.optimistic.replyToId ?? null
  const confirmedReplyToId = pair.confirmed.replyToId ?? null

  return optimisticReplyToId === confirmedReplyToId || confirmedReplyToId == null
}

function matchesOptimisticMessageByClientMessageId(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  const pair = getOptimisticPatientEchoPair(currentMessage, nextMessage)

  if (!pair) {
    return false
  }

  const optimisticClientMessageId = getMessageClientMessageId(pair.optimistic)
  const confirmedClientMessageId = getMessageClientMessageId(pair.confirmed)

  return (
    optimisticClientMessageId != null &&
    confirmedClientMessageId != null &&
    optimisticClientMessageId === confirmedClientMessageId
  )
}

function matchesOptimisticMessageByStructuredContent(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  const pair = getOptimisticPatientEchoPair(currentMessage, nextMessage)

  if (!pair || !hasCompatibleEchoReplyTarget(currentMessage, nextMessage)) {
    return false
  }

  if (getMessageContentType(pair.optimistic) !== getMessageContentType(pair.confirmed)) {
    return false
  }

  const matchesExpressionId =
    pair.optimistic.meta?.exprId != null &&
    pair.optimistic.meta.exprId === (pair.confirmed.meta?.exprId ?? null)
  const matchesPhraseId =
    pair.optimistic.meta?.phraseId != null &&
    pair.optimistic.meta.phraseId === (pair.confirmed.meta?.phraseId ?? null)

  if (!matchesExpressionId && !matchesPhraseId) {
    return false
  }

  return isTimestampWithinWindow(
    pair.optimistic,
    pair.confirmed,
    OPTIMISTIC_ECHO_REPLY_TARGET_GRACE_MS,
    { includeUtcFallback: true },
  )
}

function matchesOptimisticMessageByLegacyFallback(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  const pair = getOptimisticPatientEchoPair(currentMessage, nextMessage)

  if (!pair || !hasCompatibleEchoReplyTarget(currentMessage, nextMessage)) {
    return false
  }

  if (pair.optimistic.content !== pair.confirmed.content) {
    return false
  }

  const currentTimestamp = getMessageTimestamp(pair.optimistic)
  const nextTimestamp = getMessageTimestamp(pair.confirmed)

  if (currentTimestamp === 0 || nextTimestamp === 0) {
    return true
  }

  return isTimestampWithinWindow(
    pair.optimistic,
    pair.confirmed,
    LOCAL_OUTGOING_MATCH_WINDOW_MS,
    { includeUtcFallback: true },
  )
}

function getOptimisticPatientMatchStrategy(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  if (matchesOptimisticMessageByClientMessageId(currentMessage, nextMessage)) {
    return 'clientMessageId'
  }

  if (matchesOptimisticMessageByStructuredContent(currentMessage, nextMessage)) {
    return 'structuredContent'
  }

  if (matchesOptimisticMessageByLegacyFallback(currentMessage, nextMessage)) {
    return 'legacyFallback'
  }

  return null
}

function shouldReconcileOptimisticMessage(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  if (!currentMessage.meta?.isOptimistic || nextMessage.meta?.isOptimistic) {
    return false
  }

  return getOptimisticPatientMatchStrategy(currentMessage, nextMessage) !== null
}

function shouldIgnoreLateOptimisticMessage(
  currentMessage: PatientChatMessage,
  nextMessage: PatientChatMessage,
) {
  if (currentMessage.meta?.isOptimistic || !nextMessage.meta?.isOptimistic) {
    return false
  }

  return getOptimisticPatientMatchStrategy(currentMessage, nextMessage) !== null
}

function findLastMatchingMessageIndex(
  messages: PatientChatMessage[],
  nextMessage: PatientChatMessage,
  predicate: (currentMessage: PatientChatMessage, nextMessage: PatientChatMessage) => boolean,
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (predicate(messages[index], nextMessage)) {
      return index
    }
  }

  return -1
}

function sortPatientMessages(messages: PatientChatMessage[]) {
  return messages
    .map((message, index) => ({ message, index }))
    .sort((left, right) => {
      const timestampDiff =
        getMessageTimestamp(left.message) - getMessageTimestamp(right.message)

      if (timestampDiff !== 0) {
        return timestampDiff
      }

      return left.index - right.index
    })
    .map(entry => entry.message)
}

function mergePatientMessages(
  currentMessages: PatientChatMessage[],
  nextMessages: PatientChatMessage[],
) {
  const mergedMessages = [...currentMessages]

  nextMessages.forEach(nextMessage => {
    const existingIndex = mergedMessages.findIndex(message => message.id === nextMessage.id)

    if (existingIndex >= 0) {
      mergedMessages[existingIndex] = mergeMessagePair(
        mergedMessages[existingIndex],
        nextMessage,
      )
      return
    }

    const optimisticIndex = findLastMatchingMessageIndex(
      mergedMessages,
      nextMessage,
      shouldReconcileOptimisticMessage,
    )

    if (optimisticIndex >= 0) {
      mergedMessages[optimisticIndex] = mergeMessagePair(
        mergedMessages[optimisticIndex],
        nextMessage,
      )
      return
    }

    const staleOptimisticIndex = findLastMatchingMessageIndex(
      mergedMessages,
      nextMessage,
      shouldIgnoreLateOptimisticMessage,
    )

    if (staleOptimisticIndex >= 0) {
      return
    }

    mergedMessages.push(nextMessage)
  })

  const repliedGuardianIds = new Set(
    mergedMessages
      .filter(message => message.sender === 'patient' && message.replyToId)
      .map(message => message.replyToId as string),
  )

  const replyAwareMessages = mergedMessages.map(message =>
    message.sender === 'guardian' && repliedGuardianIds.has(message.id)
      ? { ...message, status: 'replied' as const }
      : message,
  )

  return sortPatientMessages(replyAwareMessages)
}

function patientChatReducer(
  state: PatientChatSessionState,
  action: PatientChatAction,
): PatientChatSessionState {
  switch (action.type) {
    case 'SET_ROUTE_CONTEXT':
      return {
        ...state,
        currentRoute: action.route,
        status:
          state.status === 'idle'
            ? 'waiting_message'
            : state.status === 'restored' && state.messages.length === 0
              ? 'waiting_message'
              : state.status,
      }

    case 'SET_ACTIVE_MESSAGE':
      return {
        ...state,
        activeMessageId: action.messageId,
        activeReplyMessageId: null,
        interruptState:
          state.currentRoute?.responseSurface === 'inline' ? 'none' : state.interruptState,
      }

    case 'MERGE_MESSAGES':
      return {
        ...state,
        messages: mergePatientMessages(state.messages, action.messages),
        lastEventLabel: action.lastEventLabel ?? state.lastEventLabel,
      }

    case 'START_RECEIVING':
      return {
        ...state,
        status: 'receiving',
        lastEventLabel: '보호자 메시지 수신 중',
      }

    case 'RECORD_RECEIVED_MESSAGE':
      return {
        ...state,
        status: 'received',
        messages: mergePatientMessages(state.messages, [action.message]),
        previousRoute: action.previousRoute,
        activeMessageId:
          action.message.sender === 'guardian' ? action.message.id : state.activeMessageId,
        lastEventLabel: '보호자 선발화를 수신했습니다.',
      }

    case 'MARK_MESSAGE_UNREAD':
      return {
        ...state,
        status: 'unread',
        messages: state.messages.map(message =>
          message.id === action.messageId && message.sender === 'guardian'
            ? { ...message, status: 'unread' }
            : message,
        ),
        lastEventLabel: '미응답 메시지가 있습니다.',
      }

    case 'OPEN_INTERRUPT':
      return {
        ...state,
        status: 'incoming_interrupt',
        interruptState: 'incoming_interrupt',
        activeMessageId: action.focusMessageId,
        isMediaPausedByInterrupt: action.pauseMedia,
        lastEventLabel: action.pauseMedia
          ? '인터럽트로 재생을 멈추고 응답 안내를 표시했습니다.'
          : '응답 안내 인터럽트를 표시했습니다.',
      }

    case 'ENTER_REPLY_MODE':
      return {
        ...state,
        status: 'reply_mode',
        interruptState: 'reply_mode',
        fallbackState: 'none',
        recommendationMode: 'category',
        categoryState: 'idle',
        suggestionState: 'idle',
        activeMessageId: action.messageId,
        activeReplyMessageId: action.messageId,
        categories: [],
        suggestions: [],
        selectedCategoryKey: null,
        categoryPage: 0,
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        manualInputMode: null,
        manualDraft: '',
        isMediaPausedByInterrupt: action.pauseMedia,
        messages: state.messages.map(message =>
          message.id === action.messageId && message.sender === 'guardian'
            ? { ...message, status: 'pending_reply' }
            : message,
        ),
        lastEventLabel: '응답 모드로 전환했습니다.',
      }

    case 'CATEGORY_LOADING':
      return {
        ...state,
        status: 'category_loading',
        recommendationMode: 'category',
        categoryState: 'loading',
        suggestionState: 'idle',
        categories: [],
        suggestions: [],
        selectedCategoryKey: null,
        categoryPage: 0,
        suggestionError: null,
        sendError: null,
        fallbackState: 'none',
        lastEventLabel: '카테고리를 불러오고 있습니다.',
      }

    case 'CATEGORY_READY':
      return {
        ...state,
        status: 'category_ready',
        recommendationMode: 'category',
        categoryState: 'ready',
        suggestionState: 'idle',
        categories: action.categories,
        suggestions: [],
        selectedCategoryKey: null,
        categoryPage: 0,
        suggestionError: null,
        sendError: null,
        fallbackState: 'none',
        lastEventLabel: '추천 카테고리를 준비했습니다.',
      }

    case 'SET_CATEGORY_PAGE':
      return {
        ...state,
        categoryPage: Math.max(0, action.page),
      }

    case 'SUGGESTION_LOADING':
      return {
        ...state,
        status: 'suggestion_loading',
        recommendationMode: 'sentence',
        suggestionState: 'loading',
        suggestions: [],
        selectedCategoryKey: action.categoryKey ?? null,
        suggestionError: null,
        fallbackState: 'none',
        suggestionAttempts: {
          ...state.suggestionAttempts,
          [action.messageId]: (state.suggestionAttempts[action.messageId] ?? 0) + 1,
        },
        lastEventLabel: '추천 응답을 준비 중입니다.',
      }

    case 'SUGGESTION_READY':
      return {
        ...state,
        status: 'suggestion_ready',
        recommendationMode: 'sentence',
        suggestionState: 'ready',
        suggestions: action.suggestions,
        suggestionError: null,
        fallbackState: 'none',
        lastEventLabel: '추천 응답을 준비했습니다.',
      }

    case 'SUGGESTION_FAILED':
      return {
        ...state,
        status: 'suggestion_failed',
        recommendationMode: 'sentence',
        suggestionState: 'failed',
        suggestions: [],
        suggestionError: action.error,
        fallbackState: 'suggestion_failed',
        lastEventLabel: '추천 응답을 만들지 못했습니다.',
      }

    case 'OPEN_MANUAL_INPUT_SELECT':
      return {
        ...state,
        status: 'manual_input_select',
        fallbackState: 'manual_input_select',
        manualInputMode: null,
        manualDraft: '',
        lastEventLabel: '대체 입력 방식을 선택할 수 있습니다.',
      }

    case 'SET_MANUAL_INPUT_MODE':
      return {
        ...state,
        status: 'manual_input_typing',
        fallbackState: 'manual_input_typing',
        manualInputMode: action.mode,
        sendError: null,
        lastEventLabel:
          action.mode === 'keyboard'
            ? '직접 입력으로 응답을 작성 중입니다.'
            : '단어 조합으로 응답을 작성 중입니다.',
      }

    case 'SET_MANUAL_DRAFT':
      return {
        ...state,
        manualDraft: action.draft,
      }

    case 'APPEND_MANUAL_WORD':
      return {
        ...state,
        manualDraft: state.manualDraft.trim()
          ? `${state.manualDraft.trim()} ${action.word}`
          : action.word,
      }

    case 'CLEAR_MANUAL_DRAFT':
      return {
        ...state,
        manualDraft: '',
      }

    case 'START_SENDING':
      return {
        ...state,
        status: 'sending',
        sendError: null,
        selectedSuggestionId: action.selectedSuggestionId,
        replyCompletionTtsPending: false,
        lastEventLabel: '응답을 전송 중입니다.',
      }

    case 'SEND_SUCCEEDED': {
      const nextMessages = state.messages.map(message =>
        message.id === action.replyMessage.replyToId && message.sender === 'guardian'
          ? { ...message, status: 'replied' as const }
          : message,
      )
      const mergedMessages = mergePatientMessages(nextMessages, [action.replyMessage])
      const nextActiveMessage = getLatestUnresolvedGuardianMessage(mergedMessages)
      const shouldKeepLeisureFollowup =
        isLeisureRouteContext(state.currentRoute) && state.isMediaPausedByInterrupt

      if (shouldKeepLeisureFollowup) {
        return {
          ...state,
          status: 'sending',
          interruptState: 'reply_mode',
          messages: mergedMessages,
          activeMessageId: nextActiveMessage?.id ?? state.activeMessageId,
          activeReplyMessageId: action.replyMessage.replyToId ?? state.activeReplyMessageId,
          sendError: null,
          suggestionError: null,
          replyCompletionTtsPending: true,
          isMediaPausedByInterrupt: true,
          lastEventLabel: 'Reply sent. Playing TTS before return overlay.',
        }
      }

      return {
        ...state,
        status: 'sent',
        interruptState: 'none',
        recommendationMode: 'category',
        categoryState: 'idle',
        messages: mergedMessages,
        activeMessageId: nextActiveMessage?.id ?? null,
        activeReplyMessageId: null,
        categories: [],
        sendError: null,
        suggestionError: null,
        selectedSuggestionId: null,
        suggestionState: 'idle',
        suggestions: [],
        selectedCategoryKey: null,
        categoryPage: 0,
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        replyCompletionTtsPending: false,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '응답을 전송했습니다.',
      }
    }

    case 'CLEAR_SENT_FEEDBACK':
      return {
        ...state,
        status: 'conversation_active',
        replyCompletionTtsPending: false,
        lastEventLabel: '대화 세션이 유지되고 있습니다.',
      }

    case 'SEND_FAILED':
      return {
        ...state,
        status: 'send_failed',
        fallbackState: 'send_failed',
        sendError: action.error,
        replyCompletionTtsPending: false,
        lastEventLabel: '응답 전송에 실패했습니다.',
      }

    case 'SET_NEXT_SEND_OUTCOME':
      return {
        ...state,
        nextSendOutcome: action.outcome,
      }

    case 'CLEAR_NEXT_SEND_OUTCOME':
      return {
        ...state,
        nextSendOutcome: 'auto',
      }

    case 'ARM_TIMEOUT':
      return {
        ...state,
        responseTimeoutMessageId: action.messageId,
        responseTimeoutAt: action.timeoutAt,
      }

    case 'CLEAR_TIMEOUT':
      return {
        ...state,
        responseTimeoutMessageId: null,
        responseTimeoutAt: null,
      }

    case 'TIMEOUT_EXPIRED':
      return {
        ...state,
        status: 'timeout',
        interruptState: 'restoring',
        recommendationMode: 'category',
        categoryState: 'idle',
        activeReplyMessageId: null,
        activeMessageId: action.messageId,
        categories: [],
        suggestions: [],
        suggestionState: 'idle',
        selectedCategoryKey: null,
        categoryPage: 0,
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        replyCompletionTtsPending: false,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '응답 시간이 지나 이전 화면으로 복귀합니다.',
      }

    case 'REPLY_COMPLETION_TTS_FINISHED':
      {
        const nextActiveMessage = getLatestUnresolvedGuardianMessage(state.messages)

      return {
        ...state,
        status: 'reply_completion_pending',
        interruptState: 'completion_pending',
        recommendationMode: 'category',
        categoryState: 'idle',
        activeMessageId: nextActiveMessage?.id ?? null,
        activeReplyMessageId: null,
        categories: [],
        suggestions: [],
        suggestionState: 'idle',
        selectedCategoryKey: null,
        categoryPage: 0,
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        replyCompletionTtsPending: false,
        lastEventLabel: 'TTS playback finished. Waiting for return choice.',
      }
      }

    case 'COMPLETE_REPLY_COMPLETION':
      return {
        ...state,
        status: state.messages.length > 0 ? 'conversation_active' : 'waiting_message',
        interruptState: 'none',
        replyCompletionTtsPending: false,
        isMediaPausedByInterrupt: false,
        lastEventLabel: 'Reply completion flow cleared.',
      }

    case 'DEFER_ACTIVE_MESSAGE':
      return {
        ...state,
        status: 'deferred',
        interruptState: 'deferred',
        recommendationMode: 'category',
        categoryState: 'idle',
        activeReplyMessageId: null,
        categories: [],
        suggestions: [],
        suggestionState: 'idle',
        selectedCategoryKey: null,
        categoryPage: 0,
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        replyCompletionTtsPending: false,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '메시지를 나중에 보기로 남겨두었습니다.',
      }

    case 'START_RESTORE':
      return {
        ...state,
        status: 'restoring',
        interruptState: 'restoring',
        recommendationMode: 'category',
        categoryState: 'idle',
        activeReplyMessageId: null,
        categories: [],
        suggestions: [],
        suggestionState: 'idle',
        selectedCategoryKey: null,
        categoryPage: 0,
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        replyCompletionTtsPending: false,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '이전 화면으로 복귀 중입니다.',
      }

    case 'FINISH_RESTORE':
      return {
        ...state,
        status: 'restored',
        interruptState: 'restored',
        replyCompletionTtsPending: false,
        lastEventLabel: '이전 화면으로 복귀했습니다.',
      }

    case 'RESET_AFTER_RESTORE':
      return {
        ...state,
        status: state.messages.length > 0 ? 'conversation_active' : 'waiting_message',
        interruptState: 'none',
        replyCompletionTtsPending: false,
        lastEventLabel:
          state.messages.length > 0 ? '대화 세션이 유지되고 있습니다.' : '메시지를 기다리고 있습니다.',
      }

    case 'DUPLICATE_RECEIVED':
      return {
        ...state,
        lastEventLabel: `중복 메시지 ${action.messageId} 를 무시했습니다.`,
        duplicateReceiveCount: state.duplicateReceiveCount + 1,
      }

    default:
      return state
  }
}

function getRouteContext(pathname: string): PatientChatRouteContext {
  if (pathname.endsWith('/talk')) {
    return {
      pathname,
      label: '대화하기',
      kind: 'talk',
      responseSurface: 'inline',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: false,
    }
  }

  if (pathname.includes('/leisure/player/')) {
    return {
      pathname,
      label: '여가 재생',
      kind: 'leisure_player',
      responseSurface: 'overlay',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: true,
    }
  }

  if (pathname.includes('/leisure')) {
    return {
      pathname,
      label: '여가',
      kind: 'leisure',
      responseSurface: 'overlay',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: true,
    }
  }

  if (pathname.includes('/body-mind')) {
    return {
      pathname,
      label: '몸과 마음',
      kind: 'body_mind',
      responseSurface: 'overlay',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: false,
    }
  }

  if (pathname.endsWith('/favorites')) {
    return {
      pathname,
      label: '즐겨찾기',
      kind: 'favorites',
      responseSurface: 'overlay',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: false,
    }
  }

  if (pathname.includes('/talk/custom') || pathname.endsWith('/custom-talk')) {
    return {
      pathname,
      label: '맞춤 대화',
      kind: 'custom_talk',
      responseSurface: 'overlay',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: false,
    }
  }

  if (pathname.endsWith('/main')) {
    return {
      pathname,
      label: '환자 메인',
      kind: 'main',
      responseSurface: 'overlay',
      canEnterReplyMode: true,
      shouldPauseMediaOnInterrupt: false,
    }
  }

  return {
    pathname,
    label: '환자 화면',
    kind: 'unknown',
    responseSurface: 'overlay',
    canEnterReplyMode: true,
    shouldPauseMediaOnInterrupt: false,
  }
}

function getLatestUnresolvedGuardianMessage(messages: PatientChatMessage[]) {
  return [...messages]
    .reverse()
    .find(message => message.sender === 'guardian' && message.status !== 'replied') ?? null
}

function getMessageById(messages: PatientChatMessage[], messageId: string | null) {
  if (!messageId) {
    return null
  }

  return messages.find(message => message.id === messageId) ?? null
}

function getPreferredReplyTargetId(state: PatientChatSessionState) {
  const activeReplyMessage = getMessageById(state.messages, state.activeReplyMessageId)

  if (activeReplyMessage?.sender === 'guardian' && activeReplyMessage.status !== 'replied') {
    return activeReplyMessage.id
  }

  const activeMessage = getMessageById(state.messages, state.activeMessageId)

  if (activeMessage?.sender === 'guardian' && activeMessage.status !== 'replied') {
    return activeMessage.id
  }

  return getLatestUnresolvedGuardianMessage(state.messages)?.id ?? null
}

function isLeisureRouteContext(route: PatientChatRouteContext | null) {
  return route?.kind === 'leisure' || route?.kind === 'leisure_player'
}

function toPatientChatMessage(payload: StompChatInbound): PatientChatMessage {
  const isFromGuardian = payload.senderRole === 'GUARDIAN'

  return {
    id: String(payload.messageId),
    sender: isFromGuardian ? 'guardian' : 'patient',
    type: 'text',
    content: payload.text,
    createdAt: payload.createdAt,
    status: 'received',
    meta: {
      contentType: payload.contentType,
      clientMessageId: payload.clientMessageId ?? null,
      phraseId: payload.phraseId,
      exprId: payload.exprId,
      historySource: 'stomp',
    },
  }
}

function createOutgoingPatientMessage(
  input: DispatchPatientChatInput,
  sequence: number,
): PatientChatMessage {
  return {
    id: `local-patient-${Date.now()}-${sequence}`,
    sender: 'patient',
    type: input.type ?? 'text',
    content: input.text.trim(),
    createdAt: new Date().toISOString(),
    status: 'replied',
    replyToId: input.replyToId,
    meta: {
      contentType: input.contentType ?? 'TEXT',
      clientMessageId: input.clientMessageId ?? null,
      phraseId: input.phraseId ?? null,
      exprId: input.exprId ?? null,
      isOptimistic: true,
      historySource: 'local',
    },
  }
}

export function PatientIncomingChatProvider({
  pathname,
  children,
}: PropsWithChildren<{ pathname: string }>) {
  const [state, dispatch] = useReducer(patientChatReducer, initialState)
  const { messages: historyMessages, loadAll: loadAllHistory } = usePatientChatHistory()
  const stateRef = useRef(state)
  const knownMessageIdsRef = useRef<Set<string>>(new Set())
  const outgoingSequenceRef = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    dispatch({ type: 'SET_ROUTE_CONTEXT', route: getRouteContext(pathname) })
  }, [pathname])

  useEffect(() => {
    void loadAllHistory()
  }, [loadAllHistory])

  useEffect(() => {
    if (historyMessages.length === 0) {
      return
    }

    historyMessages.forEach(message => {
      if (!message.id.startsWith('local-')) {
        knownMessageIdsRef.current.add(message.id)
      }
    })

    dispatch({
      type: 'MERGE_MESSAGES',
      messages: historyMessages,
    })
  }, [historyMessages])

  // ----- STOMP WebSocket 연결 -----

  const handleStompChat = useCallback(
    (payload: StompChatInbound) => {
      const messageId = String(payload.messageId)

      // 중복 메시지 방지
      if (knownMessageIdsRef.current.has(messageId)) {
        dispatch({ type: 'DUPLICATE_RECEIVED', messageId })
        return
      }

      // 환자 자신이 보낸 메시지가 에코로 돌아온 경우 인터럽트 불필요
      const isFromGuardian = payload.senderRole === 'GUARDIAN'

      // StompChatInbound → PatientChatMessage 변환
      const incomingMessage = toPatientChatMessage(payload)

      knownMessageIdsRef.current.add(messageId)

      if (!isFromGuardian) {
        dispatch({
          type: 'MERGE_MESSAGES',
          messages: [incomingMessage],
        })
        return
      }

      const currentState = stateRef.current

      dispatch({ type: 'START_RECEIVING' })
      dispatch({
        type: 'RECORD_RECEIVED_MESSAGE',
        message: incomingMessage,
        previousRoute: currentState.currentRoute,
      })

      // 환자 자신의 메시지는 기록만 하고 인터럽트 하지 않음
      dispatch({ type: 'MARK_MESSAGE_UNREAD', messageId })

      const route = currentState.currentRoute ?? getRouteContext(pathname)
      const alreadyHandling =
        currentState.interruptState === 'incoming_interrupt' ||
        currentState.interruptState === 'reply_mode' ||
        currentState.interruptState === 'completion_pending'

      if (route.responseSurface === 'inline') {
        if (!alreadyHandling) {
          void enterReplyModeInternal(messageId, incomingMessage, {
            pauseMedia: route.shouldPauseMediaOnInterrupt,
          })
        }
        return
      }

      if (!alreadyHandling) {
        dispatch({
          type: 'OPEN_INTERRUPT',
          messageId,
          pauseMedia: route.shouldPauseMediaOnInterrupt,
          focusMessageId: messageId,
        })
      }
    },
    [pathname],
  )

  const { connected, sendChat } = usePatientStomp({
    onChatMessage: handleStompChat,
    onCallConfirmed: () => {
      useCallStatusStore
        .getState()
        .setConfirmed()
    },
  })

  const dispatchOutgoingPatientChat = useCallback(
    async (input: DispatchPatientChatInput): Promise<DispatchPatientChatResult> => {
      const text = input.text.trim()

      if (!text) {
        return {
          success: false,
          error: '메시지 내용이 비어 있습니다.',
        }
      }

      const currentState = stateRef.current
      const resolvedReplyToId = input.replyToId ?? getPreferredReplyTargetId(currentState)
      const clientMessageId = input.clientMessageId ?? createClientMessageId()

      const outgoingMessage = createOutgoingPatientMessage(
        {
          ...input,
          clientMessageId,
          text,
          replyToId: resolvedReplyToId ?? undefined,
        },
        ++outgoingSequenceRef.current,
      )

      if (getActiveApiMode() === 'real') {
        if (!connected) {
          return {
            success: false,
            error: '실시간 채팅 연결이 아직 준비되지 않았습니다.',
          }
        }

        try {
          sendChat({
            text,
            contentType: input.contentType ?? 'TEXT',
            clientMessageId,
            phraseId: input.phraseId,
            exprId: input.exprId,
          })
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : '실시간 채팅 전송에 실패했습니다.',
          }
        }
      }

      dispatch({
        type: 'MERGE_MESSAGES',
        messages: [outgoingMessage],
      })

      if (resolvedReplyToId) {
        dispatch({ type: 'SET_ACTIVE_MESSAGE', messageId: resolvedReplyToId })
      }

      return {
        success: true,
        message: outgoingMessage,
      }
    },
    [connected, sendChat],
  )

  useEffect(() => registerPatientChatDispatcher(dispatchOutgoingPatientChat), [
    dispatchOutgoingPatientChat,
  ])

  // ----- 타이머 관련 effects -----

  useEffect(() => {
    if (!state.responseTimeoutAt || !state.responseTimeoutMessageId) {
      return
    }

    const timeoutAt = state.responseTimeoutAt
    const timeoutMessageId = state.responseTimeoutMessageId
    const remainingMs = timeoutAt - Date.now()

    if (remainingMs <= 0) {
      dispatch({
        type: 'TIMEOUT_EXPIRED',
        messageId: timeoutMessageId,
      })
      return
    }

    const timerId = window.setTimeout(() => {
      dispatch({
        type: 'TIMEOUT_EXPIRED',
        messageId: timeoutMessageId,
      })
    }, remainingMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [state.responseTimeoutAt, state.responseTimeoutMessageId])

  useEffect(() => {
    if (state.status !== 'timeout' && state.status !== 'restoring') {
      return
    }

    const timerId = window.setTimeout(() => {
      dispatch({ type: 'FINISH_RESTORE' })
    }, 260)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'restored') {
      return
    }

    const timerId = window.setTimeout(() => {
      dispatch({ type: 'RESET_AFTER_RESTORE' })
    }, 260)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'sent') {
      return
    }

    const timerId = window.setTimeout(() => {
      dispatch({ type: 'CLEAR_SENT_FEEDBACK' })
    }, 1500)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [state.status])

  const activeMessage = getMessageById(state.messages, state.activeMessageId)
  const activeReplyMessage = getMessageById(state.messages, state.activeReplyMessageId)
  const latestUnresolvedMessage = getLatestUnresolvedGuardianMessage(state.messages)
  const unreadCount = state.messages.filter(
    message => message.sender === 'guardian' && message.status === 'unread',
  ).length
  const unresolvedCount = state.messages.filter(
    message => message.sender === 'guardian' && message.status !== 'replied',
  ).length
  const isTalkRoute = state.currentRoute?.kind === 'talk'
  const shouldShowInterruptOverlay =
    Boolean(activeMessage) &&
    state.currentRoute?.responseSurface === 'overlay' &&
    state.interruptState === 'incoming_interrupt'
  const shouldShowReplyOverlay =
    Boolean(activeReplyMessage) &&
    state.currentRoute?.responseSurface === 'overlay' &&
    state.interruptState === 'reply_mode'
  const manualWordBank = buildManualWordBank(activeReplyMessage, state.messages)

  function setRoutePathname(nextPathname: string) {
    dispatch({ type: 'SET_ROUTE_CONTEXT', route: getRouteContext(nextPathname) })
  }

  function clearTimeoutState() {
    dispatch({ type: 'CLEAR_TIMEOUT' })
  }

  function triggerIncomingPreset(
    presetKey: (typeof PATIENT_CHAT_MESSAGE_PRESETS)[number]['key'],
    options?: { messageId?: string },
  ) {
    const incomingMessage = createMockIncomingPatientChatMessage(presetKey, {
      messageId: options?.messageId,
    })
    const currentState = stateRef.current

    if (knownMessageIdsRef.current.has(incomingMessage.id)) {
      dispatch({ type: 'DUPLICATE_RECEIVED', messageId: incomingMessage.id })
      return
    }

    knownMessageIdsRef.current.add(incomingMessage.id)
    dispatch({ type: 'START_RECEIVING' })
    dispatch({
      type: 'RECORD_RECEIVED_MESSAGE',
      message: incomingMessage,
      previousRoute: currentState.currentRoute,
    })
    dispatch({ type: 'MARK_MESSAGE_UNREAD', messageId: incomingMessage.id })

    const route = currentState.currentRoute ?? getRouteContext(pathname)
    const alreadyHandlingConversation =
      currentState.interruptState === 'incoming_interrupt' ||
      currentState.interruptState === 'reply_mode' ||
      currentState.interruptState === 'completion_pending'

    if (route.responseSurface === 'inline') {
      if (!alreadyHandlingConversation) {
        void enterReplyModeInternal(incomingMessage.id, incomingMessage, {
          pauseMedia: route.shouldPauseMediaOnInterrupt,
        })
      }
      return
    }

    if (!alreadyHandlingConversation) {
      dispatch({
        type: 'OPEN_INTERRUPT',
        messageId: incomingMessage.id,
        pauseMedia: route.shouldPauseMediaOnInterrupt,
        focusMessageId: incomingMessage.id,
      })
    }
  }

  function triggerDuplicateMessage() {
    const duplicateId = 'guardian-duplicate-water'

    triggerIncomingPreset('water', { messageId: duplicateId })
    triggerIncomingPreset('water', { messageId: duplicateId })
  }

  async function loadSuggestionChoices(
    messageId: string,
    message: PatientChatMessage,
    options?: { categoryKey?: RecommendationCategoryKey | null },
  ) {
    const currentAttempts = stateRef.current.suggestionAttempts[messageId] ?? 0

    if (currentAttempts >= MAX_SUGGESTION_RETRIES) {
      dispatch({
        type: 'SUGGESTION_FAILED',
        error: '추천 재시도 횟수를 초과했습니다. 직접 입력으로 전환해 주세요.',
      })
      return
    }

    dispatch({
      type: 'SUGGESTION_LOADING',
      messageId,
      categoryKey: options?.categoryKey ?? null,
    })

    try {
      let suggestions: PatientSuggestedResponse[] = []

      if (options?.categoryKey) {
        try {
          suggestions = await fetchSuggestedSentences({
            categoryKey: options.categoryKey,
            message,
            history: stateRef.current.messages,
          })
        } catch (error) {
          console.warn('Category sentence suggestion failed, falling back to replies.', error)
        }

        if (suggestions.length === 0) {
          suggestions = await fetchSuggestedReplies({
            message,
            history: stateRef.current.messages,
          })
        }
      } else {
        suggestions = await fetchSuggestedReplies({
          message,
          history: stateRef.current.messages,
        })
      }

      if (suggestions.length === 0) {
        dispatch({
          type: 'SUGGESTION_FAILED',
          error: '추천 결과가 비어 있습니다. 직접 입력으로 답변해 주세요.',
        })
        return
      }

      dispatch({ type: 'SUGGESTION_READY', suggestions })
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : '추천 응답을 불러오지 못했습니다. 다시 시도해 주세요.'

      dispatch({
        type: 'SUGGESTION_FAILED',
        error: messageText,
      })
    }
  }

  async function loadRecommendationCategories(
    messageId: string,
    message: PatientChatMessage,
  ) {
    dispatch({ type: 'CATEGORY_LOADING', messageId })

    try {
      const categories = await fetchSuggestedReplyCategories({
        message,
        history: stateRef.current.messages,
      })

      if (categories.length === 0) {
        await loadSuggestionChoices(messageId, message)
        return
      }

      dispatch({ type: 'CATEGORY_READY', categories })
    } catch (error) {
      console.warn('Recommendation categories failed, falling back to replies.', error)
      await loadSuggestionChoices(messageId, message)
    }
  }

  async function enterReplyModeInternal(
    messageId: string,
    knownMessage?: PatientChatMessage,
    options?: { pauseMedia?: boolean },
  ) {
    const currentState = stateRef.current
    const message = knownMessage ?? getMessageById(currentState.messages, messageId)

    if (!message) {
      return
    }

    clearTimeoutState()
    dispatch({
      type: 'ENTER_REPLY_MODE',
      messageId,
      pauseMedia: options?.pauseMedia ?? currentState.isMediaPausedByInterrupt,
    })

    await loadRecommendationCategories(messageId, message)
    return
    /*

    const nextState = stateRef.current
    const attempts = nextState.suggestionAttempts[messageId] ?? 0

    if (attempts >= MAX_SUGGESTION_RETRIES) {
      dispatch({
        type: 'SUGGESTION_FAILED',
        error: '추천 재시도 한도를 초과했습니다. 직접 입력을 사용해 주세요.',
      })
      return
    }

    dispatch({ type: 'SUGGESTION_LOADING', messageId })

    try {
      const suggestions = await fetchSuggestedReplies({
        message,
        history: stateRef.current.messages,
      })

      if (suggestions.length === 0) {
        dispatch({
          type: 'SUGGESTION_FAILED',
          error: '추천 결과가 비어 있습니다. 직접 입력으로 응답해 주세요.',
        })
        return
      }

      dispatch({ type: 'SUGGESTION_READY', suggestions })
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : '추천 응답 생성에 실패했습니다. 직접 입력으로 전환해 주세요.'

      dispatch({
        type: 'SUGGESTION_FAILED',
        error: messageText,
      })
    }
  }

    */
  }

  function enterReplyMode(messageId?: string) {
    const targetMessageId =
      messageId ??
      stateRef.current.activeMessageId ??
      getLatestUnresolvedGuardianMessage(stateRef.current.messages)?.id

    if (!targetMessageId) {
      return
    }

    void enterReplyModeInternal(targetMessageId)
  }

  function focusLatestPendingMessage() {
    const targetMessageId =
      getPreferredReplyTargetId(stateRef.current) ??
      getLatestUnresolvedGuardianMessage(stateRef.current.messages)?.id

    if (!targetMessageId) {
      return
    }

    clearTimeoutState()
    dispatch({ type: 'SET_ACTIVE_MESSAGE', messageId: targetMessageId })
  }

  function openLatestPendingReply() {
    const latestMessage = getLatestUnresolvedGuardianMessage(stateRef.current.messages)

    if (!latestMessage) {
      return
    }

    void enterReplyModeInternal(latestMessage.id, latestMessage)
  }

  function retrySuggestions() {
    const targetMessageId =
      stateRef.current.activeReplyMessageId ?? stateRef.current.activeMessageId

    if (!targetMessageId) {
      return
    }

    const message = getMessageById(stateRef.current.messages, targetMessageId)

    if (!message) {
      return
    }

    if (stateRef.current.recommendationMode === 'category') {
      void loadRecommendationCategories(targetMessageId, message)
      return
    }

    void loadSuggestionChoices(targetMessageId, message, {
      categoryKey: stateRef.current.selectedCategoryKey,
    })
  }

  async function selectRecommendationCategory(categoryKey: RecommendationCategoryKey) {
    const targetMessageId =
      stateRef.current.activeReplyMessageId ?? stateRef.current.activeMessageId

    if (!targetMessageId) {
      return
    }

    const message = getMessageById(stateRef.current.messages, targetMessageId)

    if (!message) {
      return
    }

    clearTimeoutState()
    await loadSuggestionChoices(targetMessageId, message, { categoryKey })
  }

  function setRecommendationCategoryPage(page: number) {
    dispatch({ type: 'SET_CATEGORY_PAGE', page })
  }

  function openManualInputSelect() {
    clearTimeoutState()
    dispatch({ type: 'OPEN_MANUAL_INPUT_SELECT' })
  }

  function setManualInputMode(mode: PatientChatManualInputMode) {
    clearTimeoutState()
    dispatch({ type: 'SET_MANUAL_INPUT_MODE', mode })
  }

  function updateManualDraft(draft: string) {
    clearTimeoutState()
    dispatch({ type: 'SET_MANUAL_DRAFT', draft })
  }

  function appendManualWord(word: string) {
    clearTimeoutState()
    dispatch({ type: 'APPEND_MANUAL_WORD', word })
  }

  function clearManualDraft() {
    dispatch({ type: 'CLEAR_MANUAL_DRAFT' })
  }

  async function playReplyCompletionTts(options: {
    text: string
    holdLeisureReturnOverlay: boolean
    failureLogLabel: string
  }) {
    try {
      const playback = await playPatientUtteranceTts({
        text: options.text,
      })

      if (!options.holdLeisureReturnOverlay || !playback) {
        return
      }

      await playback.completed
    } catch (error) {
      console.warn(options.failureLogLabel, error)
    } finally {
      if (options.holdLeisureReturnOverlay) {
        dispatch({ type: 'REPLY_COMPLETION_TTS_FINISHED' })
      }
    }
  }

  async function sendSuggestedReply(suggestion: PatientSuggestedResponse) {
    const currentState = stateRef.current
    const replyToId = currentState.activeReplyMessageId
    const holdLeisureReturnOverlay =
      isLeisureRouteContext(currentState.currentRoute) && currentState.isMediaPausedByInterrupt

    if (!replyToId || currentState.status === 'sending') {
      return
    }

    clearTimeoutState()
    dispatch({
      type: 'START_SENDING',
      selectedSuggestionId: suggestion.id,
    })

    const result = await sendPatientReply({
      content: suggestion.label,
      replyToId,
      type: 'suggested_reply',
      outcome: currentState.nextSendOutcome,
    })

    dispatch({ type: 'CLEAR_NEXT_SEND_OUTCOME' })

    if (!result.success || !result.message) {
      dispatch({
        type: 'SEND_FAILED',
        error: result.error ?? '응답을 전송하지 못했습니다.',
      })
      return
    }

    dispatch({
      type: 'SEND_SUCCEEDED',
      replyMessage: result.message,
    })

    await playReplyCompletionTts({
      text: suggestion.label,
      holdLeisureReturnOverlay,
      failureLogLabel: 'Suggested reply TTS playback failed.',
    })
  }

  async function sendManualReply() {
    const currentState = stateRef.current
    const replyToId = currentState.activeReplyMessageId
    const draft = currentState.manualDraft.trim()
    const holdLeisureReturnOverlay =
      isLeisureRouteContext(currentState.currentRoute) && currentState.isMediaPausedByInterrupt

    if (!replyToId || !draft || currentState.status === 'sending') {
      return
    }

    clearTimeoutState()
    dispatch({
      type: 'START_SENDING',
      selectedSuggestionId: null,
    })

    const result = await sendPatientReply({
      content: draft,
      replyToId,
      type:
        currentState.manualInputMode === 'keyboard'
          ? 'manual_text'
          : 'word_combination',
      outcome: currentState.nextSendOutcome,
    })

    dispatch({ type: 'CLEAR_NEXT_SEND_OUTCOME' })

    if (!result.success || !result.message) {
      dispatch({
        type: 'SEND_FAILED',
        error: result.error ?? '응답을 전송하지 못했습니다.',
      })
      return
    }

    dispatch({
      type: 'SEND_SUCCEEDED',
      replyMessage: result.message,
    })

    await playReplyCompletionTts({
      text: draft,
      holdLeisureReturnOverlay,
      failureLogLabel: 'Manual reply TTS playback failed.',
    })
  }

  function completeReplyCompletion() {
    dispatch({ type: 'COMPLETE_REPLY_COMPLETION' })
  }

  function deferActiveMessage() {
    clearTimeoutState()
    dispatch({ type: 'DEFER_ACTIVE_MESSAGE' })
  }

  function closeReplyMode() {
    clearTimeoutState()
    dispatch({ type: 'START_RESTORE' })
  }

  function setNextSendOutcome(outcome: PatientChatSendOutcome) {
    dispatch({ type: 'SET_NEXT_SEND_OUTCOME', outcome })
  }

  const value: PatientIncomingChatContextValue = {
    state,
    activeMessage,
    activeReplyMessage,
    latestUnresolvedMessage,
    unreadCount,
    unresolvedCount,
    shouldShowInterruptOverlay,
    shouldShowReplyOverlay,
    isTalkRoute,
    manualWordBank,
    timeoutMs: PATIENT_CHAT_RESPONSE_TIMEOUT_MS,
    availablePresets: PATIENT_CHAT_MESSAGE_PRESETS,
    setRoutePathname,
    triggerIncomingPreset,
    triggerDuplicateMessage,
    focusLatestPendingMessage,
    openLatestPendingReply,
    enterReplyMode,
    retrySuggestions,
    selectRecommendationCategory,
    setRecommendationCategoryPage,
    openManualInputSelect,
    setManualInputMode,
    updateManualDraft,
    appendManualWord,
    clearManualDraft,
    sendSuggestedReply,
    sendManualReply,
    completeReplyCompletion,
    deferActiveMessage,
    closeReplyMode,
    setNextSendOutcome,
  }

  return (
    <PatientIncomingChatContext.Provider value={value}>
      {children}
    </PatientIncomingChatContext.Provider>
  )
}
