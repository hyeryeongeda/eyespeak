/**
 * 보호자 설정 Mock 데이터
 * docs/mock-data.md 기준, matching_id=1 (김보호 ↔ 이환자) 컨텍스트
 */

import type {
  PatientInfo,
  Category,
  Phrase,
  FavoritePhrase,
  LeisureContentItem,
  DwellTimePreset,
  ActivationDelayPreset,
  TtsSetting,
  TtsVoiceFile,
  Call,
  DailySummary,
  UserWords,
  Expression,
  DailyMood,
} from '../types/care'

// ========================
// 환자 기본 정보
// ========================

export const MOCK_PATIENT_INFO: PatientInfo = {
  id: 1,
  name: '이환자',
  birthYear: 1965,
  gender: 'M',
}

// ========================
// 즐겨찾기 — 시드 데이터
// ========================

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, parentId: null, name: '석션 (가래/침)', depth: 0, orderIndex: 0 },
  { id: 2, parentId: null, name: '호흡', depth: 0, orderIndex: 1 },
  { id: 3, parentId: null, name: '통증', depth: 0, orderIndex: 2 },
  { id: 4, parentId: null, name: '자세', depth: 0, orderIndex: 3 },
  { id: 5, parentId: null, name: '체온/환경', depth: 0, orderIndex: 4 },
  { id: 6, parentId: null, name: '구강/식사', depth: 0, orderIndex: 5 },
  { id: 7, parentId: null, name: '배변/배뇨', depth: 0, orderIndex: 6 },
  { id: 8, parentId: null, name: '수면/피로', depth: 0, orderIndex: 7 },
  { id: 9, parentId: null, name: '감정/심리', depth: 0, orderIndex: 8 },
  { id: 10, parentId: null, name: '의료기기', depth: 0, orderIndex: 9 },
  { id: 11, parentId: null, name: '피부/위생/여가', depth: 0, orderIndex: 10 },
]

