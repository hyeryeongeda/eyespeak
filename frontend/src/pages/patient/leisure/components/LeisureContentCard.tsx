import type { CSSProperties } from 'react'
import type { LeisureCardTone, LeisureContent } from '../../../../types/leisure'
import { leisureCardBaseStyle, leisureToneMap, lineClampTwoStyle } from './leisureTheme'

type LeisureContentCardEmphasis = 'standard' | 'hero'

const thumbnailStyleByEmphasis: Record<LeisureContentCardEmphasis, CSSProperties> = {
  standard: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    objectFit: 'cover',
    display: 'block',
  },
  hero: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    objectFit: 'cover',
    display: 'block',
  },
}

const imageWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  borderRadius: '20px',
  overflow: 'hidden',
  border: '1px solid rgba(215, 223, 235, 0.8)',
  backgroundColor: '#eef2f6',
}

const metaWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '16px 16px 18px',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.2rem, 1.8vw, 1.6rem)',
  fontWeight: 900,
  lineHeight: 1.35,
}

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: '#6a8095',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.4,
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
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.92)',
        borderColor: toneStyle.border,
        cursor: 'pointer',
        appearance: 'none',
        overflow: 'hidden',
        textAlign: 'left',
      }}
      aria-label={`${content.title} 재생`}
    >
      <div style={imageWrapStyle}>
        <img src={content.thumbnailUrl} alt="" style={thumbnailStyleByEmphasis[emphasis]} />
      </div>
      <div style={metaWrapStyle}>
        <h3 style={{ ...titleStyle, ...lineClampTwoStyle }}>{content.title}</h3>
        <p style={{ ...subtitleStyle, ...lineClampTwoStyle }}>
          {content.categoryLabel ?? content.channelName}
        </p>
      </div>
    </button>
  )
}
