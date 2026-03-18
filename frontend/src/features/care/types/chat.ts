/** Care 채팅 기능 타입 */

export interface ChatMessage {
  id: string
  senderId: string
  senderRole: 'care' | 'patient'
  content: string
  sentAt: string
}

export interface ChatRoom {
  id: string
  patientId: string
  lastMessage?: ChatMessage
}
