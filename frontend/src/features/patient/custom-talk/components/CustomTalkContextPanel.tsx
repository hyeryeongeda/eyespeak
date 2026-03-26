import { type CSSProperties, useEffect, useRef } from 'react'
import type {
  CustomTalkContextSummary,
  CustomTalkConversationLogItem,
} from '../types'

interface CustomTalkContextPanelProps {
  context: CustomTalkContextSummary | null
  conversationLog: CustomTalkConversationLogItem[]
  previewText?: string
  mode?: 'default' | 'entry'
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}

const panelStyle: CSSProperties = {
  minHeight: 0,
  borderRadius: '24px',
  backgroundColor: '#fbfdff',
  border: '1px solid #dce6ed',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const chatListStyle: CSSProperties = {
  minHeight: 0,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const rowBaseStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
}

const emptyStyle: CSSProperties = {
  margin: 0,
  padding: '18px',
  borderRadius: '18px',
  backgroundColor: '#f6f9fc',
  border: '1px solid #d9e3eb',
  color: '#607086',
  fontSize: '16px',
  fontWeight: 600,
  textAlign: 'center',
}

const previewWrapStyle: CSSProperties = {
  paddingTop: '12px',
}

function getBubbleStyle(
  sender: CustomTalkConversationLogItem['sender'],
  isPreview = false,
): CSSProperties {
  const isGuardian = sender === 'guardian'
  const isPatient = sender === 'patient' || isPreview

  return {
    alignSelf: isGuardian ? 'flex-start' : 'flex-end',
    width: 'fit-content',
    maxWidth: '100%',
    padding: '18px 24px',
    borderRadius: '24px',
    backgroundColor: isGuardian ? '#f5f8fb' : isPatient ? '#e9f3ff' : '#f6f9fc',
    border: '1px solid #dbe4eb',
    color: '#243246',
    boxShadow: isPreview ? '0 12px 28px rgba(101, 128, 174, 0.12)' : 'none',
  }
}

function getVisibleConversationLog(
  conversationLog: CustomTalkConversationLogItem[],
  mode: 'default' | 'entry',
) {
  if (mode !== 'entry') {
    return conversationLog.slice(-1)
  }

  const latestContextItem = [...conversationLog]
    .reverse()
    .find(item => item.sender !== 'patient')

  return latestContextItem ? [latestContextItem] : []
}

export default function CustomTalkContextPanel({
  context,
  conversationLog,
  previewText,
  mode = 'default',
}: CustomTalkContextPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const isEntryMode = mode === 'entry'
  const visibleConversationLog = getVisibleConversationLog(conversationLog, mode)
  const shouldShowPreview = mode === 'default' && Boolean(previewText)
  const panelStyleByMode: CSSProperties = {
    ...panelStyle,
    borderRadius: isEntryMode ? '28px' : panelStyle.borderRadius,
    background: isEntryMode
      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #f8fbff 100%)'
      : panelStyle.backgroundColor,
    border: isEntryMode ? '1px solid #e3ebf2' : panelStyle.border,
    boxShadow: isEntryMode ? 'inset 0 1px 0 rgba(255, 255, 255, 0.72)' : 'none',
  }
  const chatListStyleByMode: CSSProperties = {
    ...chatListStyle,
    padding: isEntryMode ? '26px 28px' : chatListStyle.padding,
  }

  useEffect(() => {
    if (isEntryMode) {
      bottomRef.current?.scrollIntoView({ block: 'end' })
      return
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversationLog.length, isEntryMode, previewText, visibleConversationLog.length])

  void context

  return (
    <section style={wrapStyle} aria-label="\ub9de\ucda4 \ub300\ud654 \ub9e5\ub77d">
      <div style={panelStyleByMode}>
        <div style={chatListStyleByMode}>
          {visibleConversationLog.length === 0 ? (
            <div style={emptyStyle}>
              \ud45c\uc2dc\ud560 \ub300\ud654 \ub9e5\ub77d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.
            </div>
          ) : (
            visibleConversationLog.map(item => {
              const isGuardian = item.sender === 'guardian'

              return (
                <div
                  key={item.id}
                  style={{
                    ...rowBaseStyle,
                    alignItems: isGuardian ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div style={getBubbleStyle(item.sender, false)}>
                    <div
                      style={{
                        fontSize: isEntryMode ? '36px' : '19px',
                        fontWeight: 800,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'keep-all',
                      }}
                    >
                      {item.content || '\ub0b4\uc6a9 \uc5c6\uc74c'}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {shouldShowPreview ? (
        <div style={previewWrapStyle}>
          <div style={getBubbleStyle('patient', true)}>
            <div
              style={{
                fontSize: '19px',
                fontWeight: 800,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',
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
