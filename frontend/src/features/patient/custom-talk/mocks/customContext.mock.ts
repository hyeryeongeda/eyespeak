import type { CustomTalkContextSummary } from '../types'

export const CUSTOM_TALK_CONTEXT_MOCK: CustomTalkContextSummary = {
  guardianMessage: '오늘 컨디션은 어때?',
  recentMessages: [
    '보호자: 점심은 괜찮았어?',
    '환자: 조금만 먹고 싶어요.',
    '보호자: 자세는 불편하지 않아?',
  ],
  todayMood: '조금 피곤해요',
  todaySchedule: '오후 3시 재활 운동',
  frequentExpressions: ['잠깐 쉬고 싶어요', '물을 조금만 주세요', '자세가 불편해요'],
  recentUsedExpressions: ['조금만 도와주세요', '지금은 괜찮아요'],
}
