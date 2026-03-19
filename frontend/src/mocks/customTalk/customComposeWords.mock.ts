import type {
  ComposeStep,
  CustomCategoryKey,
} from '../../features/patient/talk/types/customTalk'

export const CUSTOM_COMPOSE_STEP_ORDER: ComposeStep[] = [
  'subject',
  'object',
  'predicate',
  'punctuation',
]

export const CUSTOM_COMPOSE_PUNCTUATION_OPTIONS = ['.', '!', '?', ''] as const

const defaultComposeWords: Record<ComposeStep, string[]> = {
  subject: ['저는', '지금은', '오늘은', '몸이', '기분이'],
  object: ['물이', '휴식이', '자세가', '호흡이', '대화가', '설명이'],
  predicate: ['필요해요', '불편해요', '괜찮아요', '도와주세요', '궁금해요', '좋겠어요'],
  punctuation: [...CUSTOM_COMPOSE_PUNCTUATION_OPTIONS],
}

export const CUSTOM_COMPOSE_WORD_POOL: Record<
  CustomCategoryKey | 'default',
  Record<ComposeStep, string[]>
> = {
  default: defaultComposeWords,
  mood: {
    subject: ['지금은', '오늘은', '기분이', '몸이', '저는'],
    object: ['통증이', '컨디션이', '기분이', '휴식이', '호흡이'],
    predicate: ['불편해요', '괜찮아요', '좋지 않아요', '필요해요', '걱정돼요'],
    punctuation: [...CUSTOM_COMPOSE_PUNCTUATION_OPTIONS],
  },
  schedule: {
    subject: ['오늘은', '지금은', '다음 일정은', '재활 전에', '식사 후에는'],
    object: ['쉬는 시간이', '설명이', '일정 확인이', '준비가', '도움이'],
    predicate: ['필요해요', '좋겠어요', '가능할까요', '궁금해요', '도와주세요'],
    punctuation: [...CUSTOM_COMPOSE_PUNCTUATION_OPTIONS],
  },
  frequent: {
    subject: ['지금은', '저는', '조금만', '먼저', '자주'],
    object: ['물이', '자세가', '도움이', '휴식이', '설명이'],
    predicate: ['필요해요', '도와주세요', '불편해요', '좋겠어요', '부탁해요'],
    punctuation: [...CUSTOM_COMPOSE_PUNCTUATION_OPTIONS],
  },
  recent: {
    subject: ['아까처럼', '방금처럼', '지금도', '저는', '오늘은'],
    object: ['그 말이', '그 도움이', '같은 설명이', '비슷한 도움이', '대화가'],
    predicate: ['필요해요', '좋겠어요', '도와주세요', '불편해요', '괜찮아요'],
    punctuation: [...CUSTOM_COMPOSE_PUNCTUATION_OPTIONS],
  },
}
