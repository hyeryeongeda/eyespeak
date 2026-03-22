import type { FavoritePhrase } from '../types/care'
import type { ApiSource, ServiceFailure, ServiceResult } from '../types/api'
import type {
  FavoriteErrorCode,
  FavoriteItem,
  FavoriteResponseDto,
  KnownFavoriteErrorCode,
  PhraseCategory,
} from '../types/favorite'
import type { FavoriteItem as PatientFavoriteItem, FavoritesSortKey } from '../types/favorites'
import {
  getApiErrorCode,
  getApiErrorSource,
  getApiErrorStatusCode,
  mapApiErrorToMessage,
} from '../utils/errorMapper'
import { getActiveApiMode } from './apiClient'
import { getActiveAuthSession } from './authSessionRegistry'
import {
  createFavoriteApi,
  deleteFavoriteApi,
  getFavoritesApi,
  getPhrasesApi,
  updateFavoriteApi,
} from './favoriteApi'
import { MOCK_CATEGORIES, MOCK_FAVORITE_PHRASES, MOCK_PHRASES } from './mockCareData'

const FAVORITES_PAGE_SIZE = 4

export const FAVORITES_MAX_COUNT = 5

export const FAVORITE_ERROR_MESSAGES: Record<KnownFavoriteErrorCode, string> = {
  'COMM-603': '문구를 찾을 수 없습니다.',
  'COMM-605': '즐겨찾기는 최대 5개까지 등록할 수 있습니다.',
  'COMM-606': '즐겨찾기를 찾을 수 없습니다.',
  'COMM-607': '이미 즐겨찾이에 등록된 표현입니다.',
  'AUTH-203': '접근 권한이 없습니다.',
  'MATCHING-803': '매칭 정보를 찾을 수 없습니다.',
}

let mockFavoritesState: FavoritePhrase[] = MOCK_FAVORITE_PHRASES.map(favorite => ({ ...favorite }))

function getServiceSource(): ApiSource {
  return getActiveApiMode() === 'real' ? 'api' : 'mock'
}

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function buildSuccess<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    source: getServiceSource(),
    data,
  }
}

function buildFailure({
  message,
  code,
  statusCode,
  source = getServiceSource(),
}: {
  message: string
  code?: FavoriteErrorCode
  statusCode?: number
  source?: ApiSource
}): ServiceFailure {
  return {
    success: false,
    source,
    message,
    code,
    statusCode,
  }
}

function createFavoriteFailure(error: unknown, fallbackMessage: string): ServiceFailure {
  const code = getApiErrorCode(error)

  return {
    success: false,
    source: getApiErrorSource(error),
    message:
      (code && FAVORITE_ERROR_MESSAGES[code as KnownFavoriteErrorCode]) ??
      mapApiErrorToMessage(error, fallbackMessage),
    statusCode: getApiErrorStatusCode(error),
    code,
  }
}

function mapFavoriteResponseToItem(response: FavoriteResponseDto): FavoriteItem {
  return {
    favoriteId: response.favoriteId,
    phraseId: response.phraseId,
    content: response.content,
    categoryId: response.categoryId,
    categoryName: response.categoryName,
  }
}

function mapFavoriteToPatientItem(item: FavoriteItem): PatientFavoriteItem {
  return {
    id: String(item.favoriteId),
    text: item.content,
    category: item.categoryName,
  }
}

function mapMockFavoriteToItem(favorite: FavoritePhrase): FavoriteItem | null {
  const phrase = MOCK_PHRASES.find(candidate => candidate.id === favorite.phraseId)

  if (!phrase) {
    return null
  }

  const category = MOCK_CATEGORIES.find(candidate => candidate.id === phrase.categoryId)

  if (!category) {
    return null
  }

  return {
    favoriteId: favorite.id,
    phraseId: phrase.id,
    content: phrase.content,
    categoryId: category.id,
    categoryName: category.name,
  }
}

function getMockFavorites(): FavoriteItem[] {
  return mockFavoritesState
    .map(mapMockFavoriteToItem)
    .filter((item): item is FavoriteItem => item !== null)
}

function isDuplicateMockFavorite(phraseId: number, favoriteIdToIgnore?: number) {
  return mockFavoritesState.some(
    favorite =>
      favorite.phraseId === phraseId &&
      (favoriteIdToIgnore === undefined || favorite.id !== favoriteIdToIgnore),
  )
}

function sortPatientFavorites(
  items: PatientFavoriteItem[],
  _sortKey: FavoritesSortKey,
): PatientFavoriteItem[] {
  return items
}

export function shouldTreatFavoritesAsEmpty(code?: string) {
  return code === 'MATCHING-803'
}

export async function getFavorites(): Promise<ServiceResult<FavoriteItem[]>> {
  if (getActiveApiMode() !== 'real') {
    return buildSuccess(getMockFavorites())
  }

  try {
    const response = await getFavoritesApi(getAccessToken())

    return buildSuccess(response.map(mapFavoriteResponseToItem))
  } catch (error) {
    return createFavoriteFailure(error, '즐겨찾기 목록을 불러오지 못했습니다.')
  }
}

