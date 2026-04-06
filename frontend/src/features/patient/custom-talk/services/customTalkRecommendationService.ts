import {
  fetchComposeWords as fetchComposeWordsMock,
  fetchGeneratedCustomSentences as fetchGeneratedCustomSentencesMock,
  fetchRecommendedCustomSentences as fetchRecommendedCustomSentencesMock,
  fetchVisibleCustomCategories as fetchVisibleCustomCategoriesMock,
} from './customTalkMockService'
import { CUSTOM_TALK_CATEGORY_POOL } from '../mocks/customCategoryPool.mock'
import type {
  ComposeStep,
  CustomCategoryKey,
  CustomTalkCategoryOption,
  CustomTalkContextSummary,
  CustomTalkDraft,
} from '../types'
import type {
  RecommendationCategoryKey,
  RecommendationComposeStep,
} from '../../../../types/recommendation'
import { getActiveAuthSession } from '../../../../services/authSessionRegistry'
import { getActiveAiApiMode } from '../../../../services/aiServiceConfig'
import {
  composeRecommendationApi,
  getRecommendationCategoriesApi,
  getRecommendationSentencesApi,
  getRecommendationWordsApi,
} from '../../../../services/recommendationApi'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../../services/recommendationService'

const knownCategoryKeys = new Set(
  CUSTOM_TALK_CATEGORY_POOL.map(category => category.key),
)

const customTalkCategoryMap = new Map(
  CUSTOM_TALK_CATEGORY_POOL.map(category => [category.key, category]),
)

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function normalizeOptionalText(value?: string | null) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : undefined
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

export async function submitCustomTalkUtterance(input: {
  text: string
  shouldFail?: boolean
  source: 'recommended' | 'generated' | 'manual'
}) {
  return submitPatientUtterance(input)
}

export async function playCustomTalkUtteranceTts(input: {
  text: string
}) {
  return playPatientUtteranceTts(input)
}
