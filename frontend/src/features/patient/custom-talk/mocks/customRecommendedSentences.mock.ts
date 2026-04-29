import type { CustomCategoryKey } from '../types'
import {
  RECOMMENDATION_SENTENCE_FALLBACK,
  RECOMMENDATION_SENTENCE_MOCKS,
} from '../../../../services/recommendationSentenceMocks'

export const CUSTOM_RECOMMENDED_SENTENCES =
  RECOMMENDATION_SENTENCE_MOCKS as Record<CustomCategoryKey, string[]>

export const CUSTOM_RECOMMENDED_SENTENCE_FALLBACK =
  RECOMMENDATION_SENTENCE_FALLBACK
