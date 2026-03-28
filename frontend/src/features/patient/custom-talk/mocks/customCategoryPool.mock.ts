import type {
  CustomCategoryKey,
  CustomTalkCategoryOption,
} from '../types'

export const CUSTOM_TALK_CATEGORY_POOL: CustomTalkCategoryOption[] = [
  {
    key: 'mood',
    title: '오늘의 기분',
    description: '현재 기분과 몸 상태를 짧게 표현합니다.',
    hint: '컨디션, 감정, 통증',
  },
  {
    key: 'schedule',
    title: '오늘 일정',
    description: '오늘 해야 할 일이나 다음 일정을 말합니다.',
    hint: '재활, 식사, 휴식',
  },
  {
    key: 'frequent',
    title: '자주 쓴 표현',
    description: '자주 쓰는 요청이나 반복 표현을 빠르게 고릅니다.',
    hint: '물, 자세, 도움 요청',
  },
  {
    key: 'recent',
    title: '직전 사용',
    description: '최근 사용한 표현 흐름을 다시 이어갑니다.',
    hint: '방금 전 대화 이어가기',
  },
]

export const CUSTOM_TALK_FALLBACK_CATEGORY_KEYS: CustomCategoryKey[] = [
  'mood',
  'schedule',
  'frequent',
]
