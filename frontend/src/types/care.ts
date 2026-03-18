export type ChatMessageSender = 'guardian' | 'patient'

export interface ChatMessage {
  id: string
  sender: ChatMessageSender
  text: string
  timestamp: Date
}

export type SttState = 'idle' | 'recording' | 'done'
