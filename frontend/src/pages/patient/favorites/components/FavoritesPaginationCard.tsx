import type { CSSProperties } from 'react'
import type { DwellFeedbackViewModel } from '../../../../features/patient/input/hooks/useDwellFeedback'
import FavoritesActionCard from './FavoritesActionCard'

const wrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const hiddenSlotStyle: CSSProperties = {
  flex: 1,
  visibility: 'hidden',
  pointerEvents: 'none',
}

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

  if (!hasPrev && !hasNext) {
    return <div aria-hidden style={hiddenSlotStyle} />
  }

  if (hasPrev && hasNext) {
    return (
      <div style={wrapStyle}>
        <FavoritesActionCard
          primaryText="◀ 이전"
          description="이전 페이지 보기"
          tone="sky"
          onClick={onPrev}
          trackingId={prevTrackingId}
          dwellFeedback={dwellFeedback}
        />
        <FavoritesActionCard
          primaryText="다음 ▶"
          description="다음 페이지 보기"
          tone="mint"
          onClick={onNext}
          trackingId={nextTrackingId}
          dwellFeedback={dwellFeedback}
        />
      </div>
    )
  }

  if (hasNext) {
    return (
      <FavoritesActionCard
        primaryText="다음 ▶"
        description="다음 페이지 보기"
        tone="mint"
        onClick={onNext}
        trackingId={nextTrackingId}
        dwellFeedback={dwellFeedback}
      />
    )
  }

  return (
    <FavoritesActionCard
      primaryText="◀ 이전"
      description="이전 페이지 보기"
      tone="sky"
      onClick={onPrev}
      trackingId={prevTrackingId}
      dwellFeedback={dwellFeedback}
    />
  )
}
