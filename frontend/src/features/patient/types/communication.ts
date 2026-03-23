/** Patient 공통 소통 관련 타입 (body-mind / talk 등에서 공유) */

export type BodyMindUiStatus =
  | 'idle'
  | 'visible'
  | 'selecting'
  | 'completed'
  | 'transitioning'
  | 'area_selected'

export type BodyMindCardTone = 'sky' | 'sand' | 'mint' | 'rose' | 'slate'

export type BodyMindMainKey =
  | 'secretion'
  | 'breathing'
  | 'categories'
  | 'posture'
  | 'pain'
  | 'back'

export type SecretionOptionKey =
  | 'remove_sputum'
  | 'remove_saliva'
  | 'more'
  | 'stop_or_done'
  | 'sticky_or_blocked'
  | 'drooling'
  | 'cough_assist'

export type BreathingOptionKey =
  | 'tight_chest'
  | 'difficulty_breathing'
  | 'severe_tightness'
  | 'feeling_better'

export type PainAreaKey =
  | 'head'
  | 'neck'
  | 'shoulder'
  | 'arm_hand'
  | 'chest'
  | 'stomach'
  | 'back'
  | 'hip'
  | 'thigh'
  | 'knee'
  | 'calf'
  | 'foot'

export type PainAreaGroupKey = 'upper_body' | 'middle_body' | 'lower_body'

export type PainDetailKey =
  | 'stiff'
  | 'numb'
  | 'massage'
  | 'hot'
  | 'cramp'
  | 'joint_exercise'
  | 'swollen'

export type BodyMindCategoryKey =
  | 'temperature_environment'
  | 'oral_meal'
  | 'bowel_bladder'
  | 'sleep_fatigue'
  | 'emotion_psychology'
  | 'medical_device'
  | 'skin_hygiene_leisure'

export type BodyMindExpressionType =
  | 'secretion'
  | 'breathing'
  | 'pain_detail'
  | 'posture'
  | 'category'

export type BodyMindExpressionOptionKey =
  | SecretionOptionKey
  | BreathingOptionKey
  | PainDetailKey
  | BodyMindCategoryKey

export interface BodyMindCardOption<TKey extends string = string> {
  key: TKey
  label: string
  description?: string
  tone?: BodyMindCardTone
}

export interface BodyMindMainCardOption extends BodyMindCardOption<BodyMindMainKey> {
  route: string
  gridArea: 'secretion' | 'breathing' | 'categories' | 'posture' | 'pain' | 'back'
}

export interface PainAreaGroup {
  key: PainAreaGroupKey
  label: string
  options: BodyMindCardOption<PainAreaKey>[]
}

export interface BodyMindExpressionDraft {
  patientId: string
  type: BodyMindExpressionType
  optionKey: BodyMindExpressionOptionKey
  areaKey?: PainAreaKey
  categoryKey?: BodyMindCategoryKey
}

export interface BodyMindExpressionPayload extends BodyMindExpressionDraft {
  submittedAt: string
}

export interface BodyMindStoredState {
  selectedPainAreaKey?: PainAreaKey
  lastExpression?: BodyMindExpressionPayload
}

export interface SubmitBodyMindExpressionResult {
  success: boolean
  source: 'mock' | 'real'
  payload: BodyMindExpressionPayload
}

export interface PainAreaRouteState {
  selectedGroupKey?: PainAreaGroupKey
  selectedAreaKey?: PainAreaKey
}
