/** Care 채팅 기능 타입 */

export interface ChatMessage {
  id: string
  senderId: string
  senderRole: 'care' | 'patient'
  content: string
  contentType: 'TEXT' | 'PHRASE' | 'EXPRESSION'
  sentAt: string
}

export interface ChatRoom {
  id: string
  patientId: string
  lastMessage?: ChatMessage
}

/** REST API 응답 — GET /chat/{matchingId}/messages */
export interface ChatMessageDto {
  messageId: number
  matchingId: number
  senderId: number
  senderRole: 'PATIENT' | 'GUARDIAN'
  contentType: 'TEXT' | 'PHRASE' | 'EXPRESSION'
  text: string
  timestamp: string
}

export interface ChatHistoryResponse {
  messages: ChatMessageDto[]
  hasNext: boolean
  nextCursor: number | null
}
