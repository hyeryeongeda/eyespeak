import {
  ROUTE_PATHS,
  getPatientBodyMindCategoryDetailPath,
} from '../../../app/router/routePaths'
import type {
  BodyMindCardOption,
  BodyMindCategoryKey,
  BodyMindMainCardOption,
  BodyMindMainKey,
  BreathingOptionKey,
  PainAreaGroup,
  PainAreaKey,
  PainDetailKey,
  SecretionOptionKey,
} from '../../../types/communication'

export const bodyMindMainCards: BodyMindMainCardOption[] = [
  {
    key: 'secretion',
    label: '가래/침 빼줘',
    description: '석션이나 흡인을 요청할 때',
    tone: 'sky',
    gridArea: 'secretion',
    route: ROUTE_PATHS.PATIENT_BODY_MIND_SECRETION,
  },
  {
    key: 'breathing',
    label: '숨 답답해',
    description: '호흡 불편감을 바로 전달',
    tone: 'sand',
    gridArea: 'breathing',
    route: ROUTE_PATHS.PATIENT_BODY_MIND_BREATHING,
  },
  {
    key: 'categories',
    label: '카테고리 목록',
    description: '체온·환경 · 식사 · 배변 · 수면 등',
    tone: 'mint',
    gridArea: 'categories',
    route: ROUTE_PATHS.PATIENT_BODY_MIND_CATEGORIES,
  },
  {
    key: 'posture',
    label: '자세 바꿔줘',
    description: '자세 변경이 필요할 때',
    tone: 'sky',
    gridArea: 'posture',
    route: ROUTE_PATHS.PATIENT_BODY_MIND_POSTURE,
  },
  {
    key: 'pain',
    label: '아파',
    description: '부위 선택 후 통증 상세 선택',
    tone: 'rose',
    gridArea: 'pain',
    route: ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA,
  },
  {
    key: 'back',
    label: '뒤로가기',
    description: '대화하기로 돌아가기',
    tone: 'slate',
    gridArea: 'back',
    route: ROUTE_PATHS.PATIENT_TALK_MAIN,
  },
]

export const secretionOptions: BodyMindCardOption<SecretionOptionKey>[] = [
  { key: 'remove_sputum', label: '가래 빼줘', tone: 'sky' },
  { key: 'remove_saliva', label: '침 빼줘', tone: 'sky' },
  { key: 'drooling', label: '침 흘러', tone: 'mint' },
  { key: 'cough_assist', label: '기침유발기 해줘', tone: 'sand' },
  { key: 'sticky_or_blocked', label: '끈적해 / 안 나와', tone: 'rose' },
  { key: 'more', label: '더 해줘', tone: 'sand' },
  { key: 'stop_or_done', label: '그만 / 됐어', tone: 'slate' },
]

export const breathingOptions: BodyMindCardOption<BreathingOptionKey>[] = [
  { key: 'tight_chest', label: '숨 답답해', tone: 'sand' },
  { key: 'difficulty_breathing', label: '숨 쉬기 불편해', tone: 'rose' },
  { key: 'severe_tightness', label: '답답함이 심해', tone: 'rose' },
  { key: 'feeling_better', label: '조금 괜찮아졌어', tone: 'mint' },
]

export const painAreaGroups: PainAreaGroup[] = [
  {
    key: 'upper_body',
    label: '머리 / 목 / 어깨 / 가슴',
    options: [
      { key: 'head', label: '머리', tone: 'sky' },
      { key: 'neck', label: '목', tone: 'sky' },
      { key: 'shoulder', label: '어깨', tone: 'sand' },
      { key: 'chest', label: '가슴', tone: 'rose' },
    ],
  },
  {
    key: 'mid_body',
    label: '배 / 팔 / 손 / 허리',
    options: [
      { key: 'stomach', label: '배', tone: 'sand' },
      { key: 'arm', label: '팔', tone: 'mint' },
      { key: 'hand', label: '손', tone: 'sky' },
      { key: 'waist', label: '허리', tone: 'rose' },
    ],
  },
  {
    key: 'lower_body',
    label: '다리 / 발 / 엉덩이 / 전신·잘 모르겠어',
    options: [
      { key: 'leg', label: '다리', tone: 'mint' },
      { key: 'foot', label: '발', tone: 'sand' },
      { key: 'hip', label: '엉덩이', tone: 'rose' },
      { key: 'whole_body_or_unsure', label: '전신·잘 모르겠어', tone: 'slate' },
    ],
  },
]

