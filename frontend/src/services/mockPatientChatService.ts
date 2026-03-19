import type {
  PatientChatMessage,
  PatientChatMessageType,
  PatientChatSendOutcome,
  PatientChatSuggestionMode,
} from '../types/chat'

export type PatientChatPresetKey =
  | 'water'
  | 'okay'
  | 'pain'
  | 'posture'
  | 'breathing'
  | 'suggestion_failure'
  | 'empty_suggestion'
  | 'invalid_content'

export interface PatientChatPreset {
  key: PatientChatPresetKey
  label: string
  content: string
  type: Extract<PatientChatMessageType, 'text' | 'stt'>
  suggestionMode: PatientChatSuggestionMode
}

export interface MockSendPatientReplyInput {
  content: string
  replyToId: string
  type: Extract<
    PatientChatMessageType,
    'suggested_reply' | 'manual_text' | 'word_combination'
  >
  outcome?: PatientChatSendOutcome
}

export interface MockSendPatientReplyResult {
  success: boolean
  message?: PatientChatMessage
  error?: string
}

const MOCK_SEND_DELAY_MS = 650
const timestampFormatter = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short',
  timeStyle: 'medium',
})

let incomingMessageSequence = 0
let outgoingMessageSequence = 0

export const PATIENT_CHAT_RESPONSE_TIMEOUT_MS = import.meta.env.DEV ? 8000 : 25000
export const PATIENT_CHAT_SUGGESTION_DELAY_MS = 500
export const PATIENT_CHAT_DEV_PANEL_ENABLED = import.meta.env.DEV

export const PATIENT_CHAT_MESSAGE_PRESETS: PatientChatPreset[] = [
  {
    key: 'water',
    label: '물 마실래?',
    content: '물 마실래?',
    type: 'text',
    suggestionMode: 'success',
  },
  {
    key: 'okay',
    label: '지금 괜찮아?',
    content: '지금 괜찮아?',
    type: 'stt',
    suggestionMode: 'success',
  },
  {
    key: 'pain',
    label: '통증 있어?',
    content: '통증 있어?',
    type: 'text',
    suggestionMode: 'success',
  },
  {
    key: 'posture',
    label: '자세 바꿔줄까?',
    content: '자세 바꿔줄까?',
    type: 'text',
    suggestionMode: 'success',
  },
  {
    key: 'breathing',
    label: '숨 쉬기 불편해?',
    content: '숨 쉬기 불편해?',
    type: 'stt',
    suggestionMode: 'success',
  },
  {
    key: 'suggestion_failure',
    label: '추천 실패 테스트',
    content: '오늘 상태를 말해줄래?',
    type: 'text',
    suggestionMode: 'failure',
  },
  {
    key: 'empty_suggestion',
    label: '빈 추천 테스트',
    content: '응답이 필요해',
    type: 'text',
    suggestionMode: 'empty',
  },
  {
    key: 'invalid_content',
    label: '빈 메시지 테스트',
    content: '',
    type: 'text',
    suggestionMode: 'failure',
  },
]

export function getPatientChatPreset(key: PatientChatPresetKey) {
  return PATIENT_CHAT_MESSAGE_PRESETS.find(preset => preset.key === key) ?? null
}

export function createMockIncomingPatientChatMessage(
  presetKey: PatientChatPresetKey,
  overrides?: Partial<PatientChatMessage> & { messageId?: string },
): PatientChatMessage {
  const preset = getPatientChatPreset(presetKey)

  if (!preset) {
    throw new Error(`Unknown patient chat preset: ${presetKey}`)
  }

  incomingMessageSequence += 1
  const createdAt = timestampFormatter.format(new Date())

  return {
    id: overrides?.messageId ?? `caregiver-${preset.key}-${incomingMessageSequence}`,
    sender: 'caregiver',
    type: preset.type,
    content: overrides?.content ?? preset.content,
    createdAt,
    status: overrides?.status ?? 'received',
    meta: {
      sourcePresetKey: preset.key,
      suggestionMode: preset.suggestionMode,
      ...(preset.type === 'stt' ? { sttConfidence: 0.92 } : null),
      ...overrides?.meta,
    },
  }
}

export async function mockSendPatientReply(
  input: MockSendPatientReplyInput,
): Promise<MockSendPatientReplyResult> {
  await delay(MOCK_SEND_DELAY_MS)

  const outcome = input.outcome ?? 'auto'
  const shouldFail = outcome === 'failure'

  if (shouldFail) {
    return {
      success: false,
      error: '응답 전송에 실패했습니다. 다시 시도하거나 직접 입력을 사용하세요.',
    }
  }

  outgoingMessageSequence += 1
  const createdAt = timestampFormatter.format(new Date())

  return {
    success: true,
    message: {
      id: `patient-reply-${outgoingMessageSequence}`,
      sender: 'patient',
      type: input.type,
      content: input.content,
      createdAt,
      status: 'replied',
      replyToId: input.replyToId,
    },
  }
}

export function getPatientChatWordBank(message?: PatientChatMessage | null) {
  const baseWords = ['응', '아니', '조금만', '나중에', '도와줘', '잠깐만', '괜찮아', '불편해']

  if (!message) {
    return baseWords
  }

  const content = message.content

  if (content.includes('물')) {
    return ['응', '아니', '조금만', '나중에', '물', '도와줘']
  }

  if (content.includes('통증')) {
    return ['응', '아니', '조금 아파', '많이 아파', '도와줘', '잠깐만']
  }

  if (content.includes('숨')) {
    return ['응', '아니', '답답해', '도와줘', '잠깐만', '괜찮아']
  }

  if (content.includes('자세')) {
    return ['응', '아니', '불편해', '잠깐만', '도와줘', '지금']
  }

  return baseWords
}

function delay(ms: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })
}
