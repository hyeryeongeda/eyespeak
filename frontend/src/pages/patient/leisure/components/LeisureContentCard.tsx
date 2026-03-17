import type { CSSProperties } from 'react'
import type { LeisureCardTone, LeisureContent } from '../../../../types/leisure'
import {
  leisureCardBaseStyle,
  leisurePillStyle,
  leisureToneMap,
  lineClampThreeStyle,
  lineClampTwoStyle,
} from './leisureTheme'

type LeisureContentCardEmphasis = 'standard' | 'hero'

const thumbnailStyleByEmphasis: Record<LeisureContentCardEmphasis, CSSProperties> = {
  standard: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: '20px',
    objectFit: 'cover',
    border: '1px solid rgba(215, 223, 235, 0.8)',
    backgroundColor: '#eef2f6',
  },
  hero: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: '22px',
    objectFit: 'cover',
    border: '1px solid rgba(215, 223, 235, 0.82)',
    backgroundColor: '#eef2f6',
  },
}

interface LeisureContentCardProps {
  content: LeisureContent
  tone?: LeisureCardTone
  emphasis?: LeisureContentCardEmphasis
  slotId: string
  onSelect: () => void
}

export default function LeisureContentCard({
  content,
  tone = 'sky',
  emphasis = 'standard',
  slotId,
  onSelect,
}: LeisureContentCardProps) {
  const toneStyle = leisureToneMap[tone]
  const isHero = emphasis === 'hero'

  return (
    <button
      type="button"
      className="leisure-interactive"
      onClick={onSelect}
      data-leisure-slot={slotId}
      data-patient-target={slotId}
      style={{
        ...leisureCardBaseStyle,
        height: '100%',
        background: 'rgba(255, 255, 255, 0.92)',
        borderColor: toneStyle.border,
        cursor: 'pointer',
        appearance: 'none',
        textAlign: 'left',
      }}
      aria-label={`${content.title} 재생`}
    >
      <img src={content.thumbnailUrl} alt="" style={thumbnailStyleByEmphasis[emphasis]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ ...leisurePillStyle, color: toneStyle.accent }}>YouTube</span>
        {content.durationLabel ? <span style={leisurePillStyle}>{content.durationLabel}</span> : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3
          style={{
            ...lineClampTwoStyle,
            margin: 0,
            color: '#203042',
            fontSize: isHero ? 'clamp(1.5rem, 2vw, 1.95rem)' : 'clamp(1.1rem, 1.5vw, 1.35rem)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
          }}
        >
          {content.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: '#5f7387',
            fontSize: '15px',
            fontWeight: 800,
          }}
        >
          {content.channelName}
        </p>

        <p
          style={{
            ...lineClampThreeStyle,
            margin: 0,
            color: '#708399',
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {content.description}
        </p>
      </div>
    </button>
  )
}
