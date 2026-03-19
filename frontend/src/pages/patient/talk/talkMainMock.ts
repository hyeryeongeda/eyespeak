/** 대화하기 메인 화면 목업 메시지 (PAT-TALK-001) */

export type MockMessageRole = 'guardian' | 'patient'

export interface MockMessage {
  id: string
  role: MockMessageRole
  text: string
}

export const TALK_MAIN_MOCK_MESSAGES: MockMessage[] = [
  { id: '1', role: 'guardian', text: '점심은 뭐 먹고 싶어요?' },
  { id: '2', role: 'patient', text: '좋아요 / 국수 먹고 싶어요' },
  { id: '3', role: 'guardian', text: '산책 나갈까요?' },
  { id: '4', role: 'guardian', text: '듣고 있어요' },
]

export const TALK_MAIN_STATUS_LABEL = {
  NONE: '현재 선택: 없음',
} as const
