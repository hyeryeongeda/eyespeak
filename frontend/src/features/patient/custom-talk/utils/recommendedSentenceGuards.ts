const BLOCKED_RECOMMENDED_SENTENCES = new Set([
  '추천 문장을 다시 준비하고 있습니다.',
  '잠시 후 다시 선택해 주세요.',
  '원하는 문장이 없으면 형태소 조합으로 이어갈 수 있습니다.',
])

function normalizeSentence(text: string) {
  return text.trim()
}

export function isBlockedRecommendedSentence(text: string) {
  return BLOCKED_RECOMMENDED_SENTENCES.has(normalizeSentence(text))
}

export function filterSelectableRecommendedSentences(sentences: string[]) {
  const seen = new Set<string>()

  return sentences.filter(sentence => {
    const normalizedSentence = normalizeSentence(sentence)

    if (!normalizedSentence || isBlockedRecommendedSentence(normalizedSentence)) {
      return false
    }

    if (seen.has(normalizedSentence)) {
      return false
    }

    seen.add(normalizedSentence)
    return true
  })
}
