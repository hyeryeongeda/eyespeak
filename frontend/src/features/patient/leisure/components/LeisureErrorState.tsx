import type { CSSProperties } from 'react'
import { leisurePanelSurfaceStyle } from './leisureTheme'

const wrapStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  textAlign: 'center',
  background:
    'linear-gradient(180deg, rgba(255, 250, 249, 0.96) 0%, rgba(255, 243, 240, 0.98) 100%)',
  border: '1px solid rgba(238, 201, 194, 0.92)',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#8f4e43',
  fontSize: 'clamp(1.35rem, 1.9vw, 1.6rem)',
  fontWeight: 900,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '540px',
  color: '#8a5c55',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

interface LeisureErrorStateProps {
  title: string
  description: string
}

export default function LeisureErrorState({
  title,
  description,
}: LeisureErrorStateProps) {
  return (
    <section style={wrapStyle} role="alert">
      <h3 style={titleStyle}>{title}</h3>
      <p style={descriptionStyle}>{description}</p>
    </section>
  )
}
