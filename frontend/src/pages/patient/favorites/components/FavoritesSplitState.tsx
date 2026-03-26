import type { CSSProperties } from 'react'
import DwellFeedbackBadge from '../../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type DwellFeedbackViewModel,
} from '../../../../features/patient/input/hooks/useDwellFeedback'

const wrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0',
  overflow: 'hidden',
  borderRadius: '32px',
  border: '1px solid rgba(207, 216, 227, 0.92)',
  boxShadow: '0 18px 44px rgba(33, 48, 66, 0.08)',
}

const panelBaseStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 20px',
  boxSizing: 'border-box',
}

const actionPanelStyle: CSSProperties = {
  ...panelBaseStyle,
  border: 'none',
  appearance: 'none',
  cursor: 'pointer',
  position: 'relative',
  transition: 'filter 0.18s ease, transform 0.18s ease',
}

const leftPanelStyle: CSSProperties = {
  ...actionPanelStyle,
  background: 'linear-gradient(180deg, #e5f3ec 0%, #e0efe8 100%)',
}

const centerPanelStyle: CSSProperties = {
  ...panelBaseStyle,
  flexDirection: 'column',
  gap: '14px',
  textAlign: 'center',
  background: 'linear-gradient(180deg, #f7efea 0%, #f5ebe4 100%)',
}

const rightPanelStyle: CSSProperties = {
  ...actionPanelStyle,
  background: 'linear-gradient(180deg, #d9dfec 0%, #d1d9e7 100%)',
}

const actionLabelStyle: CSSProperties = {
  margin: 0,
  color: '#111418',
  fontSize: 'clamp(2rem, 3vw, 3rem)',
  fontWeight: 900,
  lineHeight: 1.1,
  letterSpacing: '-0.04em',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#8b5f4e',
  fontSize: 'clamp(1.8rem, 2.3vw, 2.4rem)',
  fontWeight: 900,
  lineHeight: 1.2,
  letterSpacing: '-0.03em',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '360px',
  color: '#8c6a5d',
  fontSize: 'clamp(0.98rem, 1.25vw, 1.08rem)',
  fontWeight: 700,
  lineHeight: 1.6,
}

const interactiveCss = `
  .favorites-split-state-action:hover:not(:disabled),
  .favorites-split-state-action:focus-visible:not(:disabled) {
    filter: brightness(0.98);
    transform: scale(0.995);
    outline: none;
  }

  .favorites-split-state-action:active:not(:disabled) {
    filter: brightness(0.95);
  }
`

export interface FavoritesSplitStateProps {
  title: string
  description: string
  leftLabel: string
  rightLabel: string
  onLeftAction: () => void
  onRightAction: () => void
  leftTrackingId?: string
  rightTrackingId?: string
  dwellFeedback?: DwellFeedbackViewModel<string>
  centerAriaRole?: 'status' | 'alert'
}

export default function FavoritesSplitState({
  title,
  description,
  leftLabel,
  rightLabel,
  onLeftAction,
  onRightAction,
  leftTrackingId,
  rightTrackingId,
  dwellFeedback,
  centerAriaRole = 'status',
}: FavoritesSplitStateProps) {
  const fallbackDwellFeedback =
    dwellFeedback ?? { activeTargetId: null, phase: 'idle', progress: 0, remainingMs: 0 }
  const isLeftActionActive = isDwellFeedbackTargetActive(
    fallbackDwellFeedback,
    leftTrackingId,
  )
  const isRightActionActive = isDwellFeedbackTargetActive(
    fallbackDwellFeedback,
    rightTrackingId,
  )

  return (
    <>
      <style>{interactiveCss}</style>
      <section style={wrapStyle} aria-label={title}>
        <button
          type="button"
          className="favorites-split-state-action"
          style={leftPanelStyle}
          onClick={onLeftAction}
          aria-label={leftLabel}
          data-tracking-id={leftTrackingId}
        >
          {isLeftActionActive && dwellFeedback ? (
            <DwellFeedbackBadge
              phase={dwellFeedback.phase}
              progress={dwellFeedback.progress}
              remainingMs={dwellFeedback.remainingMs}
            />
          ) : null}
          <span style={actionLabelStyle}>{leftLabel}</span>
        </button>
        <div style={centerPanelStyle} role={centerAriaRole} aria-live="polite">
          <h2 style={titleStyle}>{title}</h2>
          <p style={descriptionStyle}>{description}</p>
        </div>
        <button
          type="button"
          className="favorites-split-state-action"
          style={rightPanelStyle}
          onClick={onRightAction}
          aria-label={rightLabel}
          data-tracking-id={rightTrackingId}
        >
          {isRightActionActive && dwellFeedback ? (
            <DwellFeedbackBadge
              phase={dwellFeedback.phase}
              progress={dwellFeedback.progress}
              remainingMs={dwellFeedback.remainingMs}
            />
          ) : null}
          <span style={actionLabelStyle}>{rightLabel}</span>
        </button>
      </section>
    </>
  )
}
