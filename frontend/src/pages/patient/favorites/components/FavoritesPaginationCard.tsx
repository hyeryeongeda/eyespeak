import type { CSSProperties } from 'react'
import DwellFeedbackBadge from '../../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type DwellFeedbackViewModel,
} from '../../../../features/patient/input/hooks/useDwellFeedback'

const cardWrapStyle: CSSProperties = {
  width: '100%',
  minHeight: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
}

/** 카드 전체가 하나의 버튼처럼 눌리도록 함 */
const fullCardButtonStyle: CSSProperties = {
  width: '100%',
  flex: 1,
  minHeight: 0,
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
  fontSize: 'clamp(1.25rem, 2vw, 1.6rem)',
  fontWeight: 800,
  color: '#203042',
  lineHeight: 1.2,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(0.75rem, 1.1vw, 0.85rem)',
  fontWeight: 600,
  color: '#647587',
  lineHeight: 1.4,
}

/** 이전/다음 둘 다 있을 때 각각 전체 높이의 절반을 차지하는 버튼 */
const halfButtonStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  padding: '14px 16px',
  borderRadius: '20px',
  border: '1px solid rgba(213, 222, 233, 0.88)',
  boxShadow: '0 12px 28px rgba(40, 66, 90, 0.06)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.92)',
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  appearance: 'none',
  color: '#203042',
  fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
  fontWeight: 800,
  position: 'relative',
}

const singlePagePlaceholderStyle: CSSProperties = {
  ...fullCardButtonStyle,
  cursor: 'default',
  pointerEvents: 'none',
}

const interactiveCss = `
  .favorites-pagination-btn:hover:not(:disabled),
  .favorites-pagination-btn:focus-visible:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 20px 44px rgba(40, 66, 90, 0.1);
    outline: none;
  }
`

export interface FavoritesPaginationCardProps {
  pageIndex: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  prevTrackingId?: string
  nextTrackingId?: string
  dwellFeedback?: DwellFeedbackViewModel<string>
}

export default function FavoritesPaginationCard({
  pageIndex,
  totalPages,
  onPrev,
  onNext,
  prevTrackingId,
  nextTrackingId,
  dwellFeedback,
}: FavoritesPaginationCardProps) {
  const hasPrev = totalPages > 1 && pageIndex > 0
  const hasNext = totalPages > 1 && pageIndex < totalPages - 1
  const isPrevDwellActive = isDwellFeedbackTargetActive(
    dwellFeedback ?? { activeTargetId: null, phase: 'idle', progress: 0, remainingMs: 0 },
    prevTrackingId,
  )
  const isNextDwellActive = isDwellFeedbackTargetActive(
    dwellFeedback ?? { activeTargetId: null, phase: 'idle', progress: 0, remainingMs: 0 },
    nextTrackingId,
  )

  if (totalPages <= 1) {
    return (
      <div style={cardWrapStyle}>
        <style>{interactiveCss}</style>
        <div style={singlePagePlaceholderStyle} aria-hidden>
          <span style={descriptionStyle}>1페이지</span>
        </div>
      </div>
    )
  }

  if (hasPrev && hasNext) {
    return (
      <div style={cardWrapStyle}>
        <style>{interactiveCss}</style>
        <button
          type="button"
          className="favorites-pagination-btn"
          style={halfButtonStyle}
          onClick={onPrev}
          aria-label="이전 페이지"
          data-tracking-id={prevTrackingId}
        >
          {isPrevDwellActive && dwellFeedback ? (
            <DwellFeedbackBadge
              phase={dwellFeedback.phase}
              progress={dwellFeedback.progress}
              remainingMs={dwellFeedback.remainingMs}
            />
          ) : null}
          <span style={primaryStyle}>이전</span>
          <span style={descriptionStyle}>이전/다음 페이지로 넘어가기</span>
        </button>
        <button
          type="button"
          className="favorites-pagination-btn"
          style={halfButtonStyle}
          onClick={onNext}
          aria-label="다음 페이지"
          data-tracking-id={nextTrackingId}
        >
          {isNextDwellActive && dwellFeedback ? (
            <DwellFeedbackBadge
              phase={dwellFeedback.phase}
              progress={dwellFeedback.progress}
              remainingMs={dwellFeedback.remainingMs}
            />
          ) : null}
          <span style={primaryStyle}>다음</span>
          <span style={descriptionStyle}>이전/다음 페이지로 넘어가기</span>
        </button>
      </div>
    )
  }

  if (hasNext) {
    return (
      <div style={cardWrapStyle}>
        <style>{interactiveCss}</style>
        <button
          type="button"
          className="favorites-pagination-btn"
          style={fullCardButtonStyle}
          onClick={onNext}
          aria-label="다음 페이지. 이전/다음 페이지로 넘어가기"
          data-tracking-id={nextTrackingId}
        >
          {isNextDwellActive && dwellFeedback ? (
            <DwellFeedbackBadge
              phase={dwellFeedback.phase}
              progress={dwellFeedback.progress}
              remainingMs={dwellFeedback.remainingMs}
            />
          ) : null}
          <span style={primaryStyle}>다음</span>
          <span style={descriptionStyle}>이전/다음 페이지로 넘어가기</span>
        </button>
      </div>
    )
  }

  return (
    <div style={cardWrapStyle}>
      <style>{interactiveCss}</style>
      <button
        type="button"
        className="favorites-pagination-btn"
        style={fullCardButtonStyle}
        onClick={onPrev}
        aria-label="이전 페이지. 이전/다음 페이지로 넘어가기"
        data-tracking-id={prevTrackingId}
      >
        {isPrevDwellActive && dwellFeedback ? (
          <DwellFeedbackBadge
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
        ) : null}
        <span style={primaryStyle}>이전</span>
        <span style={descriptionStyle}>이전/다음 페이지로 넘어가기</span>
      </button>
    </div>
  )
}
