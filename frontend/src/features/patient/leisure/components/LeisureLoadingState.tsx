import type { CSSProperties } from 'react'
import { leisurePanelSurfaceStyle } from './leisureTheme'

const wrapStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '14px',
  textAlign: 'center',
}

const spinnerStyle: CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: '999px',
  border: '4px solid rgba(154, 173, 195, 0.24)',
  borderTopColor: '#6f87d9',
  animation: 'leisure-spin 0.9s linear infinite',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.35rem, 1.9vw, 1.6rem)',
  fontWeight: 900,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '520px',
  color: '#62768c',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

const animationStyle = `
  @keyframes leisure-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

interface LeisureLoadingStateProps {
  title: string
  description: string
}

export default function LeisureLoadingState({
  title,
  description,
}: LeisureLoadingStateProps) {
  return (
    <section style={wrapStyle} aria-busy="true" aria-live="polite">
      <style>{animationStyle}</style>
      <div aria-hidden style={spinnerStyle} />
      <h3 style={titleStyle}>{title}</h3>
      <p style={descriptionStyle}>{description}</p>
    </section>
  )
}
