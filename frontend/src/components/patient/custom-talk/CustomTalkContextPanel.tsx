import { type CSSProperties, useEffect, useRef } from 'react'
import type {
  CustomTalkContextSummary,
  CustomTalkConversationLogItem,
} from '../../../features/patient/talk/types/customTalk'

interface CustomTalkContextPanelProps {
  context: CustomTalkContextSummary | null
  conversationLog: CustomTalkConversationLogItem[]
  previewText?: string
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
}

const panelStyle: CSSProperties = {
  minHeight: 0,
  borderRadius: '20px',
  backgroundColor: '#fbfdff',
  border: '1px solid #dce6ed',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const panelHeaderStyle: CSSProperties = {
  padding: '16px 18px 12px',
  borderBottom: '1px solid #e6eef4',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const panelTitleStyle: CSSProperties = {
  margin: 0,
  color: '#223247',
  fontSize: '18px',
  fontWeight: 900,
}

const tagWrapStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
}

const tagStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: '999px',
  backgroundColor: '#eef5ff',
  color: '#5879a6',
  fontSize: '13px',
  fontWeight: 700,
}

const chatListStyle: CSSProperties = {
  minHeight: 0,
  maxHeight: '520px',
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

const previewWrapStyle: CSSProperties = {
  padding: '0 18px 18px',
}

const previewLabelStyle: CSSProperties = {
  margin: '0 0 8px',
  color: '#95773a',
  fontSize: '12px',
  fontWeight: 900,
}

function getBubbleStyle(
  sender: CustomTalkConversationLogItem['sender'],
  isPreview = false,
): CSSProperties {
  const isGuardian = sender === 'guardian'
  const isPatient = sender === 'patient' || isPreview

  return {
    alignSelf: isGuardian ? 'flex-start' : 'flex-end',
    maxWidth: '88%',
    padding: '14px 16px',
    borderRadius: isGuardian ? '18px 18px 18px 6px' : '18px 18px 6px 18px',
    backgroundColor: isGuardian ? '#f5f8fb' : isPatient ? '#e9f3ff' : '#f6f9fc',
    border: '1px solid #dbe4eb',
    color: '#243246',
    boxShadow: isPreview ? '0 12px 28px rgba(101, 128, 174, 0.12)' : 'none',
  }
}

function getSenderLabel(sender: CustomTalkConversationLogItem['sender']) {
  if (sender === 'guardian') {
    return '보호자'
  }

  if (sender === 'patient') {
    return '환자'
  }

  return '시스템'
}

export default function CustomTalkContextPanel({
  context,
  conversationLog,
  previewText,
}: CustomTalkContextPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversationLog.length, previewText])

  return (
    <section style={wrapStyle} aria-label="맞춤대화 채팅 맥락">
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <h2 style={panelTitleStyle}>최근 대화</h2>
          <div style={tagWrapStyle}>
            {context?.todayMood ? <span style={tagStyle}>오늘 기분: {context.todayMood}</span> : null}
            {context?.todaySchedule ? (
              <span style={tagStyle}>오늘 일정: {context.todaySchedule}</span>
            ) : null}
            {context?.recentUsedExpressions?.slice(0, 2).map(item => (
              <span key={item} style={tagStyle}>
                최근 표현: {item}
              </span>
            ))}
          </div>
        </div>

        <div style={chatListStyle}>
          {conversationLog.length === 0 ? (
            <div style={emptyStyle}>아직 연결된 최근 대화가 없습니다.</div>
          ) : (
            conversationLog.map(item => {
              const isGuardian = item.sender === 'guardian'

              return (
                <div
                  key={item.id}
                  style={{
                    ...rowBaseStyle,
                    alignItems: isGuardian ? 'flex-start' : 'flex-end',
                  }}
                >
                  <span style={metaStyle}>
                    {getSenderLabel(item.sender)} · {item.createdAt}
                  </span>
                  <div style={getBubbleStyle(item.sender)}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.content || '내용 없음'}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {previewText ? (
        <div style={previewWrapStyle}>
          <p style={previewLabelStyle}>지금 만들고 있는 표현</p>
          <div style={getBubbleStyle('patient', true)}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {previewText}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
