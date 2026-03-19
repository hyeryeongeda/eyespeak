import type {
  ComposeStep,
  CustomCategoryKey,
  CustomTalkContextSummary,
  CustomTalkDraft,
} from '../../features/patient/talk/types/customTalk'
import {
  CUSTOM_COMPOSE_STEP_ORDER,
  CUSTOM_COMPOSE_WORD_POOL,
} from '../../mocks/customTalk/customComposeWords.mock'
import { CUSTOM_TALK_CONTEXT_MOCK } from '../../mocks/customTalk/customContext.mock'
import {
  CUSTOM_TALK_CATEGORY_POOL,
  CUSTOM_TALK_FALLBACK_CATEGORY_KEYS,
} from '../../mocks/customTalk/customCategoryPool.mock'
import {
  CUSTOM_RECOMMENDED_SENTENCE_FALLBACK,
  CUSTOM_RECOMMENDED_SENTENCES,
} from '../../mocks/customTalk/customRecommendedSentences.mock'
import { generateCustomSentences } from '../../utils/customTalk/generateCustomSentences'

const DEFAULT_DELAY_MS = 220
let mockSequence = 0

function delay(ms = DEFAULT_DELAY_MS) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })
}

function nextMockId(prefix: string) {
  mockSequence += 1
  return `${prefix}-${mockSequence}`
}

export async function fetchCustomTalkContext(
  override?: Partial<CustomTalkContextSummary>,
): Promise<CustomTalkContextSummary> {
  await delay()

  return {
    ...CUSTOM_TALK_CONTEXT_MOCK,
    ...override,
    recentMessages: override?.recentMessages ?? CUSTOM_TALK_CONTEXT_MOCK.recentMessages,
    frequentExpressions:
      override?.frequentExpressions ?? CUSTOM_TALK_CONTEXT_MOCK.frequentExpressions,
    recentUsedExpressions:
      override?.recentUsedExpressions ?? CUSTOM_TALK_CONTEXT_MOCK.recentUsedExpressions,
  }
}

export async function fetchVisibleCustomCategories(input: {
  refreshCount: number
  shouldFail?: boolean
  context: CustomTalkContextSummary | null
}) {
  await delay()

  if (input.shouldFail) {
    throw new Error('추천 카테고리를 불러오지 못했습니다. 다시 시도하거나 키보드로 이동하세요.')
  }

  const poolKeys = CUSTOM_TALK_CATEGORY_POOL.map(item => item.key)
  const rotation = input.refreshCount % poolKeys.length
  const rotated = [...poolKeys.slice(rotation), ...poolKeys.slice(0, rotation)]
  const visible = rotated.slice(0, 3)

  if (visible.length > 0) {
    return visible
  }

  // TODO: todayData 미존재 시 fallback 우선순위 정책 확정
  return CUSTOM_TALK_FALLBACK_CATEGORY_KEYS
}

export async function fetchRecommendedCustomSentences(input: {
  categoryKey: CustomCategoryKey
  shouldFail?: boolean
}) {
  await delay()

  if (input.shouldFail) {
    throw new Error('추천 문장을 불러오지 못했습니다. 단어 조합으로 우회할 수 있습니다.')
  }

  const base = CUSTOM_RECOMMENDED_SENTENCES[input.categoryKey] ?? []
  const merged = [...base, ...CUSTOM_RECOMMENDED_SENTENCE_FALLBACK]

  return [...new Set(merged)].slice(0, 3)
}

export async function fetchComposeWords(input: {
  categoryKey?: CustomCategoryKey
  step: ComposeStep
  refreshCount: number
  shouldFail?: boolean
}) {
  await delay()

  if (input.shouldFail) {
    throw new Error('현재 단계 추천 단어를 불러오지 못했습니다. 재시도하거나 건너뛸 수 있습니다.')
  }

  const categoryWords =
    (input.categoryKey ? CUSTOM_COMPOSE_WORD_POOL[input.categoryKey] : null) ??
    CUSTOM_COMPOSE_WORD_POOL.default
  const pool = categoryWords[input.step] ?? CUSTOM_COMPOSE_WORD_POOL.default[input.step]
  const rotation = input.refreshCount % Math.max(pool.length, 1)
  const rotated = [...pool.slice(rotation), ...pool.slice(0, rotation)]
  const nextOptions = rotated.slice(0, 3)

  return nextOptions.length > 0
    ? nextOptions
    : CUSTOM_COMPOSE_WORD_POOL.default[input.step].slice(0, 3)
}

export async function saveComposeSelection(input: {
  step: ComposeStep
  value: string
  shouldFail?: boolean
}) {
  await delay(160)

  if (input.shouldFail) {
    throw new Error('선택 내용을 저장하지 못했습니다. 같은 단계에서 다시 시도해 주세요.')
  }

  return {
    success: true,
    id: nextMockId(`compose-${input.step}`),
  }
}

export async function fetchGeneratedCustomSentences(input: {
  draft: CustomTalkDraft
  shouldFail?: boolean
}) {
  await delay()

  if (input.shouldFail) {
    throw new Error('생성 문장 추천에 실패했습니다. 키보드 입력으로 우회할 수 있습니다.')
  }

  const candidates = generateCustomSentences(input.draft)

  if (candidates.length === 0) {
    return [
      '조금 더 천천히 이야기해 주세요.',
      '지금은 직접 입력으로 말하고 싶어요.',
      '지금은 설명이 더 필요해요.',
    ]
  }

  const fallback = [
    '지금은 조금 더 설명이 필요해요.',
    '조금만 도와주세요.',
    '천천히 다시 말해 주세요.',
  ]

  return [...new Set([...candidates, ...fallback])].slice(0, 3)
}

export async function initializeCustomTalkKeyboard(input: { shouldFail?: boolean }) {
  await delay()

  if (input.shouldFail) {
    throw new Error('키보드 입력 화면을 초기화하지 못했습니다. 다시 열어 주세요.')
  }

  return {
    success: true,
  }
}

export async function submitCustomTalkUtterance(input: {
  text: string
  shouldFail?: boolean
  source: 'recommended' | 'generated' | 'manual'
}) {
  await delay(260)

  if (input.shouldFail) {
    throw new Error('발화를 반영하지 못했습니다. 입력 내용은 유지되며 다시 시도할 수 있습니다.')
  }

  return {
    success: true,
    id: nextMockId(`utterance-${input.source}`),
    submittedAt: new Date().toISOString(),
  }
}

export function getNextComposeStep(step: ComposeStep) {
  const currentIndex = CUSTOM_COMPOSE_STEP_ORDER.indexOf(step)
  const nextStep = CUSTOM_COMPOSE_STEP_ORDER[currentIndex + 1]

  return nextStep ?? null
}

export function getPreviousComposeStep(step: ComposeStep) {
  const currentIndex = CUSTOM_COMPOSE_STEP_ORDER.indexOf(step)
  const previousStep = CUSTOM_COMPOSE_STEP_ORDER[currentIndex - 1]

  return previousStep ?? null
}
