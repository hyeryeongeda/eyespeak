import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import {
  PATIENT_CHAT_MESSAGE_PRESETS,
  PATIENT_CHAT_RESPONSE_TIMEOUT_MS,
  createMockIncomingPatientChatMessage,
} from '../services/mockPatientChatService'
import {
  MAX_SUGGESTION_RETRIES,
  buildManualWordBank,
} from '../services/mockSuggestionService'
import { fetchSuggestedReplies, sendPatientReply } from '../services/recommendationService'
import type {
  PatientChatManualInputMode,
  PatientChatMessage,
  PatientChatRouteContext,
  PatientChatSendOutcome,
  PatientChatSessionState,
  PatientSuggestedResponse,
} from '../types/chat'

type PatientChatAction =
  | { type: 'SET_ROUTE_CONTEXT'; route: PatientChatRouteContext }
  | { type: 'START_RECEIVING' }
  | { type: 'RECORD_RECEIVED_MESSAGE'; message: PatientChatMessage; previousRoute: PatientChatRouteContext | null }
  | { type: 'MARK_MESSAGE_UNREAD'; messageId: string }
  | {
      type: 'OPEN_INTERRUPT'
      messageId: string
      pauseMedia: boolean
      focusMessageId: string
    }
  | { type: 'ENTER_REPLY_MODE'; messageId: string }
  | { type: 'SUGGESTION_LOADING'; messageId: string }
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
  | { type: 'DEFER_ACTIVE_MESSAGE' }
  | { type: 'START_RESTORE' }
  | { type: 'FINISH_RESTORE' }
  | { type: 'RESET_AFTER_RESTORE' }
  | { type: 'DUPLICATE_RECEIVED'; messageId: string }

