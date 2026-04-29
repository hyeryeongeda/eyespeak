import {
  ROUTE_PATHS,
  getPatientBodyMindCategoryDetailPath,
} from '../../../app/router/routePaths'
import type {
  BodyMindCardOption,
  BodyMindCategoryKey,
  BodyMindCardTone,
  PainAreaGroup,
  PainAreaGroupKey,
  PainAreaKey,
  PainDetailKey,
} from '../../../features/patient/body-mind/types/bodyMind'

export interface BodyMindMenuPageDefinition<
  TOption extends BodyMindCardOption<string> = BodyMindCardOption<string>,
> {
  options: TOption[]
}

export interface BodyMindRouteOption<TKey extends string = string>
  extends BodyMindCardOption<TKey> {
  route: string
}

export interface BodyMindCategoryDetailDefinition {
  key: BodyMindCategoryKey
  label: string
  description: string
  tone: BodyMindCardTone
  returnPageIndex: number
  pages: BodyMindMenuPageDefinition[]
}

const categoryPath = (categoryKey: BodyMindCategoryKey) =>
  getPatientBodyMindCategoryDetailPath(categoryKey)

export const bodyMindMainPages: BodyMindMenuPageDefinition<BodyMindRouteOption>[] = [
  {
    options: [
      {
        key: 'pain',
        label: '아파',
        description: '부위와 통증 상태를 자세히 선택',
        tone: 'rose',
        route: ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA,
      },
      {
        key: 'secretion',
        label: '가래/침 빼줘',
        description: '가래와 침 관련 요청을 바로 전달',
        tone: 'sky',
        route: ROUTE_PATHS.PATIENT_BODY_MIND_SECRETION,
      },
      {
        key: 'breathing',
        label: '숨 답답해',
        description: '호흡 불편과 기기 요청 전달',
        tone: 'sand',
        route: ROUTE_PATHS.PATIENT_BODY_MIND_BREATHING,
      },
      {
        key: 'posture',
        label: '자세 바꿔줘',
        description: '머리, 등, 팔, 다리 자세 조절',
        tone: 'mint',
        route: ROUTE_PATHS.PATIENT_BODY_MIND_POSTURE,
      },
    ],
  },
  {
    options: [
      {
        key: 'temperature_environment',
        label: '체온 / 환경',
        description: '덥거나 춥고 주변 환경이 불편할 때',
        tone: 'sky',
        route: categoryPath('temperature_environment'),
      },
      {
        key: 'oral_meal',
        label: '구강 / 식사',
        description: '입안 상태와 식사, 물 요청',
        tone: 'sand',
        route: categoryPath('oral_meal'),
      },
      {
        key: 'bowel_bladder',
        label: '배변 / 배뇨',
        description: '소변, 기저귀, 변비 관련 요청',
        tone: 'mint',
        route: categoryPath('bowel_bladder'),
      },
      {
        key: 'sleep_fatigue',
        label: '수면 / 피로',
        description: '잠, 불빛, 소음, 피로 표현',
        tone: 'slate',
        route: categoryPath('sleep_fatigue'),
      },
    ],
  },
  {
    options: [
      {
        key: 'emotion_psychology',
        label: '감정 / 심리',
        description: '감정 표현과 심리적 도움 요청',
        tone: 'rose',
        route: categoryPath('emotion_psychology'),
      },
      {
        key: 'medical_device',
        label: '의료기기',
        description: '호흡기, 산소포화도, 관 주변 불편',
        tone: 'sky',
        route: categoryPath('medical_device'),
      },
      {
        key: 'skin_hygiene_leisure',
        label: '피부 / 위생 / 여가',
        description: '가려움, 닦기, TV, 음악',
        tone: 'mint',
        route: categoryPath('skin_hygiene_leisure'),
      },
    ],
  },
]

export const secretionOptionPages: BodyMindMenuPageDefinition[] = [
  {
    options: [
      { key: 'remove_sputum', label: '가래 빼줘', tone: 'sky' },
      { key: 'remove_saliva', label: '침 빼줘', tone: 'sky' },
      { key: 'more', label: '더 해줘', tone: 'sand' },
      { key: 'no_output', label: '안 나와', tone: 'rose' },
    ],
  },
  {
    options: [
      { key: 'sticky_or_blocked', label: '끈적해', tone: 'rose' },
      { key: 'stop_or_done', label: '그만', tone: 'slate' },
      { key: 'cough_assist', label: '기침유발기 해줘', tone: 'mint' },
      { key: 'drooling', label: '침 흘러', tone: 'sand' },
  
    ],
  },
]

