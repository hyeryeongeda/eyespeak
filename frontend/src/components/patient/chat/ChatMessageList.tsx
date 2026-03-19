import { type CSSProperties, useEffect, useRef } from 'react'
import type { PatientChatMessage } from '../../../types/chat'

interface ChatMessageListProps {
  messages: PatientChatMessage[]
  activeMessageId?: string | null
}

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
  gap: '4px',
}

const metaStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#7b8a9f',
}

const emptyStyle: CSSProperties = {
  margin: 'auto 0',
  padding: '18px',
  borderRadius: '18px',
  backgroundColor: '#f6f9fc',
  border: '1px solid #d9e3eb',
  color: '#607086',
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
}

function getBubbleStyle(message: PatientChatMessage, isActive: boolean): CSSProperties {
  const isCaregiver = message.sender === 'caregiver'

  return {
    alignSelf: isCaregiver ? 'flex-start' : 'flex-end',
    maxWidth: '88%',
    padding: '14px 16px',
    borderRadius: isCaregiver ? '18px 18px 18px 6px' : '18px 18px 6px 18px',
    backgroundColor: isCaregiver ? '#f5f8fb' : '#e9f3ff',
    border: isActive ? '2px solid #7ea2d9' : '1px solid #dbe4eb',
    boxShadow: isActive ? '0 12px 28px rgba(101, 128, 174, 0.12)' : 'none',
    color: '#243246',
  }
}

function getStatusLabel(message: PatientChatMessage) {
  if (message.sender === 'patient') {
    return message.type === 'word_combination'
      ? '단어 조합'
      : message.type === 'manual_text'
        ? '직접 입력'
        : '빠른 응답'
  }

  if (message.status === 'unread') {
    return '미응답'
  }

  if (message.status === 'pending_reply') {
    return '응답 중'
  }

  if (message.status === 'replied') {
    return '응답 완료'
  }

  return '수신됨'
}

export default function ChatMessageList({
  messages,
  activeMessageId = null,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  if (messages.length === 0) {
    return <div style={emptyStyle}>아직 수신된 보호자 대화가 없습니다.</div>
  }

  return (
    <div style={listWrapStyle}>
      {messages.map(message => {
        const isCaregiver = message.sender === 'caregiver'
        const isActive = activeMessageId === message.id

        return (
          <div
            key={message.id}
            style={{
              ...rowBaseStyle,
              alignItems: isCaregiver ? 'flex-start' : 'flex-end',
            }}
          >
            <span style={metaStyle}>
              {isCaregiver ? '보호자' : '환자'} · {message.createdAt} · {getStatusLabel(message)}
              {message.type === 'stt' ? ' · STT' : null}
            </span>
            <div style={getBubbleStyle(message, isActive)}>
              <div
                style={{
                  fontSize: '15px',
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
      <div ref={bottomRef} />
    </div>
  )
}
