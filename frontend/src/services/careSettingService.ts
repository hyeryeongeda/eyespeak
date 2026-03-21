/**
 * 보호자 설정 Mock 서비스
 * API 연동 시 이 파일의 함수 내부만 교체하면 됨
 */

import type {
  PatientInfo,
  RoutineSlotState,
  RoutineRequestItem,
  Category,
  Phrase,
  FavoritePhrase,
  LeisureContentItem,
  LeisureContentRequest,
  DwellTimePreset,
  ActivationDelayPreset,
  TtsSetting,
  TtsVoiceFile,
  UserWords,
  Expression,
  DailySummary,
  ApiResponse,
} from '../types/care'
import { DWELL_TIME_OPTIONS, ACTIVATION_DELAY_OPTIONS } from '../types/care'

import {
  MOCK_PATIENT_INFO,
  MOCK_CATEGORIES,
  MOCK_PHRASES,
  MOCK_FAVORITE_PHRASES,
  MOCK_DWELL_TIME_PRESET,
  MOCK_ACTIVATION_DELAY_PRESET,
  MOCK_TTS_SETTING,
  MOCK_TTS_VOICE_FILES,
  MOCK_USER_WORDS,
  MOCK_EXPRESSIONS,
  MOCK_DAILY_SUMMARIES,
} from './mockCareData'
import { getRoutinesApi, updateRoutinesApi } from './routineApi'
import {
  getLeisureContentsApi,
  createLeisureContentApi,
  updateLeisureContentApi,
  deleteLeisureContentApi,
} from './leisureApi'
import { GUARDIAN_SIGNUP_ROUTINE_SLOTS, ROUTINE_ACTIVITY_TAGS } from '../constants/routineCatalog'

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))
const CARE_DWELL_TIME_PRESET_STORAGE_KEY = 'careSetting:dwellTimePreset'
const CARE_ACTIVATION_DELAY_PRESET_STORAGE_KEY = 'careSetting:activationDelayPreset'

export const CARE_DWELL_TIME_PRESET_UPDATED_EVENT = 'care-setting:dwell-time-updated'
export const CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT =
  'care-setting:activation-delay-updated'

export interface CareDwellTimePresetUpdatedDetail {
  preset: DwellTimePreset
}

export interface CareActivationDelayPresetUpdatedDetail {
  preset: ActivationDelayPreset
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function readStoredPreset<TPreset extends string>(
  storageKey: string,
  isValidPreset: (value: unknown) => value is TPreset,
) {
  if (!isBrowser()) {
    return null
  }

  const storedValue = localStorage.getItem(storageKey)

  if (!storedValue || !isValidPreset(storedValue)) {
    return null
  }

  return storedValue
}

function writeStoredPreset(storageKey: string, preset: string) {
  if (!isBrowser()) {
    return
  }

  localStorage.setItem(storageKey, preset)
}

function isDwellTimePreset(value: unknown): value is DwellTimePreset {
  return typeof value === 'string' && value in DWELL_TIME_OPTIONS
}

function isActivationDelayPreset(value: unknown): value is ActivationDelayPreset {
  return typeof value === 'string' && value in ACTIVATION_DELAY_OPTIONS
}

// 환자 기본 정보
export async function getPatientInfo(): Promise<ApiResponse<PatientInfo>> {
  await delay()
  return { success: true, data: { ...MOCK_PATIENT_INFO }, message: '조회 성공' }
}

export async function updatePatientInfo(info: Partial<PatientInfo>): Promise<ApiResponse<PatientInfo>> {
  await delay()
  const updated = { ...MOCK_PATIENT_INFO, ...info }
  return { success: true, data: updated, message: '수정 성공' }
}


// 루틴 — 활동 태그 목록 (상수)
export function getActivityTags() {
  return ROUTINE_ACTIVITY_TAGS
}

// 루틴 조회 — GET /routines → RoutineSlotState[] 변환
export async function getRoutines(): Promise<ApiResponse<RoutineSlotState[]>> {
  try {
    const response = await getRoutinesApi()
    const routines: RoutineSlotState[] = response.routines.map((item) => ({
      timeSlotId: item.timeSlotId,
      timeSlotName: item.timeSlotName,
      startTime: item.startTime,
      endTime: item.endTime,
      activityTagId: item.activityTagId,
    }))
    return { success: true, data: routines, message: '조회 성공' }
  } catch {
    // 404 — 루틴 미등록 → 빈 슬롯 7개 반환
    const emptyRoutines: RoutineSlotState[] = GUARDIAN_SIGNUP_ROUTINE_SLOTS.map((slot) => ({
      timeSlotId: slot.id,
      timeSlotName: slot.label,
      startTime: slot.timeRange.split(' ~ ')[0],
      endTime: slot.timeRange.split(' ~ ')[1],
      activityTagId: null,
    }))
    return { success: true, data: emptyRoutines, message: '루틴 미등록' }
  }
}

// 루틴 저장 — PUT /routines
export async function saveRoutines(routines: RoutineRequestItem[]): Promise<ApiResponse<null>> {
  await updateRoutinesApi(routines)
  return { success: true, data: null, message: '저장 성공' }
}


// 즐겨찾기
export async function getCategories(): Promise<ApiResponse<Category[]>> {
  await delay()
  return { success: true, data: [...MOCK_CATEGORIES], message: '조회 성공' }
}

export async function getPhrasesByCategory(categoryId: number): Promise<ApiResponse<Phrase[]>> {
  await delay()
  const filtered = MOCK_PHRASES.filter(p => p.categoryId === categoryId)
  return { success: true, data: filtered, message: '조회 성공' }
}

export async function getFavoritePhrases(): Promise<ApiResponse<FavoritePhrase[]>> {
  await delay()
  return { success: true, data: [...MOCK_FAVORITE_PHRASES], message: '조회 성공' }
}

export async function addFavoritePhrase(phraseId: number): Promise<ApiResponse<FavoritePhrase>> {
  await delay()
  const newFav: FavoritePhrase = { id: Date.now(), matchingId: 1, phraseId }
  return { success: true, data: newFav, message: '등록 성공' }
}

export async function removeFavoritePhrase(phraseId: number): Promise<ApiResponse<null>> {
  await delay(200)
  void phraseId
  return { success: true, data: null, message: '삭제 성공' }
}


// 여가 콘텐츠
export async function getLeisureContents(): Promise<ApiResponse<LeisureContentItem[]>> {
  const data = await getLeisureContentsApi()
  return { success: true, data, message: '조회 성공' }
}

export async function saveLeisureContent(
  item: LeisureContentRequest,
): Promise<ApiResponse<null>> {
  await createLeisureContentApi(item)
  return { success: true, data: null, message: '등록 성공' }
}

export async function updateLeisureContent(
  contentId: number,
  item: LeisureContentRequest,
): Promise<ApiResponse<null>> {
  await updateLeisureContentApi(contentId, item)
  return { success: true, data: null, message: '수정 성공' }
}

export async function deleteLeisureContent(id: number): Promise<ApiResponse<null>> {
  await deleteLeisureContentApi(id)
  return { success: true, data: null, message: '삭제 성공' }
}


// Dwell Time
export async function getDwellTimePreset(): Promise<ApiResponse<DwellTimePreset>> {
  await delay()

  return {
    success: true,
    data:
      readStoredPreset(CARE_DWELL_TIME_PRESET_STORAGE_KEY, isDwellTimePreset) ??
      MOCK_DWELL_TIME_PRESET,
    message: '조회 성공',
  }
}

export async function updateDwellTimePreset(preset: DwellTimePreset): Promise<ApiResponse<DwellTimePreset>> {
  await delay()
  writeStoredPreset(CARE_DWELL_TIME_PRESET_STORAGE_KEY, preset)

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent<CareDwellTimePresetUpdatedDetail>(CARE_DWELL_TIME_PRESET_UPDATED_EVENT, {
        detail: {
          preset,
        },
      }),
    )
  }

  return { success: true, data: preset, message: '저장 성공' }
}