export const breathingOptionPages: BodyMindMenuPageDefinition[] = [
  {
    options: [
      { key: 'ventilator_uncomfortable', label: '호흡기 불편해', tone: 'rose' },
      { key: 'more_air', label: '공기 더 넣어줘', tone: 'sky' },
      { key: 'chest_pain', label: '가슴이 아파', tone: 'sand' },
      { key: 'check_oxygen', label: '산소포화도 확인해줘', tone: 'mint' },
    ],
  },
  {
    options: [
      { key: 'feeling_better', label: '숨쉬기 편해졌어', tone: 'mint' },
      { key: 'less_air', label: '공기 줄여줘', tone: 'sand' },
      { key: 'ventilator_abnormal', label: '호흡기 이상해', tone: 'rose' },
    ],
  },
]

export const postureOptionPages: BodyMindMenuPageDefinition[] = [
  {
    options: [
      { key: 'turn_left', label: '왼쪽으로 돌려줘', tone: 'sky' },
      { key: 'turn_right', label: '오른쪽으로 돌려줘', tone: 'sky' },
      { key: 'head_up', label: '머리 높여', tone: 'sand' },
      { key: 'head_down', label: '머리 낮춰줘', tone: 'sand' },
    ],
  },
  {
    options: [
      { key: 'back_up', label: '등을 높여줘', tone: 'mint' },
      { key: 'back_down', label: '등을 낮춰줘', tone: 'mint' },
      { key: 'sit_up', label: '앉혀줘', tone: 'rose' },
      { key: 'lie_down', label: '눕혀줘', tone: 'rose' },
    ],
  },
  {
    options: [
      { key: 'wait', label: '기다려', tone: 'slate' },
      { key: 'pause', label: '잠깐', tone: 'slate' },
      { key: 'adjust_pillow', label: '베개 조절해줘', tone: 'sky' },
      { key: 'raise_legs', label: '다리 올려줘', tone: 'mint' },
      { key: 'raise_arms', label: '팔 올려줘', tone: 'mint' },
    ],
  },
]

export const painAreaGroups: PainAreaGroup[] = [
  {
    key: 'upper_body',
    label: '상체',
    options: [
      { key: 'head', label: '머리', description: '두통이나 머리 통증', tone: 'sky' },
      { key: 'neck', label: '목', description: '목이 뻣뻣하거나 아픔', tone: 'sand' },
      { key: 'shoulder', label: '어깨', description: '어깨가 결리거나 아픔', tone: 'mint' },
      { key: 'chest', label: '가슴', description: '가슴이 답답하거나 아픔', tone: 'rose' },
    ],
  },
  {
    key: 'middle_body',
    label: '몸통',
    options: [
      { key: 'stomach', label: '배', description: '배가 아프거나 불편함', tone: 'sand' },
      { key: 'arm', label: '팔', description: '팔이 아프거나 뻐근함', tone: 'sky' },
      { key: 'hand', label: '손', description: '손이 저리거나 불편함', tone: 'mint' },
      { key: 'waist', label: '허리', description: '허리가 아프거나 당김', tone: 'rose' },
    ],
  },
  {
    key: 'lower_body',
    label: '하체',
    options: [
      { key: 'leg', label: '다리', description: '다리가 아프거나 당김', tone: 'mint' },
      { key: 'foot', label: '발', description: '발이 아프거나 저림', tone: 'sand' },
      { key: 'hip', label: '엉덩이', description: '엉덩이가 배기거나 아픔', tone: 'rose' },
      { key: 'whole_body', label: '전신', description: '온몸이 전반적으로 아픔', tone: 'slate' },
    ],
  },
]

export const painDetailOptionPages: BodyMindMenuPageDefinition<
  BodyMindCardOption<PainDetailKey>
>[] = [
  {
    options: [
      { key: 'stiff', label: '뻣뻣해', tone: 'sand' },
      { key: 'numb', label: '감각 없어', tone: 'sky' },
      { key: 'massage', label: '주물러줘', tone: 'mint' },
      { key: 'hot', label: '뜨거워', tone: 'rose' },
    ],
  },
  {
    options: [
      { key: 'cramp', label: '쥐났어', tone: 'rose' },
      { key: 'joint_exercise', label: '관절 운동해줘', tone: 'mint' },
      { key: 'swollen', label: '부었어', tone: 'sand' },
    ],
  },
]

