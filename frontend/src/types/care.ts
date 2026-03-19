// 채팅
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
export type TtsStatus = 'NONE' | 'TRAINING' | 'READY' | 'FAILED'
export type MoodType = 'SAD' | 'HAPPY' | 'CALM' | 'JOYFUL' | 'ANXIOUS' | 'ANGRY' | 'TIRED'
export type SentimentType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'


// 환자 기본 정보 (GENERAL-001)
export interface PatientInfo {
  id: number
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

export interface RoutineSlotTag {
  id: number
  matchingId: number
  timeSlotId: number
  activityTagId: number
}

export interface RoutineSlotWithTags {
  timeSlot: TimeSlot
  selectedTagIds: number[]
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
  matchingId: number
  position: number
  name: string
  url: string | null
  category: string | null
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


// TTS 설정
export interface TtsSetting {
  id: number
  matchingId: number
  isEnabled: boolean
  status: TtsStatus
}

export interface TtsVoiceFile {
  id: number
  ttsSettingId: number
  fileUrl: string
  fileName: string
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


// 소통 기록 캘린더 
export interface DailyMood {
  id: number
  matchingId: number
  moodDate: string
  moodType: MoodType
  moodLevel: number
}

export interface DailySummary {
  date: string
  totalExpressions: number
  hasSos: boolean
  topPhrases: { content: string; count: number }[]
  normalCallCount: number
  sosCallCount: number
  mood: { type: MoodType; level: number } | null
}


// 커스텀 단어
export interface UserWords {
  matchingId: number
  subjects: string[]
  objects: string[]
  verbs: string[]
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