export const MOCK_PHRASES: Phrase[] = [
  // 1. 석션
  { id: 1, categoryId: 1, content: '가래 빼줘', orderIndex: 0 },
  { id: 2, categoryId: 1, content: '침 빼줘', orderIndex: 1 },
  { id: 3, categoryId: 1, content: '더 해줘', orderIndex: 2 },
  { id: 4, categoryId: 1, content: '끈적해/안나와', orderIndex: 3 },
  { id: 5, categoryId: 1, content: '그만/됐어', orderIndex: 4 },
  { id: 6, categoryId: 1, content: '침 흘러', orderIndex: 5 },
  { id: 7, categoryId: 1, content: '기침유발기 해줘', orderIndex: 6 },
  // 2. 호흡
  { id: 8, categoryId: 2, content: '호흡기 불편해', orderIndex: 0 },
  { id: 9, categoryId: 2, content: '공기 더 넣어줘', orderIndex: 1 },
  { id: 10, categoryId: 2, content: '가슴이 아파', orderIndex: 2 },
  { id: 11, categoryId: 2, content: '산소포화도 확인해줘', orderIndex: 3 },
  { id: 12, categoryId: 2, content: '숨쉬기 편해졌어', orderIndex: 4 },
  { id: 13, categoryId: 2, content: '공기 줄여줘', orderIndex: 5 },
  { id: 14, categoryId: 2, content: '호흡기 이상해', orderIndex: 6 },
  // 3. 통증
  { id: 15, categoryId: 3, content: '뻣뻣해/굳었어', orderIndex: 0 },
  { id: 16, categoryId: 3, content: '저려/감각없어', orderIndex: 1 },
  { id: 17, categoryId: 3, content: '주물러줘', orderIndex: 2 },
  { id: 18, categoryId: 3, content: '뜨거워', orderIndex: 3 },
  { id: 19, categoryId: 3, content: '쥐났어/근육떨려', orderIndex: 4 },
  { id: 20, categoryId: 3, content: '관절운동해줘', orderIndex: 5 },
  { id: 21, categoryId: 3, content: '붓었어', orderIndex: 6 },
  // 4. 자세
  { id: 22, categoryId: 4, content: '왼쪽으로 돌려줘', orderIndex: 0 },
  { id: 23, categoryId: 4, content: '오른쪽으로 돌려줘', orderIndex: 1 },
  { id: 24, categoryId: 4, content: '머리(등) 높여/낮춰줘', orderIndex: 2 },
  { id: 25, categoryId: 4, content: '앉히줘', orderIndex: 3 },
  { id: 26, categoryId: 4, content: '기다려/잠깐', orderIndex: 4 },
  { id: 27, categoryId: 4, content: '눕히줘', orderIndex: 5 },
  { id: 28, categoryId: 4, content: '베개 조절해줘', orderIndex: 6 },
  { id: 29, categoryId: 4, content: '다리(팔) 올려줘', orderIndex: 7 },
  // 5. 체온/환경
  { id: 30, categoryId: 5, content: '더워', orderIndex: 0 },
  { id: 31, categoryId: 5, content: '추워', orderIndex: 1 },
  { id: 32, categoryId: 5, content: '땀 닦아줘', orderIndex: 2 },
  { id: 33, categoryId: 5, content: '이불 덮어줘/벗겨줘', orderIndex: 3 },
  { id: 34, categoryId: 5, content: '바람 쐬고 싶어', orderIndex: 4 },
  { id: 35, categoryId: 5, content: '환기해줘', orderIndex: 5 },
  { id: 36, categoryId: 5, content: '에어컨/히터', orderIndex: 6 },
  // 6. 구강/식사
  { id: 37, categoryId: 6, content: '입 안 적셔줘', orderIndex: 0 },
  { id: 38, categoryId: 6, content: '경관식 멈춰줘', orderIndex: 1 },
  { id: 39, categoryId: 6, content: '토할 것 같아', orderIndex: 2 },
  { id: 40, categoryId: 6, content: '경관식 속도 줄여줘', orderIndex: 3 },
  { id: 41, categoryId: 6, content: '배 불러/그만', orderIndex: 4 },
  { id: 42, categoryId: 6, content: '배 고파', orderIndex: 5 },
  { id: 43, categoryId: 6, content: '입술 발라줘', orderIndex: 6 },
  { id: 44, categoryId: 6, content: '물 적셔줘', orderIndex: 7 },
  // 7. 배변/배뇨
  { id: 45, categoryId: 7, content: '소변 마려워', orderIndex: 0 },
  { id: 46, categoryId: 7, content: '기저귀 갈아줘', orderIndex: 1 },
  { id: 47, categoryId: 7, content: '변비야', orderIndex: 2 },
  { id: 48, categoryId: 7, content: '가스 찼어', orderIndex: 3 },
  { id: 49, categoryId: 7, content: '소변줄 불편해', orderIndex: 4 },
  // 8. 수면/피로
  { id: 50, categoryId: 8, content: '잠이 안 와', orderIndex: 0 },
  { id: 51, categoryId: 8, content: '머리 아파', orderIndex: 1 },
  { id: 52, categoryId: 8, content: '불 꺼줘/켜줘', orderIndex: 2 },
  { id: 53, categoryId: 8, content: '조용히 해줘', orderIndex: 3 },
  { id: 54, categoryId: 8, content: '졸려', orderIndex: 4 },
  // 9. 감정/심리
  { id: 55, categoryId: 9, content: '무서워/불안해', orderIndex: 0 },
  { id: 56, categoryId: 9, content: '답답해', orderIndex: 1 },
  { id: 57, categoryId: 9, content: '괜찮아/좋아', orderIndex: 2 },
  { id: 58, categoryId: 9, content: '고마워', orderIndex: 3 },
  { id: 59, categoryId: 9, content: '가족 보고 싶어', orderIndex: 4 },
  { id: 60, categoryId: 9, content: '외로워/심심해', orderIndex: 5 },
  { id: 61, categoryId: 9, content: '울고 싶어', orderIndex: 6 },
  { id: 62, categoryId: 9, content: '사랑해', orderIndex: 7 },
  // 10. 의료기기
  { id: 63, categoryId: 10, content: '호흡기 이상해', orderIndex: 0 },
  { id: 64, categoryId: 10, content: '산소포화도 확인해줘', orderIndex: 1 },
  { id: 65, categoryId: 10, content: '목관(기관) 주변 불편해', orderIndex: 2 },
  { id: 66, categoryId: 10, content: '위루관 주변 아파', orderIndex: 3 },
  { id: 67, categoryId: 10, content: '약 줘', orderIndex: 4 },
  // 11. 피부/위생/여가
  { id: 68, categoryId: 11, content: '가려워', orderIndex: 0 },
  { id: 69, categoryId: 11, content: '닦아줘/씻어줘', orderIndex: 1 },
  { id: 70, categoryId: 11, content: '눈 닦아줘', orderIndex: 2 },
  { id: 71, categoryId: 11, content: '피부 쓸려/따가워', orderIndex: 3 },
  { id: 72, categoryId: 11, content: '입술 발라줘', orderIndex: 4 },
  { id: 73, categoryId: 11, content: '코 풀어줘', orderIndex: 5 },
  { id: 74, categoryId: 11, content: 'TV 틀어줘', orderIndex: 6 },
  { id: 75, categoryId: 11, content: '음악 틀어줘', orderIndex: 7 },
  { id: 76, categoryId: 11, content: '시간 몇 시야?', orderIndex: 8 },
  { id: 77, categoryId: 11, content: '밖에 나가고 싶어', orderIndex: 9 },
]

