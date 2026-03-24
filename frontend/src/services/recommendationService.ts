import {
  fetchComposeWords as fetchComposeWordsMock,
  fetchGeneratedCustomSentences as fetchGeneratedCustomSentencesMock,
  fetchRecommendedCustomSentences as fetchRecommendedCustomSentencesMock,
  fetchVisibleCustomCategories as fetchVisibleCustomCategoriesMock,
  submitCustomTalkUtterance as submitCustomTalkUtteranceMock,
} from '../features/patient/custom-talk/services/customTalkMockService'
import { CUSTOM_TALK_CATEGORY_POOL } from '../features/patient/custom-talk/mocks/customCategoryPool.mock'
import type {
  ComposeStep,
  CustomCategoryKey,
  CustomTalkCategoryOption,
  CustomTalkContextSummary,
  CustomTalkDraft,
} from '../features/patient/custom-talk/types'
import type { PatientChatMessage, PatientSuggestedResponse } from '../types/chat'
import type { AudioPlaybackHandle } from '../types/tts'
import type {
  RecommendationCategoryKey,
  RecommendationComposeStep,
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
  composeRecommendationApi,
  getRecommendationCategoriesApi,
  getRecommendationRepliesApi,
  getRecommendationSentencesApi,
  getRecommendationWordsApi,
  recordRecommendationApi,
} from './recommendationApi'
import { playSynthesizeTts } from './ttsService'
import { dispatchPatientChatMessage } from './patientChatDispatch'
import { mockSendPatientReply, type MockSendPatientReplyInput, type MockSendPatientReplyResult } from './mockPatientChatService'
import { buildMockSuggestedResponses } from './mockSuggestionService'

const knownCategoryKeys = new Set(
  CUSTOM_TALK_CATEGORY_POOL.map(category => category.key),
)

const customTalkCategoryMap = new Map(
  CUSTOM_TALK_CATEGORY_POOL.map(category => [category.key, category]),
)

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function mapContextToRecentMessages(context: CustomTalkContextSummary | null | undefined) {
  return context?.recentMessages ?? []
}

function normalizeOptionalText(value?: string | null) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
}

function mapCustomTalkCategoryKey(value: CustomCategoryKey): RecommendationCategoryKey {
  return value
}

function mapComposeStep(value: ComposeStep): RecommendationComposeStep {
  return value
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

function mapVisibleCategories(
  input: Array<{ key: string; title?: string; description?: string; hint?: string | null }>,
): CustomTalkCategoryOption[] {
  return input
    .map(category => {
      const key = category.key as CustomCategoryKey

      if (!knownCategoryKeys.has(key)) {
        return null
      }

      const fallback = customTalkCategoryMap.get(key)

      if (!fallback) {
        return null
      }

      return {
        key,
        title: category.title?.trim() || fallback.title,
        description: category.description?.trim() || fallback.description,
        hint: category.hint?.trim() || fallback.hint,
      }
    })
    .filter((category): category is CustomTalkCategoryOption => Boolean(category))
}

function buildComposeRequest(draft: CustomTalkDraft) {
  return {
    categoryKey: draft.categoryKey
      ? mapCustomTalkCategoryKey(draft.categoryKey)
      : undefined,
    subject: normalizeOptionalText(draft.subject),
    object: normalizeOptionalText(draft.object),
    predicate: normalizeOptionalText(draft.predicate),
    punctuation: normalizeOptionalText(draft.punctuation),
  }
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

function mapCustomTalkSourceToMessageType(
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

function toCustomTalkSubmitSource(
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

export async function fetchVisibleCustomCategories(input: {
  refreshCount: number
  shouldFail?: boolean
  context: CustomTalkContextSummary | null
}) {
  if (getActiveAiApiMode() !== 'real') {
    return fetchVisibleCustomCategoriesMock(input)
  }

  const response = await getRecommendationCategoriesApi(getAccessToken())
  const visibleCategories = mapVisibleCategories(response.categories)

  if (visibleCategories.length > 0) {
    return visibleCategories
  }

  return fetchVisibleCustomCategoriesMock({
    ...input,
    shouldFail: false,
  })
}

export async function fetchRecommendedCustomSentences(input: {
  categoryKey: CustomCategoryKey
  shouldFail?: boolean
  context?: CustomTalkContextSummary | null
}) {
  if (getActiveAiApiMode() !== 'real') {
    return fetchRecommendedCustomSentencesMock(input)
  }

  const response = await getRecommendationSentencesApi(
    {
      categoryKey: mapCustomTalkCategoryKey(input.categoryKey),
      guardianMessage: input.context?.guardianMessage,
      recentMessages: mapContextToRecentMessages(input.context),
    },
    getAccessToken(),
  )

  return response.sentences
}

export async function fetchComposeWords(input: {
  categoryKey?: CustomCategoryKey
  step: ComposeStep
  refreshCount: number
  selectedWords?: {
    subject?: string
    object?: string
  }
  shouldFail?: boolean
}) {
  if (getActiveAiApiMode() !== 'real') {
    return fetchComposeWordsMock(input)
  }

  const selectedSubject = normalizeOptionalText(input.selectedWords?.subject)
  const selectedObject = normalizeOptionalText(input.selectedWords?.object)
  const selectedWords =
    selectedSubject || selectedObject
      ? {
          subject: selectedSubject,
          object: selectedObject,
        }
      : undefined

  const response = await getRecommendationWordsApi(
    {
      categoryKey: input.categoryKey
        ? mapCustomTalkCategoryKey(input.categoryKey)
        : undefined,
      step: mapComposeStep(input.step),
      refreshCount: input.refreshCount,
      selectedWords,
    },
    getAccessToken(),
  )

  return response.words
}

export async function fetchGeneratedCustomSentences(input: {
  draft: CustomTalkDraft
  shouldFail?: boolean
  context?: CustomTalkContextSummary | null
}) {
  if (getActiveAiApiMode() !== 'real') {
    return fetchGeneratedCustomSentencesMock(input)
  }

  const response = await composeRecommendationApi(
    {
      ...buildComposeRequest(input.draft),
      guardianMessage: input.context?.guardianMessage,
      recentMessages: mapContextToRecentMessages(input.context),
    },
    getAccessToken(),
  )

  return response.sentences
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
    const mockResponse = await submitCustomTalkUtteranceMock({
      ...input,
      text: normalizedText,
      source: toCustomTalkSubmitSource(input.source),
    })

    const message = await sendPatientChatNow({
      text: normalizedText,
      type: mapCustomTalkSourceToMessageType(toCustomTalkSubmitSource(input.source)),
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
    type: mapCustomTalkSourceToMessageType(toCustomTalkSubmitSource(input.source)),
    contentType: 'EXPRESSION',
    exprId: recordResponse.expressionId,
  })

  return {
    success: true,
    id: message.id ?? `recommendation-${input.source}-${Date.now()}`,
    submittedAt: getSubmittedAt(message.createdAt),
  }
}

export async function submitCustomTalkUtterance(input: {
  text: string
  shouldFail?: boolean
  source: 'recommended' | 'generated' | 'manual'
}) {
  return submitPatientUtterance(input)
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

export async function playCustomTalkUtteranceTts(input: {
  text: string
}): Promise<AudioPlaybackHandle | null> {
  return playPatientUtteranceTts(input)
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
