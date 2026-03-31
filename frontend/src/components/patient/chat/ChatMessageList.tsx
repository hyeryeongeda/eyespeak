import { type CSSProperties, useLayoutEffect, useRef } from 'react'
import type { PatientChatMessage } from '../../../types/chat'

interface ChatMessageListProps {
  messages: PatientChatMessage[]
  activeMessageId?: string | null
}

const AUTO_FOLLOW_THRESHOLD_PX = 72

const listWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const rowBaseStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const emptyStyle: CSSProperties = {
  margin: 'auto 0',
  padding: '18px',
  borderRadius: '18px',
  backgroundColor: '#f6f9fc',
  border: '1px solid #d9e3eb',
  color: '#607086',
  fontSize: '28px',
  fontWeight: 600,
  textAlign: 'center',
}

function getBubbleStyle(message: PatientChatMessage, isActive: boolean): CSSProperties {
  const isGuardian = message.sender === 'guardian'

  return {
    alignSelf: isGuardian ? 'flex-start' : 'flex-end',
    maxWidth: '88%',
    padding: '14px 16px',
    borderRadius: isGuardian ? '18px 18px 18px 6px' : '18px 18px 6px 18px',
    backgroundColor: isGuardian ? '#f5f8fb' : '#e9f3ff',
    border: isActive ? '2px solid #7ea2d9' : '1px solid #dbe4eb',
    boxShadow: isActive ? '0 12px 28px rgba(101, 128, 174, 0.12)' : 'none',
    color: '#243246',
  }
}

function isScrolledNearBottom(container: HTMLDivElement) {
  const distanceFromBottom =
    container.scrollHeight - container.clientHeight - container.scrollTop

  return distanceFromBottom <= AUTO_FOLLOW_THRESHOLD_PX
}

function scrollToBottom(container: HTMLDivElement) {
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'auto',
  })
}

export default function ChatMessageList({
  messages,
  activeMessageId = null,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasInitializedScrollRef = useRef(false)
  const prevMessageCountRef = useRef(0)
  const shouldAutoFollowRef = useRef(true)

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
      prevMessageCountRef.current = messages.length
      return
    }

    if (messages.length === 0) {
      hasInitializedScrollRef.current = false
      shouldAutoFollowRef.current = true
      prevMessageCountRef.current = 0
      return
    }

    const prevMessageCount = prevMessageCountRef.current
    const hasNewMessage = messages.length > prevMessageCount

    if (!hasInitializedScrollRef.current) {
      // 초기 진입 시 강제 auto-scroll 방지: 첫 위치는 최신 메시지에 즉시 고정한다.
      scrollToBottom(container)
      hasInitializedScrollRef.current = true
      shouldAutoFollowRef.current = true
      prevMessageCountRef.current = messages.length
      return
    }

    if (hasNewMessage && shouldAutoFollowRef.current) {
      scrollToBottom(container)
      shouldAutoFollowRef.current = true
    }

    prevMessageCountRef.current = messages.length
  }, [messages.length])

  const handleScroll = () => {
    const container = containerRef.current

    if (!container) {
      return
    }

    // 사용자가 수동 스크롤 중이면 자동 추적을 멈추고, 하단 근처로 돌아오면 다시 허용한다.
    shouldAutoFollowRef.current = isScrolledNearBottom(container)
  }

  if (messages.length === 0) {
    return <div style={emptyStyle}>아직 수신된 보호자 대화가 없습니다.</div>
  }

  return (
    <div ref={containerRef} style={listWrapStyle} onScroll={handleScroll}>
      {messages.map(message => {
        const isGuardian = message.sender === 'guardian'
        const isActive = activeMessageId === message.id

        return (
          <div
            key={message.id}
            style={{
              ...rowBaseStyle,
              alignItems: isGuardian ? 'flex-start' : 'flex-end',
            }}
          >
            <div style={getBubbleStyle(message, isActive)}>
              <div
                style={{
                  fontSize: '30px',
                  fontWeight: 700,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content || '내용 없음'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
