import type { CSSProperties } from 'react'

interface KeyboardSentenceDisplayProps {
  sentence: string
  helperText: string
}

const wrapStyle: CSSProperties = {
  minHeight: 0,
  height: '100%',
  padding: '18px 20px',
  borderRadius: '24px',
  backgroundColor: '#ffffff',
  border: '1px solid #dde7ed',
  boxShadow: '0 18px 40px rgba(63, 86, 111, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '10px',
  overflow: 'hidden',
}

const helperStyle: CSSProperties = {
  margin: 0,
  color: '#607389',
  fontSize: '13px',
  fontWeight: 700,
}

const sentenceStyle: CSSProperties = {
  margin: 0,
  minHeight: '60px',
  color: '#223247',
  fontSize: 'clamp(1.2rem, 2vw, 1.7rem)',
  fontWeight: 900,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  overflow: 'auto',
}

export default function KeyboardSentenceDisplay({
  sentence,
  helperText,
}: KeyboardSentenceDisplayProps) {
  return (
    <div style={wrapStyle}>
      <p style={helperStyle}>{helperText}</p>
      <p style={sentenceStyle}>{sentence || '입력한 문장이 여기에 표시됩니다.'}</p>
    </div>
  )
}
