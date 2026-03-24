// 채팅
import type { LeisureCategoryId } from './leisure'

export type ChatMessageSender = 'guardian' | 'patient'

export interface ChatMessage {
  id: string
  sender: ChatMessageSender
  text: string
  timestamp: Date
}

export type SttState = 'idle' | 'recording' | 'done'


// Enum (ERD 기준)
export type Gender = 'M' | 'F'
export type MatchingStatus = 'PENDING' | 'LINKED' | 'UNLINKED'
export type ContentType = 'TEXT' | 'PHRASE' | 'EXPRESSION'
export type CallType = 'NORMAL' | 'SOS'
export type CallStatus = 'PENDING' | 'RECEIVED' | 'MISSED'
export type TtsStatus = 'NONE' | 'READY'
export type MoodType = 'SAD' | 'HAPPY' | 'CALM' | 'JOYFUL' | 'ANXIOUS' | 'ANGRY' | 'TIRED'
export type SentimentType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'


// 환자 기본 정보 (GENERAL-001)
export interface PatientInfo {
  patientId: number
  name: string
  birthYear: number
  age: number
  gender: Gender
}

export interface PatientInfoUpdateRequest {
  name: string
  birthYear: number
  gender: Gender
}


// 루틴 (ROUTINE-001)
export interface TimeSlot {
  id: number
  name: string
  startTime: string
  endTime: string
}

export interface ActivityTag {
  id: number
  name: string
  orderIndex: number
}

// 백엔드 GET /routines 응답 항목
export interface RoutineResponseItem {
  timeSlotId: number
  timeSlotName: string
  startTime: string
  endTime: string
  activityTagId: number
  activityTagName: string
}

// 백엔드 PUT/POST /routines 요청 항목
export interface RoutineRequestItem {
  timeSlotId: number
  activityTagId: number
}

// 프론트엔드 UI 상태 (시간대별 선택된 태그 1개)
export interface RoutineSlotState {
  timeSlotId: number
  timeSlotName: string
  startTime: string
  endTime: string
  activityTagId: number | null
}


// 즐겨찾기
export interface Category {
  id: number
  parentId: number | null
  name: string
  depth: number
  orderIndex: number
}

export interface Phrase {
  id: number
  categoryId: number
  content: string
  orderIndex: number
}

export interface FavoritePhrase {
  id: number
  matchingId: number
  phraseId: number
}


// 여가 콘텐츠
export interface LeisureContentItem {
  id: number
  matchingId?: number
  position?: number
  name: string
  url: string | null
  category: LeisureCategoryId | null
  categoryName?: string | null
}


// 기기 설정 — Dwell Time
export type DwellTimePreset = 'default' | 'short'

export interface DwellTimeSetting {
  preset: DwellTimePreset
  value: number // ms
}

export const DWELL_TIME_OPTIONS: Record<DwellTimePreset, DwellTimeSetting> = {
  default: { preset: 'default', value: 1000 },
  short: { preset: 'short', value: 600 },
}

// Dwell Time API DTO
export interface DwellTimeResponseDto {
  dwellTime: number
  label: string
}

export interface DwellTimeRequestDto {
  dwellTime: number
}

// ms → preset 역매핑
export const DWELL_TIME_MS_TO_PRESET: Record<number, DwellTimePreset> = {
  1000: 'default',
  600: 'short',
}


// 기기 설정 — 입력 잠금 시간
export type ActivationDelayPreset = 'none' | 'short' | 'medium' | 'long'

export interface ActivationDelaySetting {
  preset: ActivationDelayPreset
  value: number // ms
}

export const ACTIVATION_DELAY_OPTIONS: Record<ActivationDelayPreset, ActivationDelaySetting> = {
  none: { preset: 'none', value: 0 },
  short: { preset: 'short', value: 600 },
  medium: { preset: 'medium', value: 1000 },
  long: { preset: 'long', value: 1600 },
}

// Activation Delay API DTO
export interface ActivationDelayResponseDto {
  activationDelay: number
  label: string
}

export interface ActivationDelayRequestDto {
  activationDelay: number
}

// ms → preset 역매핑
export const ACTIVATION_DELAY_MS_TO_PRESET: Record<number, ActivationDelayPreset> = {
  0: 'none',
  600: 'short',
  1000: 'medium',
  1600: 'long',
}


// TTS 설정
export interface TtsSettingsResponse {
  isEnabled: boolean
  status: TtsStatus
  voiceFiles: TtsVoiceFile[]
}

export interface TtsVoiceFile {
  id: number
  fileName: string
  fileUrl: string
  createdAt: string
}


// 호출
export interface Call {
  id: number
  matchingId: number
  type: CallType
  status: CallStatus
  createdAt: string
}


// 소통 기록 캘린더 — 월간 (GET /communication-records/monthly)
export interface MonthlyRecordDay {
  date: string
  totalCount: number
  hasSos: boolean
}

export interface MonthlyRecordResponse {
  year: number
  month: number
  days: MonthlyRecordDay[]
}

// 소통 기록 캘린더 — 날짜별 상세 (GET /communication-records/daily)
export interface DailyRecordTopExpression {
  rank: number
  content: string
  count: number
}

export interface DailyRecordResponse {
  date: string
  totalExpressionCount: number
  topExpressions: DailyRecordTopExpression[]
  normalCallCount: number
  sosCallCount: number
}



// 맞춤 표현
export interface Expression {
  id: number
  matchingId: number
  content: string
  sentiment: SentimentType | null
  category: string | null
  lastUsed: string | null
  createdAt: string
}


// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}
