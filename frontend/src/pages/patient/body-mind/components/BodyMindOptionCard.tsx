import type { CSSProperties } from 'react'
import type { BodyMindCardTone } from '../../../../types/communication'

const toneStyleMap: Record<BodyMindCardTone, { background: string; accent: string }> = {
  sky: {
    background: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
    accent: '#6f87d9',
  },
  sand: {
    background: 'linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)',
    accent: '#d1a749',
  },
  mint: {
    background: 'linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)',
    accent: '#5f9f8e',
  },
  rose: {
    background: 'linear-gradient(135deg, #fff0ef 0%, #ffe5e1 100%)',
    accent: '#d67564',
  },
  slate: {
    background: 'linear-gradient(135deg, #f5f5f8 0%, #eef0f5 100%)',
    accent: '#7a8798',
  },
}

const baseStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  borderRadius: '24px',
  border: '1px solid rgba(204, 216, 226, 0.95)',
  boxShadow: '0 16px 36px rgba(40, 66, 90, 0.08)',
  padding: '20px 18px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  textAlign: 'center',
  minHeight: 'clamp(148px, 28vh, 280px)',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
}

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.08rem, 1.85vw, 1.45rem)',
  fontWeight: 800,
  lineHeight: 1.25,
  color: '#203042',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(0.88rem, 1.3vw, 1rem)',
  fontWeight: 600,
  lineHeight: 1.4,
  color: '#647587',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '28px',
  padding: '0 12px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  fontSize: '12px',
  fontWeight: 800,
  color: '#516375',
}

interface BodyMindOptionCardProps {
  title: string
  description?: string
  tone?: BodyMindCardTone
  selected?: boolean
  disabled?: boolean
  badge?: string
  className?: string
  style?: CSSProperties
  onSelect?: () => void
}

export default function BodyMindOptionCard({
  title,
  description,
  tone = 'sky',
  selected = false,
  disabled = false,
  badge,
  className,
  style,
  onSelect,
}: BodyMindOptionCardProps) {
  const toneStyle = toneStyleMap[tone]
  const resolvedStyle: CSSProperties = {
    ...baseStyle,
    background: toneStyle.background,
    borderColor: selected ? toneStyle.accent : 'rgba(204, 216, 226, 0.95)',
    boxShadow: selected
      ? `0 0 0 2px ${toneStyle.accent}, 0 24px 54px rgba(40, 66, 90, 0.14)`
      : baseStyle.boxShadow,
    opacity: disabled ? 0.65 : 1,
    cursor: onSelect && !disabled ? 'pointer' : 'default',
    appearance: 'none',
    ...style,
  }

  const content = (
    <>
      {badge ? <span style={badgeStyle}>{badge}</span> : null}
      <h2 style={labelStyle}>{title}</h2>
      {description ? <p style={descriptionStyle}>{description}</p> : null}
    </>
  )

  if (!onSelect) {
    return (
      <section className={className} style={resolvedStyle}>
        {content}
      </section>
    )
  }

  const buttonClassName = className
    ? `body-mind-option-card ${className}`
    : 'body-mind-option-card'

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      style={resolvedStyle}
    >
      {content}
    </button>
  )
}