export const MOCK_FAVORITE_PHRASES: FavoritePhrase[] = [
  { id: 1, matchingId: 1, phraseId: 1 },
  { id: 2, matchingId: 1, phraseId: 8 },
  { id: 3, matchingId: 1, phraseId: 58 },
  { id: 4, matchingId: 1, phraseId: 22 },
  { id: 5, matchingId: 1, phraseId: 37 },
]

// ========================
// 여가 콘텐츠
// ========================

export const MOCK_LEISURE_CONTENTS: LeisureContentItem[] = [
  { id: 1, matchingId: 1, position: 0, name: 'KBS 뉴스 라이브', url: 'https://youtube.com/watch?v=mock001', category: 'news' },
  { id: 2, matchingId: 1, position: 1, name: '클래식 음악 모음', url: 'https://youtube.com/watch?v=mock002', category: 'music' },
  { id: 3, matchingId: 1, position: 2, name: '프로야구 하이라이트', url: 'https://youtube.com/watch?v=mock003', category: 'sports' },
  { id: 4, matchingId: 1, position: 3, name: '라디오 낭독', url: null, category: 'audiobook' },
]

// ========================
// 기기 설정
// ========================

export const MOCK_DWELL_TIME_PRESET: DwellTimePreset = 'default'
export const MOCK_ACTIVATION_DELAY_PRESET: ActivationDelayPreset = 'medium'

// ========================
// TTS 설정
// ========================

export const MOCK_TTS_SETTING: TtsSetting = {
  id: 1,
  matchingId: 1,
  isEnabled: true,
  status: 'READY',
}

export const MOCK_TTS_VOICE_FILES: TtsVoiceFile[] = [
  { id: 1, ttsSettingId: 1, fileUrl: 'https://s3.example.com/tts/voice_001.wav', fileName: '이환자_음성샘플_01.wav', createdAt: '2026-02-20T10:00:00' },
  { id: 2, ttsSettingId: 1, fileUrl: 'https://s3.example.com/tts/voice_002.wav', fileName: '이환자_음성샘플_02.wav', createdAt: '2026-02-20T10:05:00' },
  { id: 3, ttsSettingId: 1, fileUrl: 'https://s3.example.com/tts/voice_003.wav', fileName: '이환자_음성샘플_03.wav', createdAt: '2026-02-20T10:10:00' },
]

// ========================
// 호출 기록
// ========================

export const MOCK_CALLS: Call[] = [
  { id: 1, matchingId: 1, type: 'NORMAL', status: 'RECEIVED', createdAt: '2026-03-17T08:00:00' },
  { id: 2, matchingId: 1, type: 'NORMAL', status: 'RECEIVED', createdAt: '2026-03-17T12:00:00' },
  { id: 3, matchingId: 1, type: 'SOS', status: 'RECEIVED', createdAt: '2026-03-17T23:30:00' },
  { id: 4, matchingId: 1, type: 'NORMAL', status: 'MISSED', createdAt: '2026-03-18T03:00:00' },
  { id: 5, matchingId: 1, type: 'NORMAL', status: 'RECEIVED', createdAt: '2026-03-18T09:00:00' },
  { id: 6, matchingId: 1, type: 'SOS', status: 'PENDING', createdAt: '2026-03-19T10:00:00' },
]