// ========================
// 입력 잠금 시간
// ========================

export async function getActivationDelayPreset(): Promise<ApiResponse<ActivationDelayPreset>> {
  await delay()
  return {
    success: true,
    data:
      readStoredPreset(
        CARE_ACTIVATION_DELAY_PRESET_STORAGE_KEY,
        isActivationDelayPreset,
      ) ?? MOCK_ACTIVATION_DELAY_PRESET,
    message: '조회 성공',
  }
}

export async function updateActivationDelayPreset(preset: ActivationDelayPreset): Promise<ApiResponse<ActivationDelayPreset>> {
  await delay()
  writeStoredPreset(CARE_ACTIVATION_DELAY_PRESET_STORAGE_KEY, preset)
  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent<CareActivationDelayPresetUpdatedDetail>(
        CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
        {
          detail: {
            preset,
          },
        },
      ),
    )
  }
  return { success: true, data: preset, message: '저장 성공' }
}

// ========================
// TTS 설정
// ========================

export async function getTtsSetting(): Promise<ApiResponse<TtsSetting>> {
  await delay()
  return { success: true, data: { ...MOCK_TTS_SETTING }, message: '조회 성공' }
}

export async function updateTtsEnabled(isEnabled: boolean): Promise<ApiResponse<TtsSetting>> {
  await delay()
  return { success: true, data: { ...MOCK_TTS_SETTING, isEnabled }, message: '저장 성공' }
}

export async function getTtsVoiceFiles(): Promise<ApiResponse<TtsVoiceFile[]>> {
  await delay()
  return { success: true, data: [...MOCK_TTS_VOICE_FILES], message: '조회 성공' }
}

export async function deleteTtsVoiceFile(id: number): Promise<ApiResponse<null>> {
  await delay(200)
  void id
  return { success: true, data: null, message: '삭제 성공' }
}

export async function uploadTtsVoiceFile(file: File): Promise<ApiResponse<TtsVoiceFile>> {
  await delay(500)
  const created: TtsVoiceFile = {
    id: Date.now(),
    ttsSettingId: 1,
    fileUrl: `https://s3.example.com/tts/${file.name}`,
    fileName: file.name,
    createdAt: new Date().toISOString(),
  }
  return { success: true, data: created, message: '업로드 성공' }
}

// ========================
// 커스텀 단어
// ========================

export async function getUserWords(): Promise<ApiResponse<UserWords>> {
  await delay()
  return { success: true, data: { ...MOCK_USER_WORDS }, message: '조회 성공' }
}

export async function updateUserWords(words: UserWords): Promise<ApiResponse<UserWords>> {
  await delay()
  return { success: true, data: words, message: '저장 성공' }
}

// ========================
// 맞춤 표현
// ========================

export async function getExpressions(): Promise<ApiResponse<Expression[]>> {
  await delay()
  return { success: true, data: [...MOCK_EXPRESSIONS], message: '조회 성공' }
}

// ========================
// 소통 기록 캘린더
// ========================

export async function getDailySummaries(yearMonth: string): Promise<ApiResponse<DailySummary[]>> {
  await delay()
  void yearMonth
  return { success: true, data: [...MOCK_DAILY_SUMMARIES], message: '조회 성공' }
}

export async function getDailySummary(date: string): Promise<ApiResponse<DailySummary | null>> {
  await delay()
  const found = MOCK_DAILY_SUMMARIES.find(s => s.date === date) ?? null
  return { success: true, data: found, message: '조회 성공' }
}
