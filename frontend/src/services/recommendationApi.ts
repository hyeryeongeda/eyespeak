import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type {
  RecommendationCategoryListResponseDto,
  RecommendationComposeRequestDto,
  RecommendationComposeResponseDto,
  RecommendationRecordRequestDto,
  RecommendationRecordResponseDto,
  RecommendationRepliesRequestDto,
  RecommendationRepliesResponseDto,
  RecommendationSendRequestDto,
  RecommendationSendResponseDto,
  RecommendationSentencesRequestDto,
  RecommendationSentencesResponseDto,
  RecommendationWordsRequestDto,
  RecommendationWordsResponseDto,
} from '../types/recommendation'

export function getRecommendationCategoriesApi(accessToken?: string | null) {
  return apiClient.get<RecommendationCategoryListResponseDto>(API_ENDPOINTS.RECOMMENDATION_CATEGORIES, {
    accessToken,
  })
}

export function getRecommendationSentencesApi(
  request: RecommendationSentencesRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RecommendationSentencesResponseDto, RecommendationSentencesRequestDto>(
    API_ENDPOINTS.RECOMMENDATION_SENTENCES,
    request,
    {
      accessToken,
    },
  )
}

export function getRecommendationWordsApi(
  request: RecommendationWordsRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RecommendationWordsResponseDto, RecommendationWordsRequestDto>(
    API_ENDPOINTS.RECOMMENDATION_WORDS,
    request,
    {
      accessToken,
    },
  )
}

export function composeRecommendationApi(
  request: RecommendationComposeRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RecommendationComposeResponseDto, RecommendationComposeRequestDto>(
    API_ENDPOINTS.RECOMMENDATION_COMPOSE,
    request,
    {
      accessToken,
    },
  )
}

export function getRecommendationRepliesApi(
  request: RecommendationRepliesRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RecommendationRepliesResponseDto, RecommendationRepliesRequestDto>(
    API_ENDPOINTS.RECOMMENDATION_REPLIES,
    request,
    {
      accessToken,
    },
  )
}

export function sendRecommendationApi(
  request: RecommendationSendRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RecommendationSendResponseDto, RecommendationSendRequestDto>(
    API_ENDPOINTS.RECOMMENDATION_SEND,
    request,
    {
      accessToken,
    },
  )
}

export function recordRecommendationApi(
  request: RecommendationRecordRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RecommendationRecordResponseDto, RecommendationRecordRequestDto>(
    API_ENDPOINTS.RECOMMENDATION_RECORD,
    request,
    {
      accessToken,
    },
  )
}
