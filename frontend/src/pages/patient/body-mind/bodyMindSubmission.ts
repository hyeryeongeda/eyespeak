import type {
  BodyMindCategoryKey,
  BodyMindExpressionType,
  PainAreaKey,
} from '../../../features/patient/body-mind/types/bodyMind'
import { submitBodyMindExpression } from '../../../services/bodyMindService'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../services/recommendationService'

interface SubmitBodyMindSelectionInput {
  patientId: string
  text: string
  type: BodyMindExpressionType
  optionKey: string
  areaKey?: PainAreaKey
  categoryKey?: BodyMindCategoryKey
}

interface SubmitBodyMindSelectionResult {
  success: boolean
  feedbackText: string
}

export async function submitBodyMindSelection({
  patientId,
  text,
  type,
  optionKey,
  areaKey,
  categoryKey,
}: SubmitBodyMindSelectionInput): Promise<SubmitBodyMindSelectionResult> {
  try {
    await submitPatientUtterance({
      text,
      source: 'manual',
    })
  } catch (error) {
    console.warn('Body-mind chat send failed.', error)
    return {
      success: false,
      feedbackText: '전송에 실패했습니다. 다시 선택해 주세요.',
    }
  }

  let completionSourceLabel = '채팅 전송 완료'

  try {
    const result = await submitBodyMindExpression({
      patientId,
      type,
      optionKey,
      areaKey,
      categoryKey,
    })

    completionSourceLabel =
      result.source === 'mock' ? 'mock 저장 완료' : 'API 전송 완료'
  } catch (error) {
    console.warn('Body-mind persistence failed after chat send.', error)
  }

  try {
    await playPatientUtteranceTts({
      text,
    })
  } catch (error) {
    console.warn('Body-mind utterance TTS playback failed.', error)
  }

  return {
    success: true,
    feedbackText: `${text} 선택 완료 · ${completionSourceLabel}`,
  }
}
