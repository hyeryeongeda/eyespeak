import { useEffect, useRef, useCallback } from 'react'
import type { ChatMessage } from '../../types/chat'
import ChatBubble from './ChatBubble'

interface ChatMessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[date.getDay()]
  return `${year}년 ${month}월 ${day}일 ${weekday}요일`
}

function getDateKey(isoString: string): string {
  return new Date(isoString).toLocaleDateString()
}

export default function ChatMessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const prevScrollHeightRef = useRef(0)
  const isInitialLoadRef = useRef(true)

  // 새 메시지 수신 시 자동 스크롤
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const prevCount = prevMessageCountRef.current
    const currentCount = messages.length

    if (currentCount > prevCount) {
      if (isInitialLoadRef.current) {
        // 초기 로드: 최하단으로 스크롤
        bottomRef.current?.scrollIntoView()
        isInitialLoadRef.current = false
      } else if (prevCount > 0 && currentCount - prevCount < 5) {
        // 실시간 새 메시지: 최하단으로 부드럽게 스크롤
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else {
        // 이전 메시지 로드: 스크롤 위치 유지
        const newScrollHeight = container.scrollHeight
        container.scrollTop = newScrollHeight - prevScrollHeightRef.current
      }
    }

    prevMessageCountRef.current = currentCount
  }, [messages])

  // 상단 무한 스크롤 감지
  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container || isLoading || !hasMore) return

    if (container.scrollTop < 50) {
      prevScrollHeightRef.current = container.scrollHeight
      onLoadMore()
    }
  }, [isLoading, hasMore, onLoadMore])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
      {isLoading && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-[14px] text-[#94A3B8]">메시지가 없습니다.</p>
        </div>
      )}

      {messages.map((msg, index) => {
        const showDate =
          index === 0 ||
          getDateKey(messages[index - 1].sentAt) !== getDateKey(msg.sentAt)

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-4">
                <span className="text-[12px] text-[#94A3B8] bg-[#F8FAFC] px-3 py-1 rounded-full">
                  {formatDate(msg.sentAt)}
                </span>
              </div>
            )}
            <ChatBubble message={msg} />
          </div>
        )
      })}

      <div ref={bottomRef} />
    </div>
  )
}
