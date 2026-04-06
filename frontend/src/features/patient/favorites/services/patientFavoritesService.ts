import type { FavoriteItem as FavoritesCoreItem } from '../../../../types/favorite'
import type {
  FavoriteItem as PatientFavoriteItem,
  FavoritesSortKey,
} from '../../../../types/favorites'
import {
  getFavorites,
  shouldTreatFavoritesAsEmpty,
} from '../../../../services/favoritesService'
import { logPhraseUsageSilently } from '../../../../services/usageLogService'

const FAVORITES_PAGE_SIZE = 4

export const FAVORITES_PAGE_SIZE_EXPORT = FAVORITES_PAGE_SIZE

function mapFavoriteToPatientItem(item: FavoritesCoreItem): PatientFavoriteItem {
  return {
    id: `${item.favoriteId}:${item.phraseId}`,
    phraseId: item.phraseId,
    text: item.content,
    category: item.categoryName,
  }
}

function parsePhraseIdFromFavoriteItemId(favoriteId: string) {
  const [, phraseIdSegment] = favoriteId.split(':')
  const phraseId = Number.parseInt(phraseIdSegment ?? '', 10)

  return Number.isInteger(phraseId) ? phraseId : null
}

function sortPatientFavorites(
  items: PatientFavoriteItem[],
  _sortKey: FavoritesSortKey,
): PatientFavoriteItem[] {
  return items
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
  favoriteId: string,
  _text: string,
): Promise<SubmitFavoriteSelectionResult> {
  await new Promise<void>(resolve => setTimeout(resolve, 300))

  const phraseId = parsePhraseIdFromFavoriteItemId(favoriteId)

  if (phraseId != null) {
    logPhraseUsageSilently(phraseId)
  }

  return { success: true, source: 'mock' }
}
