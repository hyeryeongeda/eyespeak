import type {
  PainAreaGroup,
  PainAreaGroupKey,
  PainAreaKey,
} from '../../../features/patient/body-mind/types/bodyMind'
import fullBodyModelUrl from './full_body.glb?url'
import lowerBodyFallbackModelUrl from './lower_body.glb?url'
import middleBodyFallbackModelUrl from './middle_body.glb?url'
import upperBodyFallbackModelUrl from './upper_body.glb?url'
import lowerFootsModelUrl from './lower_body/lower_foots.glb?url'
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
  arm: {
    key: 'arm',
    groupKey: 'middle_body',
    modelUrl: upperArmsModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  hand: {
    key: 'hand',
    groupKey: 'middle_body',
    modelUrl: upperArmsModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  chest: {
    key: 'chest',
    groupKey: 'upper_body',
    modelUrl: middleChestModelUrl,
    fallbackModelUrl: upperBodyFallbackModelUrl,
  },
  stomach: {
    key: 'stomach',
    groupKey: 'middle_body',
    modelUrl: middleStomachModelUrl,
    fallbackModelUrl: middleBodyFallbackModelUrl,
  },
  waist: {
    key: 'waist',
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
  leg: {
    key: 'leg',
    groupKey: 'lower_body',
    modelUrl: lowerBodyFallbackModelUrl,
    fallbackModelUrl: lowerBodyFallbackModelUrl,
  },
  foot: {
    key: 'foot',
    groupKey: 'lower_body',
    modelUrl: lowerFootsModelUrl,
    fallbackModelUrl: lowerBodyFallbackModelUrl,
  },
  whole_body: {
    key: 'whole_body',
    groupKey: 'lower_body',
    modelUrl: fullBodyModelUrl,
    fallbackModelUrl: fullBodyModelUrl,
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

export const painAreaModelUrls = Array.from(
  new Set(
    [
      fullBodyModelUrl,
      ...Object.values(painAreaModelMap).flatMap(({ modelUrl, fallbackModelUrl }) => [
        modelUrl,
        fallbackModelUrl,
      ]),
      ...Object.values(painAreaGroupModelMap).flatMap(({ modelUrl, fallbackModelUrl }) => [
        modelUrl,
        fallbackModelUrl,
      ]),
    ],
  ),
)

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
