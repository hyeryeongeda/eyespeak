import type { CSSProperties } from 'react'
import type {
  LeisureCardTone,
  LeisureContent,
  LeisureOverlayStatus,
} from '../../../../types/leisure'
import LeisureActionCard from './LeisureActionCard'
import LeisureContentCard from './LeisureContentCard'
import LeisureEmptyState from './LeisureEmptyState'
import LeisureErrorState from './LeisureErrorState'
import LeisureLoadingState from './LeisureLoadingState'
import { leisurePanelSurfaceStyle } from './leisureTheme'

const rootStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 2.45fr) minmax(220px, 0.95fr)',
  gap: '16px',
}

const contentPanelStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const contentGridWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
}

const noticeStyle: CSSProperties = {
  minHeight: '44px',
  padding: '10px 14px',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 244, 240, 0.95)',
  border: '1px solid rgba(241, 206, 198, 0.92)',
  color: '#8b594f',
  fontSize: '14px',
  fontWeight: 800,
  lineHeight: 1.45,
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
}

const sideActionWrapStyle: CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
  minHeight: 0,
}

const slotStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
}

const hiddenSlotStyle: CSSProperties = {
  ...slotStyle,
  visibility: 'hidden',
  pointerEvents: 'none',
}

const stateAreaStyle: CSSProperties = {
  ...slotStyle,
  gridColumn: '1 / -1',
  gridRow: '1 / -1',
}

interface RelatedContentOverlayProps {
  title: string
  categoryLabel: string
  tone: LeisureCardTone
  status: LeisureOverlayStatus
  contents: LeisureContent[]
  noticeMessage?: string | null
  onSelectContent: (content: LeisureContent) => void
  onRefresh: () => void
  onClose: () => void
}

export default function RelatedContentOverlay({
  title,
  categoryLabel,
  tone,
  status,
  contents,
  noticeMessage,
  onSelectContent,
  onRefresh,
  onClose,
}: RelatedContentOverlayProps) {
  const actionBusy = status === 'loading' || status === 'refreshing' || status === 'selecting'
  const shouldShowState =
    contents.length === 0 && (status === 'loading' || status === 'empty' || status === 'error')
  const contentSlots = Array.from({ length: 4 }, (_, index) => contents[index] ?? null)

  let statePanel = null

  if (status === 'loading') {
    statePanel = (
      <LeisureLoadingState
        title="연관 영상을 불러오는 중입니다"
        description="같은 카테고리의 재생 가능한 영상을 다시 조회하고 있습니다."
      />
    )
  } else if (status === 'empty') {
    statePanel = (
      <LeisureEmptyState
        title="연관 영상이 없습니다"
        description="같은 카테고리에서 재생 가능한 추가 영상을 찾지 못했습니다."
      />
    )
  } else if (status === 'error') {
    statePanel = (
      <LeisureErrorState
        title="연관 영상을 불러오지 못했습니다"
        description="잠시 후 다시 시도하거나 이전 화면으로 돌아가 주세요."
      />
    )
  }

  return (
    <section style={rootStyle} aria-label={title}>
      <div style={contentPanelStyle}>
        {noticeMessage ? <div style={noticeStyle}>{noticeMessage}</div> : null}

        <div style={contentGridWrapStyle}>
          <div className="related-content-overlay-grid" style={gridStyle}>
            {shouldShowState ? (
              <div className="related-content-overlay-state" style={stateAreaStyle}>
                {statePanel}
              </div>
            ) : (
              contentSlots.map((content, index) =>
                content ? (
                  <div
                    key={content.id}
                    style={{
                      ...slotStyle,
                      gridColumn: index % 2 === 0 ? 1 : 2,
                      gridRow: index < 2 ? 1 : 2,
                    }}
                  >
                    <LeisureContentCard
                      content={content}
                      tone={tone}
                      slotId={`related-content-${index + 1}`}
                      onSelect={() => onSelectContent(content)}
                    />
                  </div>
                ) : (
                  <div
                    key={`related-placeholder-${index}`}
                    style={{
                      ...hiddenSlotStyle,
                      gridColumn: index % 2 === 0 ? 1 : 2,
                      gridRow: index < 2 ? 1 : 2,
                    }}
                  />
                ),
              )
            )}
          </div>
        </div>
      </div>

      <div style={sideActionWrapStyle}>
        <div style={slotStyle}>
          <LeisureActionCard
            title="다른 영상"
            description={`${categoryLabel} 연관 영상 목록을 다시 조회합니다.`}
            badge="추천 이동"
            tone={tone}
            variant="hero"
            busy={status === 'refreshing'}
            disabled={actionBusy}
            slotId="related-refresh"
            onSelect={onRefresh}
          />
        </div>

        <div style={slotStyle}>
          <LeisureActionCard
            title="뒤로가기"
            description="플레이어 화면으로 돌아갑니다."
            badge="이전 이동"
            tone="slate"
            variant="hero"
            busy={status === 'closing'}
            disabled={status === 'selecting'}
            slotId="related-close"
            onSelect={onClose}
          />
        </div>
      </div>
    </section>
  )
}
