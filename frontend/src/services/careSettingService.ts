import type {
  ApiResponse,
  Category,
  DailyRecordResponse,
  Expression,
  FavoritePhrase,
  LeisureContentItem,
  MonthlyRecordDay,
  PatientInfo,
  PatientInfoUpdateRequest,
  Phrase,
  RoutineRequestItem,
  RoutineSlotState,
  TtsSettingsResponse,
} from '../types/care'
import type {
  LeisureContentCreateRequestDto,
  LeisureContentResponseDto,
  LeisureContentUpdateRequestDto,
} from '../types/leisure'
import {
  MOCK_CATEGORIES,
  MOCK_EXPRESSIONS,
  MOCK_FAVORITE_PHRASES,
  MOCK_PHRASES,
} from './mockCareData'
import {
  getTtsSettingsApi,
  toggleTtsSettingsApi,
  uploadTtsVoicesApi,
  deleteTtsVoiceApi,
} from './ttsApi'
import {
  createLeisureContentApi,
  deleteLeisureContentApi,
  getLeisureContentsApi,
  updateLeisureContentApi,
} from './leisureApi'
import { getMonthlyRecordsApi, getDailyRecordApi } from './communicationRecordApi'
import { getRoutinesApi, updateRoutinesApi } from './routineApi'
import { getPatientInfoApi, updatePatientInfoApi } from './patientInfoApi'
import { GUARDIAN_SIGNUP_ROUTINE_SLOTS, ROUTINE_ACTIVITY_TAGS } from '../constants/routineCatalog'

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

export async function getPatientInfo(): Promise<ApiResponse<PatientInfo>> {
  const data = await getPatientInfoApi()
  return { success: true, data, message: 'Fetched patient info.' }
}

export async function updatePatientInfo(info: PatientInfoUpdateRequest): Promise<ApiResponse<PatientInfo>> {
  await updatePatientInfoApi(info)
  const data = await getPatientInfoApi()
  return { success: true, data, message: 'Updated patient info.' }
}

export function getActivityTags() {
  return ROUTINE_ACTIVITY_TAGS
}

export async function getRoutines(): Promise<ApiResponse<RoutineSlotState[]>> {
  try {
    const response = await getRoutinesApi()
    const routines: RoutineSlotState[] = response.routines.map(item => ({
      timeSlotId: item.timeSlotId,
      timeSlotName: item.timeSlotName,
      startTime: item.startTime,
      endTime: item.endTime,
      activityTagId: item.activityTagId,
    }))

    return { success: true, data: routines, message: 'Fetched routines.' }
  } catch {
    const emptyRoutines: RoutineSlotState[] = GUARDIAN_SIGNUP_ROUTINE_SLOTS.map(slot => ({
      timeSlotId: slot.id,
      timeSlotName: slot.label,
      startTime: slot.timeRange.split(' ~ ')[0],
      endTime: slot.timeRange.split(' ~ ')[1],
      activityTagId: null,
    }))

    return { success: true, data: emptyRoutines, message: 'No routines found.' }
  }
}

export async function saveRoutines(routines: RoutineRequestItem[]): Promise<ApiResponse<null>> {
  await updateRoutinesApi(routines)
  return { success: true, data: null, message: 'Saved routines.' }
}

export async function getCategories(): Promise<ApiResponse<Category[]>> {
  await delay()
  return { success: true, data: [...MOCK_CATEGORIES], message: 'Fetched categories.' }
}

export async function getPhrasesByCategory(categoryId: number): Promise<ApiResponse<Phrase[]>> {
  await delay()
  return {
    success: true,
    data: MOCK_PHRASES.filter(phrase => phrase.categoryId === categoryId),
    message: 'Fetched phrases.',
  }
}

export async function getFavoritePhrases(): Promise<ApiResponse<FavoritePhrase[]>> {
  await delay()
  return { success: true, data: [...MOCK_FAVORITE_PHRASES], message: 'Fetched favorite phrases.' }
}

export async function addFavoritePhrase(phraseId: number): Promise<ApiResponse<FavoritePhrase>> {
  await delay()
  return {
    success: true,
    data: { id: Date.now(), matchingId: 1, phraseId },
    message: 'Added favorite phrase.',
  }
}

export async function removeFavoritePhrase(phraseId: number): Promise<ApiResponse<null>> {
  await delay(200)
  void phraseId
  return { success: true, data: null, message: 'Removed favorite phrase.' }
}

function mapLeisureContentResponseToItem(item: LeisureContentResponseDto): LeisureContentItem {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    category: item.category,
    categoryName: item.categoryName,
  }
}

export async function getLeisureContents(): Promise<ApiResponse<LeisureContentItem[]>> {
  try {
    const response = await getLeisureContentsApi()

    return {
      success: true,
      data: response.map(mapLeisureContentResponseToItem),
      message: 'Fetched leisure contents.',
    }
  } catch (error) {
    console.error('Failed to fetch leisure contents.', error)
    throw error
  }
}

export async function saveLeisureContent(
  item: LeisureContentCreateRequestDto,
): Promise<ApiResponse<LeisureContentItem[]>> {
  try {
    await createLeisureContentApi(item)
    return await getLeisureContents()
  } catch (error) {
    console.error('Failed to save leisure content.', error)
    throw error
  }
}

export async function updateLeisureContent(
  contentId: number,
  item: LeisureContentUpdateRequestDto,
): Promise<ApiResponse<LeisureContentItem[]>> {
  try {
    await updateLeisureContentApi(contentId, item)
    return await getLeisureContents()
  } catch (error) {
    console.error('Failed to update leisure content.', error)
    throw error
  }
}

export async function deleteLeisureContent(id: number): Promise<ApiResponse<LeisureContentItem[]>> {
  try {
    await deleteLeisureContentApi(id)
    return await getLeisureContents()
  } catch (error) {
    console.error('Failed to delete leisure content.', error)
    throw error
  }
}

export async function getTtsSettings(): Promise<ApiResponse<TtsSettingsResponse>> {
  const data = await getTtsSettingsApi()
  return { success: true, data, message: 'Fetched TTS settings.' }
}

export async function toggleTtsEnabled(): Promise<ApiResponse<TtsSettingsResponse>> {
  const data = await toggleTtsSettingsApi()
  return { success: true, data, message: 'Toggled TTS setting.' }
}

export async function uploadTtsVoiceFiles(files: File[]): Promise<ApiResponse<TtsSettingsResponse>> {
  const data = await uploadTtsVoicesApi(files)
  return { success: true, data, message: 'Uploaded TTS voice files.' }
}

export async function deleteTtsVoice(voiceFileId: number): Promise<ApiResponse<TtsSettingsResponse>> {
  const data = await deleteTtsVoiceApi(voiceFileId)
  return { success: true, data, message: 'Deleted TTS voice file.' }
}

export async function getExpressions(): Promise<ApiResponse<Expression[]>> {
  await delay()
  return { success: true, data: [...MOCK_EXPRESSIONS], message: 'Fetched expressions.' }
}

export async function getMonthlyRecords(
  year: number,
  month: number,
): Promise<ApiResponse<MonthlyRecordDay[]>> {
  const res = await getMonthlyRecordsApi(year, month)
  return { success: true, data: res.days, message: 'Fetched monthly records.' }
}

export async function getDailyRecord(date: string): Promise<ApiResponse<DailyRecordResponse>> {
  const res = await getDailyRecordApi(date)
  return { success: true, data: res, message: 'Fetched daily record.' }
}

