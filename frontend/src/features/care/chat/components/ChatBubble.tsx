import type { ChatMessage } from '../../types/chat'

interface ChatBubbleProps {
  message: ChatMessage
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const period = hours < 12 ? '오전' : '오후'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${period} ${displayHour}:${minutes}`
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isMine = message.senderRole === 'care'

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-2 rounded-2xl text-[16px] leading-relaxed break-words ${
            isMine
              ? 'bg-[#3D405B] text-[#FEFEFE] rounded-br-md'
              : 'bg-[#F1F5F9] text-[#1E293B] rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
        <p
          className={`text-[11px] text-[#94A3B8] mt-1 ${
            isMine ? 'text-right mr-1' : 'text-left ml-1'
          }`}
        >
          {formatTime(message.sentAt)}
        </p>
      </div>
    </div>
  )
}
