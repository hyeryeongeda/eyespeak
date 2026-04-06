import type {
  CustomCategoryKey,
  CustomTalkCategoryOption,
} from '../types'
import {
  RECOMMENDATION_CATEGORY_CATALOG,
  RECOMMENDATION_FALLBACK_CATEGORY_KEYS,
} from '../../../../services/recommendationCategoryCatalog'

export const CUSTOM_TALK_CATEGORY_POOL =
  RECOMMENDATION_CATEGORY_CATALOG as CustomTalkCategoryOption[]

export const CUSTOM_TALK_FALLBACK_CATEGORY_KEYS =
  RECOMMENDATION_FALLBACK_CATEGORY_KEYS as CustomCategoryKey[]
