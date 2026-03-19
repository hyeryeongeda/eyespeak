import type { CustomCategoryKey } from '../types'

export const CUSTOM_RECOMMENDED_SENTENCES: Record<CustomCategoryKey, string[]> = {
  mood: [
    '지금은 조금 피곤해요.',
    '몸이 조금 불편해요.',
    '지금은 괜찮아요.',
  ],
  schedule: [
    '오늘 일정이 궁금해요.',
    '잠깐 쉬고 나서 할게요.',
    '재활 전에 조금 쉬고 싶어요.',
  ],
  frequent: [
    '물을 조금만 주세요.',
    '자세를 바꿔 주세요.',
    '잠깐만 도와주세요.',
  ],
  recent: [
    '아까 말한 것처럼 조금 불편해요.',
    '방금 이야기한 걸 다시 도와주세요.',
    '직전 상태와 비슷해요.',
  ],
}

export const CUSTOM_RECOMMENDED_SENTENCE_FALLBACK = [
  '지금은 조금 쉬고 싶어요.',
  '천천히 다시 말해 주세요.',
  '조금만 도와주세요.',
]
