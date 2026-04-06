import type {
  PatientChatMessage,
  PatientSuggestedResponse,
} from '../types/chat'
import type { AudioPlaybackHandle } from '../types/tts'
import type {
  RecommendationCategoryKey,
  RecommendationReplyDto,
  RecommendationRepliesRequestDto,
  RecommendationReplyHistoryItemDto,
  RecommendationReplySource,
  RecommendationSendSource,
} from '../types/recommendation'
import { createServiceFailure } from '../utils/errorMapper'
import { getActiveAuthSession } from './authSessionRegistry'
import { getActiveAiApiMode } from './aiServiceConfig'
import { getActiveApiMode } from '../config/env'
import {
  getReplyCategoriesApi,
  getRecommendationRepliesApi,
  getRecommendationSentencesApi,
  recordRecommendationApi,
} from './recommendationApi'
import { playSynthesizeTts } from './ttsService'
import { dispatchPatientChatMessage } from './patientChatDispatch'
import { mockSendPatientReply, type MockSendPatientReplyInput, type MockSendPatientReplyResult } from './mockPatientChatService'
import { buildMockSuggestedResponses } from './mockSuggestionService'
import { submitMockPatientUtterance } from './mockPatientUtteranceService'
import { RECOMMENDATION_CATEGORY_CATALOG } from './recommendationCategoryCatalog'
import { getMockRecommendationSentences } from './recommendationSentenceMocks'

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function normalizeOptionalText(value?: string | null) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
}

function mapReplySource(value: RecommendationReplyDto['source']): RecommendationReplySource {
  return value
}

function mapReplyHistory(messages: PatientChatMessage[]): RecommendationReplyHistoryItemDto[] {
  return messages.map(message => ({
    sender: message.sender,
    content: message.content,
  }))
}

function mapRecommendedReplies(replies: RecommendationReplyDto[]): PatientSuggestedResponse[] {
  return replies.map(reply => ({
    id: reply.id,
    label: reply.label,
    intentKey: reply.intentKey,
    source: mapReplySource(reply.source),
    rank: reply.rank,
  }))
}

function mapRecentConversation(messages: PatientChatMessage[], activeMessageId?: string) {
  const recentMessages = messages
    .filter(message => message.id !== activeMessageId)
    .slice(-6)
    .map(message => {
      const content = message.content.trim()

      return content ? `${message.sender}: ${content}` : ''
    })
    .filter(Boolean)

  return recentMessages.length > 0 ? recentMessages : undefined
}

function mapRecommendedSentences(
  messageId: string,
  categoryKey: RecommendationCategoryKey,
  sentences: string[],
): PatientSuggestedResponse[] {
  const seenLabels = new Set<string>()

  return sentences
    .map(sentence => sentence.trim())
    .filter(label => {
      if (!label || seenLabels.has(label)) {
        return false
      }

      seenLabels.add(label)
      return true
    })
    .slice(0, 4)
    .map((label, index) => ({
      id: `${messageId}-${categoryKey}-${index + 1}`,
      label,
      intentKey: categoryKey,
      source: 'category' as const,
      rank: index + 1,
    }))
}

function getSubmittedAt(value?: string) {
  return value ?? new Date().toISOString()
}

function mapReplyTypeToSendSource(
  value: MockSendPatientReplyInput['type'],
): RecommendationSendSource {
  return value
}

function normalizeUtteranceText(text: string) {
  return text.trim()
}

const QUIET_PATIENT_CHAT_SEND_ERROR =
  '지금은 바로 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.'

function normalizePatientChatDispatchError(error?: string) {
  if (!error) {
    return QUIET_PATIENT_CHAT_SEND_ERROR
  }

  if (
    error.includes('실시간 채팅 연결이 아직 준비되지 않았습니다') ||
    error.includes('실시간 채팅 전송에 실패했습니다')
  ) {
    return QUIET_PATIENT_CHAT_SEND_ERROR
  }

  return error
}

function mapUtteranceSourceToMessageType(
  source: 'recommended' | 'generated' | 'manual',
): 'text' | 'manual_text' | 'word_combination' {
  if (source === 'generated') {
    return 'word_combination'
  }

  if (source === 'manual') {
    return 'manual_text'
  }

  return 'text'
}

function normalizeMockUtteranceSource(
  source: RecommendationSendSource,
): 'recommended' | 'generated' | 'manual' {
  if (source === 'recommended' || source === 'generated') {
    return source
  }

  return 'manual'
}

async function sendPatientChatNow(input: {
  text: string
  type?: 'text' | 'suggested_reply' | 'manual_text' | 'word_combination'
  contentType?: 'TEXT' | 'PHRASE' | 'EXPRESSION'
  phraseId?: number | null
  exprId?: number | null
  replyToId?: string
}) {
  const result = await dispatchPatientChatMessage({
    text: input.text,
    type: input.type,
    replyToId: input.replyToId,
    contentType: input.contentType ?? 'TEXT',
    phraseId: input.phraseId,
    exprId: input.exprId,
  })

  if (!result.success || !result.message) {
    throw new Error(normalizePatientChatDispatchError(result.error))
  }

  if (!result.success || !result.message) {
    throw new Error(result.error ?? '실시간 채팅 전송에 실패했습니다.')
  }

  return result.message
}