// ========================
// 소통 기록 캘린더
// ========================

export const MOCK_DAILY_MOODS: DailyMood[] = [
  { id: 1, matchingId: 1, moodDate: '2026-03-15', moodType: 'HAPPY', moodLevel: 4, createdAt: '2026-03-15T07:30:00' },
  { id: 2, matchingId: 1, moodDate: '2026-03-16', moodType: 'TIRED', moodLevel: 3, createdAt: '2026-03-16T08:00:00' },
  { id: 3, matchingId: 1, moodDate: '2026-03-17', moodType: 'CALM', moodLevel: 3, createdAt: '2026-03-17T07:45:00' },
  { id: 4, matchingId: 1, moodDate: '2026-03-18', moodType: 'ANXIOUS', moodLevel: 4, createdAt: '2026-03-18T08:10:00' },
  { id: 5, matchingId: 1, moodDate: '2026-03-19', moodType: 'JOYFUL', moodLevel: 5, createdAt: '2026-03-19T07:30:00' },
]

export const MOCK_DAILY_SUMMARIES: DailySummary[] = [
  {
    date: '2026-03-17',
    totalExpressions: 18,
    hasSos: true,
    topPhrases: [
      { content: '물을 마시고 싶어요', count: 4 },
      { content: '자세를 바꿔주세요', count: 3 },
      { content: '기분이 좋아요', count: 2 },
    ],
    normalCallCount: 2,
    sosCallCount: 1,
    mood: { type: 'CALM', level: 3 },
  },
  {
    date: '2026-03-18',
    totalExpressions: 24,
    hasSos: false,
    topPhrases: [
      { content: '머리가 아파요', count: 3 },
      { content: '물을 마시고 싶어요', count: 3 },
      { content: '고마워', count: 2 },
      { content: '음악 틀어줘', count: 2 },
    ],
    normalCallCount: 2,
    sosCallCount: 0,
    mood: { type: 'ANXIOUS', level: 4 },
  },
  {
    date: '2026-03-19',
    totalExpressions: 12,
    hasSos: true,
    topPhrases: [
      { content: '기분이 좋아요', count: 3 },
      { content: '음악 틀어줘', count: 2 },
    ],
    normalCallCount: 0,
    sosCallCount: 1,
    mood: { type: 'JOYFUL', level: 5 },
  },
]

// ========================
// 커스텀 단어
// ========================

export const MOCK_USER_WORDS: UserWords = {
  matchingId: 1,
  subjects: ['나', '우리', '아들'],
  objects: ['물', '밥', '약', '음악', '텔레비전'],
  verbs: ['먹다', '마시다', '듣다', '보다', '가다', '자다'],
}

// ========================
// 맞춤 표현
// ========================

export const MOCK_EXPRESSIONS: Expression[] = [
  { id: 1, matchingId: 1, content: '오늘 날씨가 좋으니 산책 가고 싶어', sentiment: 'POSITIVE', category: '욕구', lastUsed: '2026-03-18T10:30:00', createdAt: '2026-03-10T10:00:00' },
  { id: 2, matchingId: 1, content: '허리가 너무 아파서 잠을 못 자겠어', sentiment: 'NEGATIVE', category: '통증', lastUsed: '2026-03-16T22:00:00', createdAt: '2026-03-05T14:00:00' },
  { id: 3, matchingId: 1, content: '오늘은 음악 듣고 싶어', sentiment: 'POSITIVE', category: '욕구', lastUsed: '2026-03-19T08:30:00', createdAt: '2026-03-12T09:00:00' },
  { id: 4, matchingId: 1, content: '가족들 보고 싶어', sentiment: 'NEUTRAL', category: '감정', lastUsed: '2026-03-15T11:00:00', createdAt: '2026-03-08T10:00:00' },
  { id: 5, matchingId: 1, content: '오늘 약 먹었어?', sentiment: 'NEUTRAL', category: '일상', lastUsed: null, createdAt: '2026-03-18T08:00:00' },
]
