import type { RecommendationCategoryKey } from '../types/recommendation'

export const RECOMMENDATION_SENTENCE_MOCKS: Record<RecommendationCategoryKey, string[]> = {
  mood: [
    '吏湲덉? 議곌툑 ?쇨낀?댁슂.',
    '紐몄씠 議곌툑 遺덊렪?댁슂.',
    '吏湲덉? 愿쒖갖?꾩슂.',
  ],
  schedule: [
    '?ㅻ뒛 ?쇱젙??沅곴툑?댁슂.',
    '?좉퉸 ?ш퀬 ?섏꽌 ?좉쾶??',
    '?ы솢 ?꾩뿉 議곌툑 ?ш퀬 ?띠뼱??',
  ],
  frequent: [
    '臾쇱쓣 議곌툑留?二쇱꽭??',
    '?먯꽭瑜?諛붽퓭 二쇱꽭??',
    '?좉퉸留??꾩?二쇱꽭??',
  ],
  recent: [
    '?꾧퉴 留먰븳 寃껋쿂??議곌툑 遺덊렪?댁슂.',
    '諛⑷툑 ?댁빞湲고븳 嫄??ㅼ떆 ?꾩?二쇱꽭??',
    '吏곸쟾 ?곹깭? 鍮꾩듂?댁슂.',
  ],
}

export const RECOMMENDATION_SENTENCE_FALLBACK = [
  '吏湲덉? 議곌툑 ?ш퀬 ?띠뼱??',
  '泥쒖쿇???ㅼ떆 留먰빐 二쇱꽭??',
  '議곌툑留??꾩?二쇱꽭??',
]

export function getMockRecommendationSentences(categoryKey: RecommendationCategoryKey) {
  const base = RECOMMENDATION_SENTENCE_MOCKS[categoryKey] ?? []
  const merged = [...base, ...RECOMMENDATION_SENTENCE_FALLBACK]

  return [...new Set(merged)].slice(0, 3)
}