export async function createFavorite(phraseId: number): Promise<ServiceResult<null>> {
  if (getActiveApiMode() !== 'real') {
    const phrase = MOCK_PHRASES.find(candidate => candidate.id === phraseId)

    if (!phrase) {
      return buildFailure({
        code: 'COMM-603',
        statusCode: 404,
        message: FAVORITE_ERROR_MESSAGES['COMM-603'],
      })
    }

    if (mockFavoritesState.length >= FAVORITES_MAX_COUNT) {
      return buildFailure({
        code: 'COMM-605',
        statusCode: 400,
        message: FAVORITE_ERROR_MESSAGES['COMM-605'],
      })
    }

    if (isDuplicateMockFavorite(phraseId)) {
      return buildFailure({
        code: 'COMM-607',
        statusCode: 400,
        message: FAVORITE_ERROR_MESSAGES['COMM-607'],
      })
    }

    mockFavoritesState = [
      ...mockFavoritesState,
      {
        id: Date.now(),
        matchingId: 1,
        phraseId,
      },
    ]

    return buildSuccess(null)
  }

  try {
    await createFavoriteApi({ phraseId }, getAccessToken())
    return buildSuccess(null)
  } catch (error) {
    return createFavoriteFailure(error, '즐겨찾기 등록에 실패했습니다.')
  }
}

export async function updateFavorite(
  favoriteId: number,
  phraseId: number,
): Promise<ServiceResult<null>> {
  if (getActiveApiMode() !== 'real') {
    const favoriteIndex = mockFavoritesState.findIndex(favorite => favorite.id === favoriteId)

    if (favoriteIndex < 0) {
      return buildFailure({
        code: 'COMM-606',
        statusCode: 404,
        message: FAVORITE_ERROR_MESSAGES['COMM-606'],
      })
    }

    const phrase = MOCK_PHRASES.find(candidate => candidate.id === phraseId)

    if (!phrase) {
      return buildFailure({
        code: 'COMM-603',
        statusCode: 404,
        message: FAVORITE_ERROR_MESSAGES['COMM-603'],
      })
    }

    if (isDuplicateMockFavorite(phraseId, favoriteId)) {
      return buildFailure({
        code: 'COMM-607',
        statusCode: 400,
        message: FAVORITE_ERROR_MESSAGES['COMM-607'],
      })
    }

    mockFavoritesState = mockFavoritesState.map(favorite =>
      favorite.id === favoriteId
        ? {
            ...favorite,
            phraseId,
          }
        : favorite,
    )

    return buildSuccess(null)
  }

  try {
    await updateFavoriteApi(favoriteId, { phraseId }, getAccessToken())
    return buildSuccess(null)
  } catch (error) {
    return createFavoriteFailure(error, '즐겨찾기 수정에 실패했습니다.')
  }
}

export async function deleteFavorite(favoriteId: number): Promise<ServiceResult<null>> {
  if (getActiveApiMode() !== 'real') {
    const exists = mockFavoritesState.some(favorite => favorite.id === favoriteId)

    if (!exists) {
      return buildFailure({
        code: 'COMM-606',
        statusCode: 404,
        message: FAVORITE_ERROR_MESSAGES['COMM-606'],
      })
    }

    mockFavoritesState = mockFavoritesState.filter(favorite => favorite.id !== favoriteId)
    return buildSuccess(null)
  }

  try {
    await deleteFavoriteApi(favoriteId, getAccessToken())
    return buildSuccess(null)
  } catch (error) {
    return createFavoriteFailure(error, '즐겨찾기 삭제에 실패했습니다.')
  }
}

export async function fetchFavorites(
  _patientId: string,
  sortKey: FavoritesSortKey = 'recentUsed',
): Promise<PatientFavoriteItem[]> {
  const result = await getFavorites()

  if (!result.success) {
    // MATCHING-803 is treated as an empty list on the patient page so the existing empty
    // state UX still works when the linked favorite set has not been created yet.
    if (shouldTreatFavoritesAsEmpty(result.code)) {
      return []
    }

    throw new Error(result.message)
  }

  return sortPatientFavorites(result.data.map(mapFavoriteToPatientItem), sortKey)
}

export interface SubmitFavoriteSelectionResult {
  success: boolean
  source: 'mock' | 'api'
  errorMessage?: string
}

export async function submitFavoriteSelection(
  _patientId: string,
  _favoriteId: string,
  _text: string,
): Promise<SubmitFavoriteSelectionResult> {
  await new Promise<void>(resolve => setTimeout(resolve, 300))

  return { success: true, source: 'mock' }
}

function groupPhrasesIntoCategories(
  phrases: { phraseId: number; content: string; categoryId: number; categoryName: string }[],
): PhraseCategory[] {
  const map = new Map<number, PhraseCategory>()

  for (const p of phrases) {
    let cat = map.get(p.categoryId)
    if (!cat) {
      cat = { categoryId: p.categoryId, categoryName: p.categoryName, phrases: [] }
      map.set(p.categoryId, cat)
    }
    cat.phrases.push({ phraseId: p.phraseId, content: p.content })
  }

  return [...map.values()]
}

function getMockPhraseCategories(): PhraseCategory[] {
  const phrases = MOCK_PHRASES.map(p => {
    const category = MOCK_CATEGORIES.find(c => c.id === p.categoryId)
    return {
      phraseId: p.id,
      content: p.content,
      categoryId: p.categoryId,
      categoryName: category?.name ?? '',
    }
  })

  return groupPhrasesIntoCategories(phrases)
}

export async function getPhrases(): Promise<ServiceResult<PhraseCategory[]>> {
  if (getActiveApiMode() !== 'real') {
    return buildSuccess(getMockPhraseCategories())
  }

  try {
    const response = await getPhrasesApi(getAccessToken())

    return buildSuccess(groupPhrasesIntoCategories(response))
  } catch (error) {
    return createFavoriteFailure(error, '표현 목록을 불러오지 못했습니다.')
  }
}

export const FAVORITES_PAGE_SIZE_EXPORT = FAVORITES_PAGE_SIZE
