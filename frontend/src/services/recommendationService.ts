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
import { playAudioSource } from '../utils/audio'
import { getActiveAuthSession } from './authSessionRegistry'
import { getActiveAiApiMode } from './aiServiceConfig'
import {
  composeRecommendationApi,
  getRecommendationCategoriesApi,
  getRecommendationRepliesApi,
  getRecommendationSentencesApi,
  getRecommendationWordsApi,
  sendRecommendationApi,
} from './recommendationApi'
import { synthesizeTts } from './ttsService'
import { mockSendPatientReply, type MockSendPatientReplyInput, type MockSendPatientReplyResult } from './mockPatientChatService'
import { buildMockSuggestedResponses } from './mockSuggestionService'

const timestampFormatter = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short',
  timeStyle: 'medium',
})

const knownCategoryKeys = new Set(
  CUSTOM_TALK_CATEGORY_POOL.map(category => category.key),
)

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function mapContextToRecentMessages(context: CustomTalkContextSummary | null | undefined) {
  return context?.recentMessages ?? []
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

function mapVisibleCategoryKeys(input: Array<{ key: string }>): CustomCategoryKey[] {
  return input
    .map(category => category.key)
    .filter((key): key is CustomCategoryKey => knownCategoryKeys.has(key as CustomCategoryKey))
}

function buildComposeRequest(draft: CustomTalkDraft) {
  return {
    categoryKey: draft.categoryKey
      ? mapCustomTalkCategoryKey(draft.categoryKey)
      : undefined,
    subject: draft.subject,
    object: draft.object,
    predicate: draft.predicate,
    punctuation: draft.punctuation,
  }
}

function getSubmittedAt(value?: string) {
  return value ?? new Date().toISOString()
}

function getDisplayTimestamp(value?: string) {
  return timestampFormatter.format(value ? new Date(value) : new Date())
}

function mapReplyTypeToSendSource(
  value: MockSendPatientReplyInput['type'],
): RecommendationSendSource {
  return value
}

function normalizeUtteranceText(text: string) {
  return text.trim()
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
  const visibleKeys = mapVisibleCategoryKeys(response.categories)

  if (visibleKeys.length > 0) {
    return visibleKeys
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

  const response = await getRecommendationWordsApi(
    {
      categoryKey: input.categoryKey
        ? mapCustomTalkCategoryKey(input.categoryKey)
        : undefined,
      step: mapComposeStep(input.step),
      refreshCount: input.refreshCount,
      selectedWords: input.selectedWords,
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

export async function submitCustomTalkUtterance(input: {
  text: string
  shouldFail?: boolean
  source: 'recommended' | 'generated' | 'manual'
}) {
  const normalizedText = normalizeUtteranceText(input.text)

  if (!normalizedText) {
    throw new Error('전송할 문장이 비어 있습니다.')
  }

  if (getActiveAiApiMode() !== 'real') {
    return submitCustomTalkUtteranceMock({
      ...input,
      text: normalizedText,
    })
  }

  const response = await sendRecommendationApi(
    {
      text: normalizedText,
      source: input.source,
    },
    getAccessToken(),
  )

  return {
    success: true,
    id: response.messageId ?? `recommendation-${input.source}-${Date.now()}`,
    submittedAt: getSubmittedAt(response.submittedAt),
  }
}

export async function playCustomTalkUtteranceTts(input: {
  text: string
}): Promise<AudioPlaybackHandle | null> {
  const normalizedText = normalizeUtteranceText(input.text)

  if (!normalizedText) {
    throw new Error('재생할 문장이 비어 있습니다.')
  }

  if (getActiveAiApiMode() !== 'real') {
    return null
  }

  const audioSource = await synthesizeTts({
    text: normalizedText,
  })

  return playAudioSource(audioSource)
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
  if (getActiveAiApiMode() !== 'real') {
    return mockSendPatientReply(input)
  }

  try {
    const response = await sendRecommendationApi(
      {
        text: input.content,
        source: mapReplyTypeToSendSource(input.type),
        replyToId: input.replyToId,
      },
      getAccessToken(),
    )

    return {
      success: true,
      message: {
        id: response.messageId ?? `patient-reply-${Date.now()}`,
        sender: 'patient',
        type: input.type,
        content: input.content,
        createdAt: getDisplayTimestamp(response.submittedAt),
        status: 'replied',
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
