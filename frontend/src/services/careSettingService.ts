/**
 * 보호자 설정 Mock 서비스
 * API 연동 시 이 파일의 함수 내부만 교체하면 됨
 */

import type {
  PatientInfo,
  RoutineSlotWithTags,
  Category,
  Phrase,
  FavoritePhrase,
  LeisureContentItem,
  DwellTimePreset,
  ActivationDelayPreset,
  TtsSetting,
  TtsVoiceFile,
  UserWords,
  Expression,
  DailySummary,
  ApiResponse,
  TimeSlot,
  ActivityTag,
} from '../types/care'

import {
  MOCK_PATIENT_INFO,
  MOCK_TIME_SLOTS,
  MOCK_ACTIVITY_TAGS,
  MOCK_ROUTINES,
  MOCK_CATEGORIES,
  MOCK_PHRASES,
  MOCK_FAVORITE_PHRASES,
  MOCK_LEISURE_CONTENTS,
  MOCK_DWELL_TIME_PRESET,
  MOCK_ACTIVATION_DELAY_PRESET,
  MOCK_TTS_SETTING,
  MOCK_TTS_VOICE_FILES,
  MOCK_USER_WORDS,
  MOCK_EXPRESSIONS,
  MOCK_DAILY_SUMMARIES,
} from './mockCareData'

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms))

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


// 루틴
export async function getTimeSlots(): Promise<ApiResponse<TimeSlot[]>> {
  await delay()
  return { success: true, data: [...MOCK_TIME_SLOTS], message: '조회 성공' }
}

export async function getActivityTags(): Promise<ApiResponse<ActivityTag[]>> {
  await delay()
  return { success: true, data: [...MOCK_ACTIVITY_TAGS], message: '조회 성공' }
}

export async function getRoutines(): Promise<ApiResponse<RoutineSlotWithTags[]>> {
  await delay()
  return { success: true, data: MOCK_ROUTINES.map(r => ({ ...r })), message: '조회 성공' }
}

export async function updateRoutines(routines: RoutineSlotWithTags[]): Promise<ApiResponse<RoutineSlotWithTags[]>> {
  await delay()
  return { success: true, data: routines, message: '저장 성공' }
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
  await delay()
  return { success: true, data: [...MOCK_LEISURE_CONTENTS], message: '조회 성공' }
}

export async function saveLeisureContent(item: Omit<LeisureContentItem, 'id' | 'matchingId'>): Promise<ApiResponse<LeisureContentItem>> {
  await delay()
  const created: LeisureContentItem = { id: Date.now(), matchingId: 1, ...item }
  return { success: true, data: created, message: '등록 성공' }
}

export async function deleteLeisureContent(id: number): Promise<ApiResponse<null>> {
  await delay(200)
  void id
  return { success: true, data: null, message: '삭제 성공' }
}


// Dwell Time
export async function getDwellTimePreset(): Promise<ApiResponse<DwellTimePreset>> {
  await delay()
  return { success: true, data: MOCK_DWELL_TIME_PRESET, message: '조회 성공' }
}

export async function updateDwellTimePreset(preset: DwellTimePreset): Promise<ApiResponse<DwellTimePreset>> {
  await delay()
  return { success: true, data: preset, message: '저장 성공' }
}

// ========================
// 입력 잠금 시간
// ========================

export async function getActivationDelayPreset(): Promise<ApiResponse<ActivationDelayPreset>> {
  await delay()
  return { success: true, data: MOCK_ACTIVATION_DELAY_PRESET, message: '조회 성공' }
}

export async function updateActivationDelayPreset(preset: ActivationDelayPreset): Promise<ApiResponse<ActivationDelayPreset>> {
  await delay()
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
