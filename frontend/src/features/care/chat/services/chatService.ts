import { apiClient } from '../../../../services/apiClient'
import { API_ENDPOINTS } from '../../../../services/apiEndpoints'
import { getActiveApiMode } from '../../../../config/env'
import type { ChatHistoryResponse, ChatMessageDto } from '../../types/chat'

// ----- Mock 데이터 -----

const MOCK_DELAY_MS = 400

const mockMessages: ChatMessageDto[] = [
  {
    messageId: 1,
    matchingId: 1,
    senderId: 2,
    senderRole: 'PATIENT',
    contentType: 'TEXT',
    text: '안녕하세요',
    timestamp: '2026-03-22T09:00:00.000Z',
  },
  {
    messageId: 2,
    matchingId: 1,
    senderId: 1,
    senderRole: 'GUARDIAN',
    contentType: 'TEXT',
    text: '안녕! 오늘 기분은 어때?',
    timestamp: '2026-03-22T09:01:00.000Z',
  },
  {
    messageId: 3,
    matchingId: 1,
    senderId: 2,
    senderRole: 'PATIENT',
    contentType: 'PHRASE',
    text: '좋아요',
    timestamp: '2026-03-22T09:02:00.000Z',
  },
  {
    messageId: 4,
    matchingId: 1,
    senderId: 1,
    senderRole: 'GUARDIAN',
    contentType: 'TEXT',
    text: '다행이다! 점심은 뭐 먹고 싶어?',
    timestamp: '2026-03-22T09:05:00.000Z',
  },
  {
    messageId: 5,
    matchingId: 1,
    senderId: 2,
    senderRole: 'PATIENT',
    contentType: 'TEXT',
    text: '된장찌개 먹고 싶어요',
    timestamp: '2026-03-22T09:06:00.000Z',
  },
  {
    messageId: 6,
    matchingId: 1,
    senderId: 1,
    senderRole: 'GUARDIAN',
    contentType: 'TEXT',
    text: '알겠어, 준비할게!',
    timestamp: '2026-03-22T09:07:00.000Z',
  },
]

async function fetchMockChatHistory(
  _matchingId: number,
  cursor?: number | null,
  size = 20,
): Promise<ChatHistoryResponse> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS))

  let filtered = mockMessages
  if (cursor != null) {
    filtered = mockMessages.filter(m => m.messageId < cursor)
  }

  // 최신순 정렬 (API 응답이 최신순)
  const sorted = [...filtered].sort((a, b) => b.messageId - a.messageId)
  const paged = sorted.slice(0, size)

  return {
    messages: paged,
    hasNext: paged.length < sorted.length,
    nextCursor: paged.length > 0 ? paged[paged.length - 1].messageId : null,
  }
}

// ----- 실제 API -----

async function fetchRealChatHistory(
  matchingId: number,
  accessToken: string,
  cursor?: number | null,
  size = 20,
): Promise<ChatHistoryResponse> {
  const params: Record<string, unknown> = { size }
  if (cursor != null) {
    params.cursor = cursor
  }

  return apiClient.get<ChatHistoryResponse>(
    `${API_ENDPOINTS.CHAT_MESSAGES}/${matchingId}/messages`,
    { params, accessToken },
  )
}

// ----- 공개 API -----

export async function fetchChatHistory(
  matchingId: number,
  accessToken: string,
  cursor?: number | null,
  size = 20,
): Promise<ChatHistoryResponse> {
  const mode = getActiveApiMode()
  if (mode === 'mock') {
    return fetchMockChatHistory(matchingId, cursor, size)
  }
  return fetchRealChatHistory(matchingId, accessToken, cursor, size)
}
