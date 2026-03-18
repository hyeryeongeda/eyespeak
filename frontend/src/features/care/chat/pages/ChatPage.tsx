import { useState } from 'react'
import ChatInput from '../components/ChatInput'
import ChatMessageList from '../components/ChatMessageList'
import { useChatSocket } from '../hooks/useChatSocket'
import type { ChatMessage } from '../../types/chat'

export default function ChatPage() {
  const [roomId] = useState<string | null>(null)
  const [messages] = useState<ChatMessage[]>([])
  const { connected, sendMessage } = useChatSocket(roomId)

  const handleSend = (content: string) => {
    sendMessage(content)
  }

  return (
    <div data-chat-page>
      <h1>채팅</h1>
      <ChatMessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={!connected} />
    </div>
  )
}
