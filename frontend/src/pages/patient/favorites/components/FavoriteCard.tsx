import type { CSSProperties } from 'react'
import DwellFeedbackBadge from '../../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type DwellFeedbackViewModel,
} from '../../../../features/patient/input/hooks/useDwellFeedback'
import {
  favoriteTileToneStyleMap,
  type FavoriteTileTone,
} from '../favoritesUi'

const cardStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  minHeight: 'clamp(148px, 28vh, 280px)',
  padding: '20px 18px',
  borderRadius: '24px',
  border: '1px solid rgba(204, 216, 226, 0.95)',
  boxShadow: '0 16px 36px rgba(40, 66, 90, 0.08)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  appearance: 'none',
  position: 'relative',
}

const textStyle: CSSProperties = {
  margin: 0,
  maxWidth: '100%',
  fontSize: 'clamp(2.7rem, 4.8vw, 4.4rem)',
  fontWeight: 800,
  lineHeight: 1.22,
  letterSpacing: '-0.03em',
  wordBreak: 'keep-all',
  color: '#203042',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '100%',
  fontSize: 'clamp(1rem, 1.55vw, 1.15rem)',
  fontWeight: 600,
  lineHeight: 1.4,
  wordBreak: 'keep-all',
  color: '#647587',
}

const interactiveCss = `
  .favorite-card-btn:hover:not(:disabled),
  .favorite-card-btn:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 28px 54px rgba(40, 66, 90, 0.16);
    outline: none;
  }
  .favorite-card-btn:active:not(:disabled) {
    transform: translateY(0);
  }
`

export interface FavoriteCardProps {
  id: string
  text: string
  category?: string
  description?: string
  tone?: FavoriteTileTone
  disabled?: boolean
  onSelect: () => void
  trackingId?: string
  dwellFeedback?: DwellFeedbackViewModel<string>
}

export default function FavoriteCard({
  id,
  text,
  category,
  description,
  tone = 'sky',
  disabled = false,
  onSelect,
  trackingId,
  dwellFeedback,
}: FavoriteCardProps) {
  const toneStyle = favoriteTileToneStyleMap[tone]
  const shouldShowDwellFeedback = isDwellFeedbackTargetActive(
    dwellFeedback ?? { activeTargetId: null, phase: 'idle', progress: 0, remainingMs: 0 },
    trackingId,
  )

  return (
    <>
      <style>{interactiveCss}</style>
      <button
        type="button"
        className="favorite-card-btn"
        style={{
          ...cardStyle,
          background: toneStyle.background,
          borderColor: 'rgba(204, 216, 226, 0.95)',
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        disabled={disabled}
        onClick={onSelect}
        onKeyDown={e => e.key === 'Enter' && !disabled && onSelect()}
        aria-label={[text, description ?? category].filter(Boolean).join('. ')}
        data-favorite-id={id}
        data-tracking-id={disabled ? undefined : trackingId}
      >
        {shouldShowDwellFeedback && dwellFeedback ? (
          <DwellFeedbackBadge
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
        ) : null}
        <span style={textStyle}>{text}</span>
        {description ? <span style={descriptionStyle}>{description}</span> : null}
      </button>
    </>
  )
}