const initialState: PatientChatSessionState = {
  status: 'idle',
  interruptState: 'none',
  fallbackState: 'none',
  suggestionState: 'idle',
  messages: [],
  suggestions: [],
  currentRoute: null,
  previousRoute: null,
  activeMessageId: null,
  activeReplyMessageId: null,
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
        messages: [...state.messages, action.message],
        previousRoute: action.previousRoute,
        activeMessageId: state.activeMessageId ?? action.message.id,
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
        suggestionState: 'idle',
        activeMessageId: action.messageId,
        activeReplyMessageId: action.messageId,
        suggestions: [],
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        manualInputMode: null,
        manualDraft: '',
        messages: state.messages.map(message =>
          message.id === action.messageId && message.sender === 'guardian'
            ? { ...message, status: 'pending_reply' }
            : message,
        ),
        lastEventLabel: '응답 모드로 전환했습니다.',
      }

    case 'SUGGESTION_LOADING':
      return {
        ...state,
        status: 'suggestion_loading',
        suggestionState: 'loading',
        suggestions: [],
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
        lastEventLabel: '응답을 전송 중입니다.',
      }

    case 'SEND_SUCCEEDED': {
      const nextMessages = state.messages.map(message =>
        message.id === action.replyMessage.replyToId && message.sender === 'guardian'
          ? { ...message, status: 'replied' as const }
          : message,
      )

      return {
        ...state,
        status: 'sent',
        messages: [...nextMessages, action.replyMessage],
        sendError: null,
        selectedSuggestionId: null,
        suggestionState: 'idle',
        suggestions: [],
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        lastEventLabel: '응답을 전송했습니다.',
      }
    }

    case 'CLEAR_SENT_FEEDBACK':
      return {
        ...state,
        status: 'conversation_active',
        lastEventLabel: '대화 세션이 유지되고 있습니다.',
      }

    case 'SEND_FAILED':
      return {
        ...state,
        status: 'send_failed',
        fallbackState: 'send_failed',
        sendError: action.error,
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
        activeReplyMessageId: null,
        activeMessageId: action.messageId,
        suggestions: [],
        suggestionState: 'idle',
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '응답 시간이 지나 이전 화면으로 복귀합니다.',
      }

    case 'DEFER_ACTIVE_MESSAGE':
      return {
        ...state,
        status: 'deferred',
        interruptState: 'deferred',
        activeReplyMessageId: null,
        suggestions: [],
        suggestionState: 'idle',
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '메시지를 나중에 보기로 남겨두었습니다.',
      }

    case 'START_RESTORE':
      return {
        ...state,
        status: 'restoring',
        interruptState: 'restoring',
        activeReplyMessageId: null,
        suggestions: [],
        suggestionState: 'idle',
        fallbackState: 'none',
        manualInputMode: null,
        manualDraft: '',
        suggestionError: null,
        sendError: null,
        selectedSuggestionId: null,
        responseTimeoutAt: null,
        responseTimeoutMessageId: null,
        isMediaPausedByInterrupt: false,
        lastEventLabel: '이전 화면으로 복귀 중입니다.',
      }

    case 'FINISH_RESTORE':
      return {
        ...state,
        status: 'restored',
        interruptState: 'restored',
        lastEventLabel: '이전 화면으로 복귀했습니다.',
      }

    case 'RESET_AFTER_RESTORE':
      return {
        ...state,
        status: state.messages.length > 0 ? 'conversation_active' : 'waiting_message',
        interruptState: 'none',
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

interface PatientIncomingChatContextValue {
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
  triggerIncomingPreset: (presetKey: (typeof PATIENT_CHAT_MESSAGE_PRESETS)[number]['key'], options?: { messageId?: string }) => void
  triggerDuplicateMessage: () => void
  openLatestPendingReply: () => void
  enterReplyMode: (messageId?: string) => void
  retrySuggestions: () => void
  openManualInputSelect: () => void
  setManualInputMode: (mode: PatientChatManualInputMode) => void
  updateManualDraft: (draft: string) => void
  appendManualWord: (word: string) => void
  clearManualDraft: () => void
  sendSuggestedReply: (suggestion: PatientSuggestedResponse) => Promise<void>
  sendManualReply: () => Promise<void>
  deferActiveMessage: () => void
  closeReplyMode: () => void
  setNextSendOutcome: (outcome: PatientChatSendOutcome) => void
}

const PatientIncomingChatContext =
  createContext<PatientIncomingChatContextValue | null>(null)

export function PatientIncomingChatProvider({
  pathname,
  children,
}: PropsWithChildren<{ pathname: string }>) {
  const [state, dispatch] = useReducer(patientChatReducer, initialState)
  const stateRef = useRef(state)
  const knownMessageIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    dispatch({ type: 'SET_ROUTE_CONTEXT', route: getRouteContext(pathname) })
  }, [pathname])

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
    }, 900)

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

  function armTimeout(messageId: string) {
    dispatch({
      type: 'ARM_TIMEOUT',
      messageId,
      timeoutAt: Date.now() + PATIENT_CHAT_RESPONSE_TIMEOUT_MS,
    })
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
      currentState.interruptState === 'reply_mode'

    if (route.responseSurface === 'inline' && route.canEnterReplyMode && !alreadyHandlingConversation) {
      armTimeout(incomingMessage.id)
      void enterReplyModeInternal(incomingMessage.id, incomingMessage)
      return
    }

    if (!alreadyHandlingConversation) {
      dispatch({
        type: 'OPEN_INTERRUPT',
        messageId: incomingMessage.id,
        pauseMedia: route.shouldPauseMediaOnInterrupt,
        focusMessageId: incomingMessage.id,
      })
      armTimeout(incomingMessage.id)
    }
  }

  function triggerDuplicateMessage() {
    const duplicateId = 'guardian-duplicate-water'

    triggerIncomingPreset('water', { messageId: duplicateId })
    triggerIncomingPreset('water', { messageId: duplicateId })
  }

  async function enterReplyModeInternal(messageId: string, knownMessage?: PatientChatMessage) {
    const currentState = stateRef.current
    const message = knownMessage ?? getMessageById(currentState.messages, messageId)

    if (!message) {
      return
    }

    clearTimeoutState()
    dispatch({ type: 'ENTER_REPLY_MODE', messageId })

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

    void enterReplyModeInternal(targetMessageId)
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

  async function sendSuggestedReply(suggestion: PatientSuggestedResponse) {
    const currentState = stateRef.current
    const replyToId = currentState.activeReplyMessageId

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
  }

  async function sendManualReply() {
    const currentState = stateRef.current
    const replyToId = currentState.activeReplyMessageId
    const draft = currentState.manualDraft.trim()

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
    openLatestPendingReply,
    enterReplyMode,
    retrySuggestions,
    openManualInputSelect,
    setManualInputMode,
    updateManualDraft,
    appendManualWord,
    clearManualDraft,
    sendSuggestedReply,
    sendManualReply,
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

export function usePatientIncomingChat() {
  const context = useContext(PatientIncomingChatContext)

  if (!context) {
    throw new Error('usePatientIncomingChat must be used within PatientIncomingChatProvider')
  }

  return context
}
