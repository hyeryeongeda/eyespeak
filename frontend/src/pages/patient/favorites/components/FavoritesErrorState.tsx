import type { CSSProperties } from 'react'
import DwellFeedbackBadge from '../../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type DwellFeedbackViewModel,
} from '../../../../features/patient/input/hooks/useDwellFeedback'

const wrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  textAlign: 'center',
  padding: '24px',
  background:
    'linear-gradient(180deg, rgba(255, 250, 249, 0.96) 0%, rgba(255, 243, 240, 0.98) 100%)',
  borderRadius: '24px',
  border: '1px solid rgba(238, 201, 194, 0.92)',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#8f4e43',
  fontSize: 'clamp(1.35rem, 1.9vw, 1.6rem)',
  fontWeight: 900,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '540px',
  color: '#8a5c55',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

const retryBtnStyle: CSSProperties = {
  marginTop: '8px',
  padding: '14px 28px',
  borderRadius: '999px',
  border: '1px solid rgba(238, 201, 194, 0.92)',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  color: '#8f4e43',
  fontSize: '16px',
  fontWeight: 800,
  cursor: 'pointer',
  position: 'relative',
}

export interface FavoritesErrorStateProps {
  title: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  retryTrackingId?: string
  dwellFeedback?: DwellFeedbackViewModel<string>
}

export default function FavoritesErrorState({
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
  retryTrackingId,
  dwellFeedback,
}: FavoritesErrorStateProps) {
  const isRetryDwellActive = isDwellFeedbackTargetActive(
    dwellFeedback ?? { activeTargetId: null, phase: 'idle', progress: 0, remainingMs: 0 },
    retryTrackingId,
  )

  return (
    <section style={wrapStyle} role="alert" aria-label="오류">
      <h3 style={titleStyle}>{title}</h3>
      <p style={descriptionStyle}>{description}</p>
      {onRetry ? (
        <button
          type="button"
          style={retryBtnStyle}
          onClick={onRetry}
          aria-label={retryLabel}
          data-tracking-id={retryTrackingId}
        >
          {isRetryDwellActive && dwellFeedback ? (
            <DwellFeedbackBadge
              phase={dwellFeedback.phase}
              progress={dwellFeedback.progress}
              remainingMs={dwellFeedback.remainingMs}
            />
          ) : null}
          {retryLabel}
        </button>
      ) : null}
    </section>
  )
}
