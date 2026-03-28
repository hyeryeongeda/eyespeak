import type { CSSProperties } from 'react'

interface KeyboardSentenceDisplayProps {
  sentence: string
  helperText: string
  statusLabel?: string
  statusMessage?: string | null
  statusTone?: 'default' | 'loading' | 'error' | 'success'
}

const wrapStyle: CSSProperties = {
  minHeight: 0,
  height: '100%',
  width: '100%',
  padding: '14px 18px',
  borderRadius: '22px',
  backgroundColor: '#ffffff',
  border: '1px solid #dde7ed',
  boxShadow: '0 18px 40px rgba(63, 86, 111, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '8px',
  overflow: 'hidden',
}

const helperStyle: CSSProperties = {
  margin: 0,
  color: '#607389',
  fontSize: 'clamp(0.72rem, 1.1vmin, 0.82rem)',
  fontWeight: 700,
  lineHeight: 1.45,
}

const sentenceStyle: CSSProperties = {
  margin: 0,
  minHeight: '48px',
  color: '#223247',
  fontSize: 'clamp(1.05rem, 2.05vmin, 1.55rem)',
  fontWeight: 900,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
}

const statusLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.82rem',
  fontWeight: 800,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const statusMessageStyle: CSSProperties = {
  margin: 0,
  color: '#223247',
  fontSize: 'clamp(1rem, 1.8vmin, 1.35rem)',
  fontWeight: 800,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  wordBreak: 'keep-all',
  textAlign: 'center',
}

export default function KeyboardSentenceDisplay({
  sentence,
  helperText,
  statusLabel,
  statusMessage,
  statusTone = 'default',
}: KeyboardSentenceDisplayProps) {
  const toneStyle: Record<
    NonNullable<KeyboardSentenceDisplayProps['statusTone']>,
    CSSProperties
  > = {
    default: {},
    loading: {
      backgroundColor: '#f7fbff',
      border: '1px solid #d7e4ef',
      boxShadow: '0 18px 40px rgba(91, 122, 155, 0.1)',
    },
    error: {
      backgroundColor: '#fff5f5',
      border: '1px solid #efc8c8',
      boxShadow: '0 18px 40px rgba(178, 77, 77, 0.08)',
    },
    success: {
      backgroundColor: '#eef8f1',
      border: '1px solid #cce4d2',
      boxShadow: '0 18px 40px rgba(63, 110, 76, 0.08)',
    },
  }
  const toneTextStyle: Record<
    NonNullable<KeyboardSentenceDisplayProps['statusTone']>,
    CSSProperties
  > = {
    default: {},
    loading: { color: '#5f738a' },
    error: { color: '#a54f4f' },
    success: { color: '#3f6e4c' },
  }
  const shouldShowStatus = Boolean(statusMessage)

  return (
    <div
      style={{
        ...wrapStyle,
        ...toneStyle[statusTone],
        justifyContent: shouldShowStatus ? 'center' : wrapStyle.justifyContent,
      }}
    >
      {shouldShowStatus ? (
        <>
          {statusLabel ? (
            <p style={{ ...statusLabelStyle, ...toneTextStyle[statusTone] }}>{statusLabel}</p>
          ) : null}
          <p style={{ ...statusMessageStyle, ...toneTextStyle[statusTone] }}>{statusMessage}</p>
        </>
      ) : (
        <>
          {helperText ? <p style={helperStyle}>{helperText}</p> : null}
          <p style={sentenceStyle}>{sentence || '입력한 문장이 여기에 표시됩니다.'}</p>
        </>
      )}
    </div>
  )
}
