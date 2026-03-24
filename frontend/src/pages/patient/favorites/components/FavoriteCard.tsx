import type { CSSProperties } from 'react'
import DwellFeedbackBadge from '../../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type DwellFeedbackViewModel,
} from '../../../../features/patient/input/hooks/useDwellFeedback'

const cardStyle: CSSProperties = {
  width: '100%',
  minHeight: 'clamp(120px, 22vh, 200px)',
  padding: '20px 18px',
  borderRadius: '24px',
  border: '1px solid rgba(204, 216, 226, 0.95)',
  boxShadow: '0 16px 36px rgba(40, 66, 90, 0.08)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  textAlign: 'center',
  background: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  appearance: 'none',
  position: 'relative',
}

const textStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.4rem, 2.2vw, 1.95rem)',
  fontWeight: 800,
  lineHeight: 1.3,
  color: '#203042',
}

const categoryStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(0.95rem, 1.35vw, 1.08rem)',
  fontWeight: 600,
  color: '#647587',
}

const interactiveCss = `
  .favorite-card-btn:hover:not(:disabled),
  .favorite-card-btn:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 24px 48px rgba(40, 66, 90, 0.14);
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
  disabled?: boolean
  onSelect: () => void
  trackingId?: string
  dwellFeedback?: DwellFeedbackViewModel<string>
}

export default function FavoriteCard({
  id,
  text,
  category,
  disabled = false,
  onSelect,
  trackingId,
  dwellFeedback,
}: FavoriteCardProps) {
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
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        disabled={disabled}
        onClick={onSelect}
        onKeyDown={e => e.key === 'Enter' && !disabled && onSelect()}
        aria-label={category ? `${text} (${category})` : text}
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
        {category ? <span style={categoryStyle}>{category}</span> : null}
      </button>
    </>
  )
}
