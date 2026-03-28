import type { CSSProperties } from 'react'
import type { LeisureCategory } from '../../../../types/leisure'
import { leisureCardBaseStyle, leisurePillStyle, leisureToneMap } from './leisureTheme'

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.6rem, 2.2vw, 2.05rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#60758b',
  fontSize: '17px',
  fontWeight: 700,
  lineHeight: 1.45,
}

interface LeisureCategoryCardProps {
  category: LeisureCategory
  contentCount: number
  slotId: string
  badge?: string
  disabled?: boolean
  variant?: 'default' | 'hero'
  onSelect: () => void
}

export default function LeisureCategoryCard({
  category,
  contentCount,
  slotId,
  badge,
  disabled = false,
  variant = 'default',
  onSelect,
}: LeisureCategoryCardProps) {
  const toneStyle = leisureToneMap[category.tone]
  const isHero = variant === 'hero'

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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: toneStyle.background,
        borderColor: toneStyle.border,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.64 : 1,
        appearance: 'none',
        textAlign: 'left',
        padding: isHero ? '18px 22px 22px' : leisureCardBaseStyle.padding,
      }}
      aria-label={`${category.label} 카테고리`}
    >
      <span style={{ ...leisurePillStyle, color: toneStyle.accent }}>
        {badge ?? `콘텐츠 ${contentCount}개`}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3
          style={{
            ...titleStyle,
            fontSize: isHero ? 'clamp(2.35rem, 3.6vw, 3.1rem)' : titleStyle.fontSize,
            lineHeight: isHero ? 1.02 : titleStyle.lineHeight,
          }}
        >
          {category.label}
        </h3>
        <p style={descriptionStyle}>{category.description}</p>
      </div>
    </button>
  )
}