export const bodyMindCategoryDefinitions: BodyMindCategoryDetailDefinition[] = [
  {
    key: 'temperature_environment',
    label: '체온 / 환경',
    description: '체온과 주변 환경 관련 요청을 전달합니다.',
    tone: 'sky',
    returnPageIndex: 1,
    pages: [
      {
        options: [
          { key: 'hot', label: '더워', tone: 'rose' },
          { key: 'cold', label: '추워', tone: 'sky' },
          { key: 'remove_blanket', label: '이불 벗겨줘', tone: 'sand' },
          { key: 'cover_blanket', label: '이불 덮어줘', tone: 'mint' },
        ],
      },
      {
        options: [
          { key: 'wipe_sweat', label: '땀 닦아줘', tone: 'mint' },
          { key: 'want_fresh_air', label: '바람 쐬고 싶어', tone: 'sky' },
          { key: 'ventilate', label: '환기해줘', tone: 'sand' },
          { key: 'air_conditioner', label: '에어컨', tone: 'rose' },
          { key: 'heater', label: '히터', tone: 'slate' },
        ],
      },
    ],
  },
  {
    key: 'oral_meal',
    label: '구강 / 식사',
    description: '입안 상태와 식사 관련 요청을 전달합니다.',
    tone: 'sand',
    returnPageIndex: 1,
    pages: [
      {
        options: [
          { key: 'moisten_mouth', label: '입 안 적셔줘', tone: 'sky' },
          { key: 'stop_tube_feeding', label: '경관식 멈춰줘', tone: 'rose' },
          { key: 'feel_nauseous', label: '토할 것 같아', tone: 'sand' },
          { key: 'slow_tube_feeding', label: '경관식 속도 줄여줘', tone: 'mint' },
        ],
      },
      {
        options: [
          { key: 'meal_stop', label: '그만', tone: 'slate' },
          { key: 'full', label: '배 불러', tone: 'sand' },
          { key: 'hungry', label: '배 고파', tone: 'rose' },
          { key: 'apply_lip_balm', label: '입술 발라줘', tone: 'mint' },
          { key: 'wet_with_water', label: '물 적셔줘', tone: 'sky' },
        ],
      },
    ],
  },
  {
    key: 'bowel_bladder',
    label: '배변 / 배뇨',
    description: '배변과 배뇨 관련 요청을 전달합니다.',
    tone: 'mint',
    returnPageIndex: 1,
    pages: [
      {
        options: [
          { key: 'need_urinate', label: '소변 마려워', tone: 'sky' },
          { key: 'change_diaper', label: '기저귀 갈아줘', tone: 'sand' },
          { key: 'constipated', label: '변비야', tone: 'rose' },
          { key: 'gas_buildup', label: '가스 찼어', tone: 'mint' },
          { key: 'catheter_uncomfortable', label: '소변줄 불편해', tone: 'slate' },
        ],
      },
    ],
  },
  {
    key: 'sleep_fatigue',
    label: '수면 / 피로',
    description: '잠과 피로 관련 요청을 전달합니다.',
    tone: 'slate',
    returnPageIndex: 1,
    pages: [
      {
        options: [
          { key: 'cant_sleep', label: '잠이 안 와', tone: 'rose' },
          { key: 'lights_off', label: '불 꺼줘', tone: 'slate' },
          { key: 'lights_on', label: '불 켜줘', tone: 'sky' },
          { key: 'be_quiet', label: '조용히 해줘', tone: 'sand' },
          { key: 'sleepy', label: '졸려', tone: 'mint' },
        ],
      },
    ],
  },
  {
    key: 'emotion_psychology',
    label: '감정 / 심리',
    description: '감정과 심리 상태를 표현합니다.',
    tone: 'rose',
    returnPageIndex: 2,
    pages: [
      {
        options: [
          { key: 'love_you', label: '사랑해', tone: 'rose' },
          { key: 'frustrated', label: '답답해', tone: 'sand' },
          { key: 'okay', label: '괜찮아', tone: 'mint' },
          { key: 'thank_you', label: '고마워', tone: 'sky' },
        ],
      },
      {
        options: [
          { key: 'miss_family', label: '가족 보고 싶어', tone: 'rose' },
          { key: 'bored', label: '심심해', tone: 'slate' },
          { key: 'want_to_cry', label: '울고 싶어', tone: 'sand' },
          { key: 'scared', label: '무서워', tone: 'rose' },
          { key: 'miss_you', label: '보고싶어', tone: 'mint' },
        ],
      },
    ],
  },
  {
    key: 'medical_device',
    label: '의료기기',
    description: '의료기기와 관 주변 불편을 전달합니다.',
    tone: 'sky',
    returnPageIndex: 2,
    pages: [
      {
        options: [
          { key: 'device_ventilator_abnormal', label: '호흡기 이상해', tone: 'rose' },
          { key: 'device_check_oxygen', label: '산소포화도 확인해줘', tone: 'mint' },
          { key: 'trach_site_uncomfortable', label: '목관 주변 불편해', tone: 'sand' },
          { key: 'peg_site_pain', label: '위루관 주변 아파', tone: 'rose' },
          { key: 'give_medicine', label: '약 줘', tone: 'sky' },
        ],
      },
    ],
  },
  {
    key: 'skin_hygiene_leisure',
    label: '피부 / 위생 / 여가',
    description: '피부 관리와 위생, 여가 요청을 전달합니다.',
    tone: 'mint',
    returnPageIndex: 2,
    pages: [
      {
        options: [
          { key: 'itchy', label: '가려워', tone: 'rose' },
          { key: 'wipe_me', label: '닦아줘', tone: 'mint' },
          { key: 'wipe_eyes', label: '눈 닦아줘', tone: 'sky' },
          { key: 'skin_stings', label: '피부 따가워', tone: 'sand' },
        ],
      },
      {
        options: [
          { key: 'hygiene_lip_balm', label: '입술 발라줘', tone: 'mint' },
          { key: 'blow_nose', label: '코 풀어줘', tone: 'sky' },
          { key: 'turn_on_tv', label: 'TV 틀어줘', tone: 'sand' },
          { key: 'play_music', label: '음악 틀어줘', tone: 'rose' },
          { key: 'ask_time', label: '시간 몇 시야?', tone: 'slate' },
        ],
      },
    ],
  },
]

