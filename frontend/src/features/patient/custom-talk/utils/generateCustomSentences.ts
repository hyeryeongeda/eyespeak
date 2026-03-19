import type { CustomTalkDraft } from '../types'
import { polishSentence } from './polishSentence'

export function buildCustomTalkDraftPreview(draft: CustomTalkDraft) {
  if (draft.manualInput.trim()) {
    return draft.manualInput.trim()
  }

  const preview = polishSentence(
    [draft.subject, draft.object, draft.predicate].filter(Boolean).join(' '),
    draft.punctuation ?? '',
  )

  if (preview) {
    return preview
  }

  return '아직 선택한 표현이 없습니다.'
}

export function generateCustomSentences(draft: CustomTalkDraft) {
  const punctuation = draft.punctuation ?? '.'
  const primary = polishSentence(
    [draft.subject, draft.object, draft.predicate].filter(Boolean).join(' '),
    punctuation,
  )
  const secondary = polishSentence(
    [draft.subject || '지금은', draft.object || '조금 더 설명이', draft.predicate || '필요해요'].join(
      ' ',
    ),
    punctuation,
  )
  const tertiary = polishSentence(
    [draft.subject || '저는', draft.object || '도움이', draft.predicate || '좋겠어요'].join(' '),
    punctuation,
  )

  return [primary, secondary, tertiary].filter(Boolean)
}