function recordRecommendationInBackground(input: {
  text: string
  source: RecommendationSendSource
  replyToId?: string
}) {
  void input.source
  void input.replyToId

  if (getActiveAiApiMode() !== 'real') {
    return
  }

  void recordRecommendationApi(
    {
      text: input.text,
    },
    getAccessToken(),
  ).catch(error => {
    console.warn('Recommendation record sync failed after patient chat send.', error)
  })
}

export async function fetchSuggestedReplyCategories(input: {
  message: PatientChatMessage
  history: PatientChatMessage[]
}) {
  if (getActiveAiApiMode() !== 'real') {
    return RECOMMENDATION_CATEGORY_CATALOG.map(category => ({
      key: category.key,
      title: category.title,
      description: category.description,
      hint: category.hint,
    }))
  }

  const response = await getReplyCategoriesApi(
    { message: input.message.content },
    getAccessToken(),
  )

  return response.categories.map(cat => ({
    key: cat as RecommendationCategoryKey,
    title: cat,
    description: response.sentimentMap[cat] ?? '중립',
    hint: response.intentMap[cat] ?? '기타',
  }))
}

export async function fetchSuggestedSentences(input: {
  categoryKey: RecommendationCategoryKey
  message: PatientChatMessage
  history: PatientChatMessage[]
}) {
  if (getActiveAiApiMode() !== 'real') {
    if (input.message.meta?.suggestionMode === 'failure') {
      throw new Error('추천 문장을 불러오지 못했습니다. 다시 시도해 주세요.')
    }

    if (input.message.meta?.suggestionMode === 'empty') {
      return []
    }

    const sentences = getMockRecommendationSentences(input.categoryKey)

    return mapRecommendedSentences(input.message.id, input.categoryKey, sentences)
  }

  const recentMessages = mapRecentConversation(input.history, input.message.id)
  const request = {
    categoryKey: input.categoryKey,
    guardianMessage: normalizeOptionalText(input.message.content),
    recentMessages,
  }
  const response = await getRecommendationSentencesApi(request, getAccessToken())

  return mapRecommendedSentences(input.message.id, input.categoryKey, response.sentences)
}

export async function submitPatientUtterance(input: {
  text: string
  shouldFail?: boolean
  source: RecommendationSendSource
}) {
  const normalizedText = normalizeUtteranceText(input.text)

  if (!normalizedText) {
    throw new Error('전송할 문장이 비어 있습니다.')
  }

  if (getActiveApiMode() !== 'real') {
    const mockSource = normalizeMockUtteranceSource(input.source)
    const mockResponse = await submitMockPatientUtterance({
      ...input,
      text: normalizedText,
      source: mockSource,
    })

    const message = await sendPatientChatNow({
      text: normalizedText,
      type: mapUtteranceSourceToMessageType(mockSource),
    })

    return {
      success: true,
      id: message.id ?? mockResponse.id,
      submittedAt: getSubmittedAt(mockResponse.submittedAt),
    }
  }

  const recordResponse = await recordRecommendationApi(
    {
      text: normalizedText,
    },
    getAccessToken(),
  )

  const message = await sendPatientChatNow({
    text: normalizedText,
    type: mapUtteranceSourceToMessageType(normalizeMockUtteranceSource(input.source)),
    contentType: 'EXPRESSION',
    exprId: recordResponse.expressionId,
  })

  return {
    success: true,
    id: message.id ?? `recommendation-${input.source}-${Date.now()}`,
    submittedAt: getSubmittedAt(message.createdAt),
  }
}

export async function playPatientUtteranceTts(input: {
  text: string
}): Promise<AudioPlaybackHandle | null> {
  const normalizedText = normalizeUtteranceText(input.text)

  if (!normalizedText) {
    throw new Error('재생할 문장이 비어 있습니다.')
  }

  return playSynthesizeTts({
    text: normalizedText,
  })
}

export async function fetchSuggestedReplies(input: {
  message: PatientChatMessage
  history: PatientChatMessage[]
}) {
  if (getActiveAiApiMode() !== 'real') {
    return buildMockSuggestedResponses(input)
  }

  const request: RecommendationRepliesRequestDto = {
    message: input.message.content,
    history: mapReplyHistory(input.history),
  }
  const response = await getRecommendationRepliesApi(request, getAccessToken())

  return mapRecommendedReplies(response.replies)
}

export async function sendPatientReply(
  input: MockSendPatientReplyInput,
): Promise<MockSendPatientReplyResult> {
  if (getActiveApiMode() !== 'real') {
    return mockSendPatientReply(input)
  }

  try {
    const message = await sendPatientChatNow({
      text: input.content,
      type: input.type,
      replyToId: input.replyToId,
    })

    recordRecommendationInBackground({
      text: input.content,
      source: mapReplyTypeToSendSource(input.type),
      replyToId: input.replyToId,
    })

    return {
      success: true,
      message: {
        ...message,
        type: input.type,
        replyToId: input.replyToId,
      },
    }
  } catch (error) {
    const failure = createServiceFailure(error, '추천 답변 전송에 실패했습니다.')

    return {
      success: false,
      error: failure.message,
    }
  }
}