export const painDetailOptions: BodyMindCardOption<PainDetailKey>[] = [
  { key: 'stiff', label: '뻣뻣해/굳었어', tone: 'sand' },
  { key: 'numb', label: '저려/감각 없어', tone: 'sky' },
  { key: 'massage', label: '주물러줘', tone: 'mint' },
  { key: 'hot', label: '뜨거워', tone: 'rose' },
  { key: 'cramp', label: '쥐났어/근육 떨려', tone: 'rose' },
  { key: 'joint_exercise', label: '관절 운동해줘', tone: 'mint' },
  { key: 'swollen', label: '붓었어', tone: 'sand' },
]

export const bodyMindCategoryOptions: BodyMindCardOption<BodyMindCategoryKey>[] = [
  {
    key: 'temperature_environment',
    label: '체온/환경',
    description: '덥다 · 춥다 · 온도 조절',
    tone: 'sky',
  },
  {
    key: 'oral_meal',
    label: '구강/식사',
    description: '입안 상태 · 음식 · 물',
    tone: 'sand',
  },
  {
    key: 'bowel_bladder',
    label: '배변/배뇨',
    description: '화장실 · 배변 · 소변',
    tone: 'mint',
  },
  {
    key: 'sleep_fatigue',
    label: '수면/피로',
    description: '졸림 · 피곤함 · 휴식',
    tone: 'slate',
  },
  {
    key: 'emotion_psychology',
    label: '감정/심리',
    description: '불안 · 속상함 · 안정',
    tone: 'rose',
  },
  {
    key: 'medical_device',
    label: '의료기기',
    description: '기기 상태 · 점검 요청',
    tone: 'sky',
  },
  {
    key: 'skin_hygiene_leisure',
    label: '피부/위생/여가',
    description: '가려움 · 씻기 · 여가',
    tone: 'mint',
  },
]

const BODY_MIND_PAGE_SIZE = 4

export const painAreaOptions = painAreaGroups.flatMap(group => group.options)

export function chunkBodyMindOptions<T>(options: T[], pageSize = BODY_MIND_PAGE_SIZE) {
  const pages: T[][] = []

  for (let index = 0; index < options.length; index += pageSize) {
    pages.push(options.slice(index, index + pageSize))
  }

  return pages
}

export const secretionOptionPages = chunkBodyMindOptions(secretionOptions)
export const breathingOptionPages = chunkBodyMindOptions(breathingOptions)
export const painAreaOptionPages = chunkBodyMindOptions(painAreaOptions)
export const painDetailOptionPages = chunkBodyMindOptions(painDetailOptions)
export const bodyMindCategoryOptionPages = chunkBodyMindOptions(bodyMindCategoryOptions)

const painAreaOptionMap = new Map<PainAreaKey, BodyMindCardOption<PainAreaKey>>(
  painAreaOptions.map(option => [option.key, option]),
)

const bodyMindCategoryOptionMap = new Map<
  BodyMindCategoryKey,
  BodyMindCardOption<BodyMindCategoryKey>
>(bodyMindCategoryOptions.map(option => [option.key, option]))

const bodyMindMainCardMap = new Map<BodyMindMainKey, BodyMindMainCardOption>(
  bodyMindMainCards.map(card => [card.key, card]),
)

export function getPainAreaOptionByKey(key: PainAreaKey | null | undefined) {
  if (!key) {
    return null
  }

  return painAreaOptionMap.get(key) ?? null
}

export function getBodyMindCategoryOptionByKey(key: string | undefined) {
  if (!key) {
    return null
  }

  return bodyMindCategoryOptionMap.get(key as BodyMindCategoryKey) ?? null
}

export function getBodyMindCategoryPath(categoryKey: BodyMindCategoryKey) {
  return getPatientBodyMindCategoryDetailPath(categoryKey)
}

export function getBodyMindMainCardByKey(key: BodyMindMainKey) {
  return bodyMindMainCardMap.get(key) ?? null
}
