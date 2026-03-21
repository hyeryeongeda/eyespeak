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
import LeisureSectionHeader from './LeisureSectionHeader'

const overlayBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 30,
  padding: '18px',
  backgroundColor: 'rgba(35, 49, 69, 0.42)',
  backdropFilter: 'blur(10px)',
  boxSizing: 'border-box',
}

const overlayPanelStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '34px',
  background:
    'linear-gradient(180deg, rgba(247, 251, 253, 0.98) 0%, rgba(238, 245, 249, 0.98) 100%)',
  border: '1px solid rgba(210, 220, 232, 0.9)',
  boxShadow: '0 32px 72px rgba(21, 35, 52, 0.18)',
  padding: '20px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
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
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '14px',
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
  gridColumn: '1 / span 2',
  gridRow: '1 / span 2',
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
        title="연관 콘텐츠를 불러오는 중입니다"
        description="같은 카테고리의 재생 가능한 영상을 다시 조회하고 있습니다."
      />
    )
  } else if (status === 'empty') {
    statePanel = (
      <LeisureEmptyState
        title="연관 콘텐츠가 없습니다"
        description="같은 카테고리에서 재생 가능한 추가 콘텐츠를 찾지 못했습니다."
      />
    )
  } else if (status === 'error') {
    statePanel = (
      <LeisureErrorState
        title="연관 콘텐츠를 불러오지 못했습니다"
        description="잠시 후 다시 시도하거나 이전 화면으로 돌아가 주세요."
      />
    )
  }

  return (
    <div style={overlayBackdropStyle} role="dialog" aria-modal="true" aria-label="연관 콘텐츠">
      <div style={overlayPanelStyle}>
        <LeisureSectionHeader
          title={title}
          description={`${categoryLabel} 카테고리의 추가 콘텐츠를 표시합니다.`}
        />

        {noticeMessage ? <div style={noticeStyle}>{noticeMessage}</div> : null}

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

          <div style={{ ...slotStyle, gridColumn: 3, gridRow: 1 }}>
            <LeisureActionCard
              title="새로고침"
              description="연관 콘텐츠 목록을 다시 조회합니다."
              tone={tone}
              busy={status === 'refreshing'}
              disabled={actionBusy}
              slotId="related-refresh"
              onSelect={onRefresh}
            />
          </div>

          <div style={{ ...slotStyle, gridColumn: 3, gridRow: 2 }}>
            <LeisureActionCard
              title="닫기"
              description="오버레이를 닫고 플레이어로 돌아갑니다."
              tone="slate"
              busy={status === 'closing'}
              disabled={status === 'selecting'}
              slotId="related-close"
              onSelect={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
