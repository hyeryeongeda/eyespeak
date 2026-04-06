import type { FavoriteItem } from '../../../../types/favorites'

export type FavoriteTileTone = 'sky' | 'sand' | 'mint' | 'rose' | 'slate'

export interface FavoriteTileMeta {
  tone: FavoriteTileTone
  description: string
}

export const favoriteTileToneStyleMap: Record<
  FavoriteTileTone,
  { background: string; accent: string }
> = {
  sky: {
    background: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
    accent: '#6f87d9',
  },
  sand: {
    background: 'linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)',
    accent: '#d1a749',
  },
  mint: {
    background: 'linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)',
    accent: '#5f9f8e',
  },
  rose: {
    background: 'linear-gradient(135deg, #fff0ef 0%, #ffe5e1 100%)',
    accent: '#d67564',
  },
  slate: {
    background: 'linear-gradient(135deg, #f5f5f8 0%, #eef0f5 100%)',
    accent: '#7a8798',
  },
}

const favoriteCategoryMetaMap: Record<string, FavoriteTileMeta> = {
  '석션 (가래/침)': {
    tone: 'sky',
    description: '가래와 침 관련 요청을 바로 전달',
  },
  호흡: {
    tone: 'sand',
    description: '호흡 불편과 기기 요청 전달',
  },
  통증: {
    tone: 'rose',
    description: '부위와 통증 상태를 자세히 선택',
  },
  자세: {
    tone: 'mint',
    description: '머리, 등, 팔, 다리 자세 조절',
  },
  '체온/환경': {
    tone: 'sky',
    description: '덥거나 춥고 주변 환경이 불편할 때',
  },
  '구강/식사': {
    tone: 'sand',
    description: '입안 상태와 식사, 물 요청',
  },
  '배변/배뇨': {
    tone: 'mint',
    description: '소변, 기저귀, 변비 관련 요청',
  },
  '수면/피로': {
    tone: 'slate',
    description: '잠, 불빛, 소음, 피로 표현',
  },
  '감정/심리': {
    tone: 'rose',
    description: '감정 표현과 심리적 도움 요청',
  },
  의료기기: {
    tone: 'sky',
    description: '호흡기, 산소포화도, 관 주변 불편',
  },
  '피부/위생/여가': {
    tone: 'mint',
    description: '가려움, 닦기, TV, 음악',
  },
}

const favoriteKeywordMetaList: Array<{ pattern: RegExp; meta: FavoriteTileMeta }> = [
  {
    pattern: /가래|침|석션|기침유발기/u,
    meta: {
      tone: 'sky',
      description: '가래와 침 관련 요청을 바로 전달',
    },
  },
  {
    pattern: /숨|호흡|공기|산소|호흡기|목관|기관/u,
    meta: {
      tone: 'sand',
      description: '호흡 불편과 기기 요청 전달',
    },
  },
  {
    pattern: /아파|뻣뻣|저려|감각|주물러|뜨거워|쥐났|부었/u,
    meta: {
      tone: 'rose',
      description: '부위와 통증 상태를 자세히 선택',
    },
  },
  {
    pattern: /돌려줘|높여|낮춰|앉혀|눕혀|베개|다리|팔|자세/u,
    meta: {
      tone: 'mint',
      description: '머리, 등, 팔, 다리 자세 조절',
    },
  },
]

export function getFavoriteTileMeta(item: FavoriteItem): FavoriteTileMeta {
  if (item.category) {
    const categoryMeta = favoriteCategoryMetaMap[item.category]

    if (categoryMeta) {
      return categoryMeta
    }
  }

  const matchedMeta = favoriteKeywordMetaList.find(entry => entry.pattern.test(item.text))?.meta

  if (matchedMeta) {
    return matchedMeta
  }

  if (item.category) {
    return {
      tone: 'slate',
      description: `${item.category} 관련 표현을 바로 전달`,
    }
  }

  return {
    tone: 'slate',
    description: '자주 쓰는 표현을 바로 전달',
  }
}
