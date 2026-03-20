export function polishSentence(text: string, punctuation = '') {
  const trimmed = text.replace(/\s+/g, ' ').trim()

  if (!trimmed) {
    return ''
  }

  const normalized = trimmed.replace(/[.?!]+$/g, '')

  return `${normalized}${punctuation}`.trim()
}
