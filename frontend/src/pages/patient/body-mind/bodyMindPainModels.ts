import type {
  PainAreaGroup,
  PainAreaGroupKey,
  PainAreaKey,
} from '../../../features/patient/body-mind/types/bodyMind'
import fullBodyModelUrl from './full_body.glb?url'
import lowerBodyFallbackModelUrl from './lower_body.glb?url'
import middleBodyFallbackModelUrl from './middle_body.glb?url'
import upperBodyFallbackModelUrl from './upper_body.glb?url'
import lowerCalfModelUrl from './lower_body/lower_calf.glb?url'
import lowerFootsModelUrl from './lower_body/lower_foots.glb?url'
import lowerKneeModelUrl from './lower_body/lower_knee.glb?url'
import lowerThighModelUrl from './lower_body/lower_thigh.glb?url'
import middleBackModelUrl from './middle_body/middle_back.glb?url'
import middleButtsModelUrl from './middle_body/middle_butts.glb?url'
import middleChestModelUrl from './middle_body/middle_chest.glb?url'
import middleStomachModelUrl from './middle_body/middle_stomach.glb?url'
import upperArmsModelUrl from './upper_body/upper_arms.glb?url'
import upperHeadModelUrl from './upper_body/upper_head.glb?url'
import upperNeckModelUrl from './upper_body/upper_neck.glb?url'
import upperShoulderModelUrl from './upper_body/upper_shoulder.glb?url'

export interface PainAreaModelDefinition {
  key: PainAreaKey
  groupKey: PainAreaGroup['key']
  modelUrl: string
  fallbackModelUrl: string
}

export interface PainAreaGroupModelDefinition {
  key: PainAreaGroupKey
  modelUrl: string
  fallbackModelUrl: string
}

const painAreaModelMap: Record<PainAreaKey, PainAreaModelDefinition> = {
  head: {
    key: 'head',
    groupKey: 'upper_body',
    modelUrl: upperHeadModelUrl,
    fallbackModelUrl: upperBodyFallbackModelUrl,
  },
  neck: {
    key: 'neck',
    groupKey: 'upper_body',
    modelUrl: upperNeckModelUrl,
    fallbackModelUrl: upperBodyFallbackModelUrl,
  },
  shoulder: {
    key: 'shoulder',
    groupKey: 'upper_body',
    modelUrl: upperShoulderModelUrl,
    fallbackModelUrl: upperBodyFallbackModelUrl,
  },
  arm_hand: {
    key: 'arm_hand',
    groupKey: 'upper_body',
    modelUrl: upperArmsModelUrl,
    fallbackModelUrl: upperBodyFallbackModelUrl,
  },
  chest: {
    key: 'chest',
    groupKey: 'middle_body',
    modelUrl: middleChestModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  stomach: {
    key: 'stomach',
    groupKey: 'middle_body',
    modelUrl: middleStomachModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  back: {
    key: 'back',
    groupKey: 'middle_body',
    modelUrl: middleBackModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  hip: {
    key: 'hip',
    groupKey: 'middle_body',
    modelUrl: middleButtsModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  thigh: {
    key: 'thigh',
    groupKey: 'lower_body',
    modelUrl: lowerThighModelUrl,
    fallbackModelUrl: lowerBodyFallbackModelUrl,
  },
  knee: {
    key: 'knee',
    groupKey: 'lower_body',
    modelUrl: lowerKneeModelUrl,
    fallbackModelUrl: lowerBodyFallbackModelUrl,
  },
  calf: {
    key: 'calf',
    groupKey: 'lower_body',
    modelUrl: lowerCalfModelUrl,
    fallbackModelUrl: lowerBodyFallbackModelUrl,
  },
  foot: {
    key: 'foot',
    groupKey: 'lower_body',
    modelUrl: lowerFootsModelUrl,
    fallbackModelUrl: lowerBodyFallbackModelUrl,
  },
}

const painAreaGroupModelMap: Record<PainAreaGroupKey, PainAreaGroupModelDefinition> = {
  upper_body: {
    key: 'upper_body',
    modelUrl: upperBodyFallbackModelUrl,
    fallbackModelUrl: fullBodyModelUrl,
  },
  middle_body: {
    key: 'middle_body',
    modelUrl: middleBodyFallbackModelUrl,
    fallbackModelUrl: fullBodyModelUrl,
  },
  lower_body: {
    key: 'lower_body',
    modelUrl: lowerBodyFallbackModelUrl,
    fallbackModelUrl: fullBodyModelUrl,
  },
}

export function getFullBodyModelUrl() {
  return fullBodyModelUrl
}

export function getPainAreaModelByKey(key: PainAreaKey | null | undefined) {
  if (!key) {
    return null
  }

  return painAreaModelMap[key] ?? null
}

export function getPainAreaGroupModelByKey(key: PainAreaGroupKey | null | undefined) {
  if (!key) {
    return null
  }

  return painAreaGroupModelMap[key] ?? null
}
