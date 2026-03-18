import type { ChatMessage } from '../../types/chat'

interface ChatMessageListProps {
  messages: ChatMessage[]
}

export default function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div data-chat-message-list>
      {messages.length === 0 ? (
        <p>메시지가 없습니다.</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id}>{m.content}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
