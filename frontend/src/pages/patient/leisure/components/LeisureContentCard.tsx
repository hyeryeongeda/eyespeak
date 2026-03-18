import type { CSSProperties } from 'react'
import type { LeisureCardTone, LeisureContent } from '../../../../types/leisure'
import { leisureCardBaseStyle, leisureToneMap } from './leisureTheme'

type LeisureContentCardEmphasis = 'standard' | 'hero'

const thumbnailStyleByEmphasis: Record<LeisureContentCardEmphasis, CSSProperties> = {
  standard: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    objectFit: 'cover',
    borderRadius: '20px',
    border: '1px solid rgba(215, 223, 235, 0.8)',
    backgroundColor: '#eef2f6',
    display: 'block',
  },
  hero: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    objectFit: 'cover',
    borderRadius: '22px',
    border: '1px solid rgba(215, 223, 235, 0.82)',
    backgroundColor: '#eef2f6',
    display: 'block',
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
      }}
      aria-label={`${content.title} 재생`}
    >
      <img src={content.thumbnailUrl} alt="" style={thumbnailStyleByEmphasis[emphasis]} />
    </button>
  )
}
