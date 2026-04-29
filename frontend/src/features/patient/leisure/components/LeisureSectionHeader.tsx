import type { CSSProperties, ReactNode } from 'react'

const wrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.2rem, 1.6vw, 1.5rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const descriptionStyle: CSSProperties = {
  margin: '6px 0 0',
  color: '#698094',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

interface LeisureSectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export default function LeisureSectionHeader({
  title,
  description,
  action,
}: LeisureSectionHeaderProps) {
  return (
    <div style={wrapStyle}>
      <div>
        <h2 style={titleStyle}>{title}</h2>
        {description ? <p style={descriptionStyle}>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
