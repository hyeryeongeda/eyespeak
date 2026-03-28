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
  statusLabel?: string
  statusMessage?: string | null
  statusTone?: 'default' | 'loading' | 'error' | 'success'
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
  width: '100%',
}

const panelStyle: CSSProperties = {
  minHeight: 0,
  borderRadius: '24px',
  backgroundColor: '#fbfdff',
  border: '1px solid #dce6ed',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  height: '100%',
}

const chatListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  overflow: 'auto',
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
  mode: 'default' | 'entry' = 'default',
  statusTone: 'default' | 'loading' | 'error' | 'success' = 'default',
): CSSProperties {
  const isGuardian = sender === 'guardian'
  const isPatient = sender === 'patient' || isPreview

  if (mode === 'entry') {
    const entryToneStyle: Record<
      NonNullable<CustomTalkContextPanelProps['statusTone']>,
      CSSProperties
    > = {
      default: {
        backgroundColor: '#ffffff',
        border: '1px solid rgba(219, 223, 228, 0.96)',
        color: '#2f3742',
        boxShadow: '0 20px 44px rgba(104, 116, 132, 0.12)',
      },
      loading: {
        backgroundColor: '#f7fbff',
        border: '1px solid #d7e4ef',
        color: '#5f738a',
        boxShadow: '0 20px 44px rgba(91, 122, 155, 0.1)',
      },
      error: {
        backgroundColor: '#fff5f5',
        border: '1px solid #efc8c8',
        color: '#a54f4f',
        boxShadow: '0 20px 44px rgba(178, 77, 77, 0.08)',
      },
      success: {
        backgroundColor: '#eef8f1',
        border: '1px solid #cce4d2',
        color: '#3f6e4c',
        boxShadow: '0 20px 44px rgba(63, 110, 76, 0.08)',
      },
    }

    return {
      alignSelf: 'center',
      width: 'fit-content',
      maxWidth: '88%',
      padding: '24px 28px',
      borderRadius: '22px',
      ...entryToneStyle[statusTone],
    }
  }

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
  statusLabel,
  statusMessage,
  statusTone = 'default',
}: CustomTalkContextPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const isEntryMode = mode === 'entry'
  const visibleConversationLog = getVisibleConversationLog(conversationLog, mode)
  const shouldShowPreview = mode === 'default' && Boolean(previewText)
  const shouldShowEntryStatus = isEntryMode && Boolean(statusMessage)
  const panelStyleByMode: CSSProperties = {
    ...panelStyle,
    borderRadius: isEntryMode ? '24px' : panelStyle.borderRadius,
    background: isEntryMode
      ? 'linear-gradient(180deg, #eef2f6 0%, #e3e9ef 100%)'
      : panelStyle.backgroundColor,
    border: isEntryMode ? '1px solid #d8e0e8' : panelStyle.border,
    boxShadow: isEntryMode
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 20px 48px rgba(40, 66, 90, 0.1)'
      : 'none',
  }
  const chatListStyleByMode: CSSProperties = {
    ...chatListStyle,
    padding: isEntryMode ? '24px' : chatListStyle.padding,
    alignItems: isEntryMode ? 'center' : undefined,
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
          {shouldShowEntryStatus ? (
            <div
              style={{
                ...rowBaseStyle,
                alignItems: 'center',
                width: '100%',
              }}
            >
              <div style={getBubbleStyle('guardian', false, mode, statusTone)}>
                {statusLabel ? (
                  <p
                    style={{
                      margin: '0 0 8px',
                      color: statusTone === 'default' ? '#6d7f95' : 'currentColor',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      opacity: statusTone === 'default' ? 1 : 0.92,
                    }}
                  >
                    {statusLabel}
                  </p>
                ) : null}
                <div
                  style={{
                    fontSize: 'clamp(1.05rem, 1.35vmax, 1.3rem)',
                    fontWeight: 800,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'keep-all',
                    textAlign: 'center',
                  }}
                >
                  {statusMessage}
                </div>
              </div>
            </div>
          ) : visibleConversationLog.length === 0 ? (
            isEntryMode ? null : (
              <div style={emptyStyle}>
                \ud45c\uc2dc\ud560 \ub300\ud654 \ub9e5\ub77d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.
              </div>
            )
          ) : (
            visibleConversationLog.map(item => {
              const isGuardian = item.sender === 'guardian'

              return (
                <div
                  key={item.id}
                  style={{
                    ...rowBaseStyle,
                    alignItems: isEntryMode
                      ? 'center'
                      : isGuardian
                        ? 'flex-start'
                        : 'flex-end',
                    width: '100%',
                  }}
                >
                  <div style={getBubbleStyle(item.sender, false, mode, statusTone)}>
                    <div
                      style={{
                        fontSize: isEntryMode ? 'clamp(1.15rem, 1.45vmax, 1.4rem)' : '19px',
                        fontWeight: 800,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'keep-all',
                        textAlign: isEntryMode ? 'center' : 'left',
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
