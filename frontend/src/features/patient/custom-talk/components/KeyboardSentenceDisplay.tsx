import type { CSSProperties } from 'react'

interface KeyboardSentenceDisplayProps {
  sentence: string
  helperText: string
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

export default function KeyboardSentenceDisplay({
  sentence,
  helperText,
}: KeyboardSentenceDisplayProps) {
  return (
    <div style={wrapStyle}>
      {helperText ? <p style={helperStyle}>{helperText}</p> : null}
      <p style={sentenceStyle}>{sentence || '입력한 문장이 여기에 표시됩니다.'}</p>
    </div>
  )
}
