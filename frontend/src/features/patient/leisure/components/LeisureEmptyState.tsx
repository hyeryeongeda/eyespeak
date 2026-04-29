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
    'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 249, 252, 0.96) 100%)',
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

interface LeisureEmptyStateProps {
  title: string
  description: string
}

export default function LeisureEmptyState({
  title,
  description,
}: LeisureEmptyStateProps) {
  return (
    <section style={wrapStyle}>
      <h3 style={titleStyle}>{title}</h3>
      <p style={descriptionStyle}>{description}</p>
    </section>
  )
}
