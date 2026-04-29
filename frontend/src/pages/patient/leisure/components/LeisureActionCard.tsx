import type { CSSProperties } from 'react'
import type { LeisureCardTone } from '../../../../types/leisure'
import { leisureCardBaseStyle, leisurePillStyle, leisureToneMap } from './leisureTheme'

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.2rem, 1.6vw, 1.45rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#677b90',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

interface LeisureActionCardProps {
  title: string
  description: string
  tone?: LeisureCardTone
  disabled?: boolean
  busy?: boolean
  badge?: string
  variant?: 'default' | 'hero'
  slotId: string
  onSelect: () => void
}

export default function LeisureActionCard({
  title,
  description,
  tone = 'slate',
  disabled = false,
  busy = false,
  badge,
  variant = 'default',
  slotId,
  onSelect,
}: LeisureActionCardProps) {
  const toneStyle = leisureToneMap[tone]
  const isHero = variant === 'hero'
  const badgeText = busy ? '처리 중' : badge ?? '동작'
  const titleText = busy ? `${title}...` : title

  return (
    <button
      type="button"
      className="leisure-interactive"
      onClick={onSelect}
      disabled={disabled}
      data-leisure-slot={slotId}
      data-patient-target={slotId}
      style={{
        ...leisureCardBaseStyle,
        height: '100%',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: toneStyle.background,
        borderColor: toneStyle.border,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.64 : 1,
        appearance: 'none',
        textAlign: 'left',
        padding: isHero ? '18px 22px 22px' : leisureCardBaseStyle.padding,
      }}
    >
      <span style={{ ...leisurePillStyle, color: toneStyle.accent }}>{badgeText}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3
          style={{
            ...titleStyle,
            fontSize: isHero ? 'clamp(1.95rem, 2.8vw, 2.45rem)' : titleStyle.fontSize,
            lineHeight: isHero ? 1.05 : titleStyle.lineHeight,
          }}
        >
          {titleText}
        </h3>
        <p style={descriptionStyle}>{description}</p>
      </div>
    </button>
  )
}