export const bodyMindCategoryOverviewPages: BodyMindMenuPageDefinition<
  BodyMindRouteOption<BodyMindCategoryKey>
>[] = [
  {
    options: bodyMindCategoryDefinitions
      .slice(0, 4)
      .map(category => ({
        key: category.key,
        label: category.label,
        description: category.description,
        tone: category.tone,
        route: categoryPath(category.key),
      })),
  },
  {
    options: bodyMindCategoryDefinitions
      .slice(4)
      .map(category => ({
        key: category.key,
        label: category.label,
        description: category.description,
        tone: category.tone,
        route: categoryPath(category.key),
      })),
  },
]

export const bodyMindCategoryOptions: BodyMindRouteOption<BodyMindCategoryKey>[] =
  bodyMindCategoryOverviewPages.flatMap(page => page.options)
export const painAreaOptions = painAreaGroups.flatMap(group => group.options)

const painAreaOptionMap = new Map<PainAreaKey, BodyMindCardOption<PainAreaKey>>(
  painAreaOptions.map(option => [option.key, option]),
)

const bodyMindCategoryOptionMap = new Map<
  BodyMindCategoryKey,
  BodyMindRouteOption<BodyMindCategoryKey>
>(bodyMindCategoryOptions.map(option => [option.key, option]))

const bodyMindCategoryDefinitionMap = new Map(
  bodyMindCategoryDefinitions.map(category => [category.key, category]),
)

export function getPainAreaOptionByKey(key: PainAreaKey | null | undefined) {
  if (!key) {
    return null
  }

  return painAreaOptionMap.get(key) ?? null
}

export function getPainAreaGroupByKey(groupKey: PainAreaGroupKey | null | undefined) {
  if (!groupKey) {
    return null
  }

  return painAreaGroups.find(group => group.key === groupKey) ?? null
}

export function getPainAreaGroupByAreaKey(key: PainAreaKey | null | undefined) {
  if (!key) {
    return null
  }

  return painAreaGroups.find(group => group.options.some(option => option.key === key)) ?? null
}

export function getBodyMindCategoryOptionByKey(key: string | undefined) {
  if (!key) {
    return null
  }

  return bodyMindCategoryOptionMap.get(key as BodyMindCategoryKey) ?? null
}

export function getBodyMindCategoryDefinitionByKey(key: string | undefined) {
  if (!key) {
    return null
  }

  return bodyMindCategoryDefinitionMap.get(key as BodyMindCategoryKey) ?? null
}

export function getBodyMindCategoryPath(categoryKey: BodyMindCategoryKey) {
  return getPatientBodyMindCategoryDetailPath(categoryKey)
}
