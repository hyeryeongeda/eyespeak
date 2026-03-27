import type { CSSProperties, ReactNode } from 'react'
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
  minHeight: 0,
  flex: 1,
  width: '100%',
  padding: '18px 16px',
  borderRadius: '24px',
  border: '1px solid rgba(213, 222, 233, 0.88)',
  boxShadow: '0 16px 36px rgba(40, 66, 90, 0.06)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.92)',
  cursor: 'pointer',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  appearance: 'none',
  position: 'relative',
}

const primaryStyle: CSSProperties = {
  margin: 0,
  maxWidth: '100%',
  fontSize: 'clamp(3rem, 5vw, 4.45rem)',
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
  color: '#647587',
  lineHeight: 1.4,
  wordBreak: 'keep-all',
}

const interactiveCss = `
  .favorites-action-card:hover:not(:disabled),
  .favorites-action-card:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 28px 54px rgba(40, 66, 90, 0.16);
    outline: none;
  }
`

export interface FavoritesActionCardProps {
  primaryText: string
  description: string
  tone?: FavoriteTileTone
  disabled?: boolean
  onClick: () => void
  children?: ReactNode
  trackingId?: string
  dwellFeedback?: DwellFeedbackViewModel<string>
}

export default function FavoritesActionCard({
  primaryText,
  description,
  tone = 'slate',
  disabled = false,
  onClick,
  children,
  trackingId,
  dwellFeedback,
}: FavoritesActionCardProps) {
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
        className="favorites-action-card"
        style={{
          ...cardStyle,
          background: toneStyle.background,
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        disabled={disabled}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && !disabled && onClick()}
        aria-label={`${primaryText}. ${description}`}
        data-tracking-id={disabled ? undefined : trackingId}
      >
        {shouldShowDwellFeedback && dwellFeedback ? (
          <DwellFeedbackBadge
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
        ) : null}
        {children ?? <span style={primaryStyle}>{primaryText}</span>}
        <span style={descriptionStyle}>{description}</span>
      </button>
    </>
  )
}
