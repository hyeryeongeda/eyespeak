import {
  PATIENT_CHAT_SUGGESTION_DELAY_MS,
  getPatientChatWordBank,
} from './mockPatientChatService'
import type {
  PatientChatMessage,
  PatientSuggestedResponse,
} from '../types/chat'

interface SuggestionRequest {
  message: PatientChatMessage
  history: PatientChatMessage[]
}

const DEFAULT_RESPONSES = ['응', '아니', '도와줘', '잘 모르겠어']

const RULE_BASED_RESPONSES: Array<{
  intentKey: string
  matchers: string[]
  responses: string[]
}> = [
  {
    intentKey: 'water',
    matchers: ['물'],
    responses: ['응', '아니', '조금만', '나중에'],
  },
  {
    intentKey: 'okay',
    matchers: ['괜찮아'],
    responses: ['응', '아니', '도와줘', '잘 모르겠어'],
  },
  {
    intentKey: 'pain',
    matchers: ['통증', '아파'],
    responses: ['응', '아니', '조금 아파', '많이 아파'],
  },
  {
    intentKey: 'posture',
    matchers: ['자세'],
    responses: ['응', '아니', '잠깐만', '불편해'],
  },
  {
    intentKey: 'breathing',
    matchers: ['숨', '호흡'],
    responses: ['응', '아니', '도와줘', '답답해'],
  },
]

export const MAX_SUGGESTION_RETRIES = 2

export async function buildMockSuggestedResponses({
  message,
  history,
}: SuggestionRequest): Promise<PatientSuggestedResponse[]> {
  await delay(PATIENT_CHAT_SUGGESTION_DELAY_MS)

  const content = message.content.trim()

  if (!content) {
    throw new Error('보호자 메시지가 비어 있어 추천 응답을 만들 수 없습니다.')
  }

  if (message.meta?.suggestionMode === 'failure') {
    throw new Error('추천 응답 생성에 실패했습니다. 직접 입력을 사용해 주세요.')
  }

  if (message.meta?.suggestionMode === 'empty') {
    return []
  }

  const recentHistory = safelySliceHistory(history)
  const matchedRule =
    RULE_BASED_RESPONSES.find(rule => rule.matchers.some(matcher => content.includes(matcher))) ??
    null

  const contextBoost =
    recentHistory.some(item => item.sender === 'patient' && item.content.includes('도와')) &&
    !matchedRule?.responses.includes('도와줘')
      ? ['도와줘']
      : []

  const responseLabels = [...contextBoost, ...(matchedRule?.responses ?? DEFAULT_RESPONSES)]
  const dedupedLabels = [...new Set(responseLabels)].slice(0, 4)
  const source = matchedRule ? (contextBoost.length > 0 ? 'context' : 'rule') : 'fallback'
  const intentKey = matchedRule?.intentKey ?? 'fallback'

  return dedupedLabels.map((label, index) => ({
    id: `${message.id}-suggestion-${index + 1}`,
    label,
    intentKey,
    source,
    rank: index + 1,
  }))
}

export function buildManualWordBank(message: PatientChatMessage | null, history: PatientChatMessage[]) {
  const fromMessage = getPatientChatWordBank(message)
  const contextWords = history
    .slice(-3)
    .map(item => item.content.trim())
    .filter(Boolean)
    .flatMap(content => content.split(/\s+/))
    .filter(word => word.length <= 6)

  return [...new Set([...fromMessage, ...contextWords])].slice(0, 12)
}

function safelySliceHistory(history: PatientChatMessage[]) {
  try {
    return history.slice(-6)
  } catch {
    return []
  }
}

function delay(ms: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })
}
