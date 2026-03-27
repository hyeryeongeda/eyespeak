import type { CSSProperties, ReactNode } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type UseDwellFeedbackResult,
} from '../../input/hooks/useDwellFeedback'
import type { CustomTalkStageActionCard } from './CustomTalkStageLayout'

type CustomTalkEntryActionCard = CustomTalkStageActionCard & {
  trackingId?: string
  commitDisabled?: boolean
  loading?: boolean
  loadingLabel?: string
}

interface CustomTalkEntryLayoutProps {
  title: string
  centerChildren: ReactNode
  topLeft: CustomTalkEntryActionCard
  topCenter: CustomTalkEntryActionCard
  topRight: CustomTalkEntryActionCard
  bottomLeft: CustomTalkEntryActionCard
  bottomCenter: CustomTalkEntryActionCard
  bottomRight: CustomTalkEntryActionCard
  dwellFeedback?: UseDwellFeedbackResult<string>
  gridTemplateRows?: CSSProperties['gridTemplateRows']
}

const pageWrap: CSSProperties = {
  height: 'calc(100dvh - var(--sat, 0px) - var(--sab, 0px))',
  width: '100%',
  padding: '12px',
  boxSizing: 'border-box',
  background: 'linear-gradient(180deg, #edf3f8 0%, #f8fbff 48%, #eef2f6 100%)',
  overflow: 'hidden',
}

const gridStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'minmax(0, 1fr) minmax(96px, 0.35fr) minmax(0, 1fr)',
  gridTemplateAreas: `
    "top-left top-center top-right"
    "center center center"
    "bottom-left bottom-center bottom-right"
  `,
  gap: '10px',
}

const cardBaseStyle: CSSProperties = {
  borderRadius: '28px',
  padding: '18px 16px',
  border: '1px solid rgba(216, 225, 235, 0.9)',
  boxShadow: '0 22px 48px rgba(53, 77, 103, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  transition: 'transform 0.16s ease, box-shadow 0.16s ease',
  cursor: 'pointer',
  position: 'relative',
}

function getCardStyle(
  gridArea: string,
  tone: CustomTalkStageActionCard['tone'],
  disabled: boolean,
  loading: boolean,
): CSSProperties {
  const backgroundByTone: Record<CustomTalkStageActionCard['tone'], string> = {
    sky: 'linear-gradient(180deg, #eef1ff 0%, #e6ebff 100%)',
    sand: 'linear-gradient(180deg, #fff7d8 0%, #fff1b8 100%)',
    mint: 'linear-gradient(180deg, #f0f7f4 0%, #ebf6f4 100%)',
    slate: 'linear-gradient(180deg, #f7f8fc 0%, #edf1f7 100%)',
  }

  return {
    ...cardBaseStyle,
    gridArea,
    background: backgroundByTone[tone],
    opacity: disabled && !loading ? 0.58 : 1,
    cursor: disabled ? 'default' : 'pointer',
    overflow: 'hidden',
    border: loading
      ? '1px solid rgba(151, 173, 206, 0.92)'
      : cardBaseStyle.border,
    boxShadow: loading
      ? '0 26px 58px rgba(72, 96, 124, 0.16)'
      : cardBaseStyle.boxShadow,
  }
}

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: '#1f3047',
  fontSize: 'clamp(2.45rem, 5.8vmin, 4.1rem)',
  fontWeight: 900,
  lineHeight: 1.18,
  wordBreak: 'keep-all',
}

const cardDescriptionStyle: CSSProperties = {
  margin: '8px 0 0',
  maxWidth: '22ch',
  color: '#6f8095',
  fontSize: 'clamp(0.78rem, 1.35vmin, 0.96rem)',
  fontWeight: 700,
  lineHeight: 1.45,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const loadingSheenStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(115deg, rgba(255, 255, 255, 0) 18%, rgba(255, 255, 255, 0.44) 48%, rgba(255, 255, 255, 0) 78%)',
  transform: 'translateX(-130%)',
  animation: 'custom-talk-entry-shimmer 1.8s ease-in-out infinite',
  pointerEvents: 'none',
}

const loadingBadgeStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 14px',
  borderRadius: '999px',
  border: '1px solid rgba(120, 145, 181, 0.28)',
  backgroundColor: 'rgba(255, 255, 255, 0.82)',
  boxShadow: '0 10px 24px rgba(72, 96, 124, 0.08)',
  color: '#5d7495',
  fontSize: 'clamp(0.82rem, 1vw, 0.95rem)',
  fontWeight: 900,
  letterSpacing: '0.01em',
  backdropFilter: 'blur(10px)',
}

const loadingDotsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
}

function getLoadingDotStyle(delaySeconds: number): CSSProperties {
  return {
    width: '7px',
    height: '7px',
    borderRadius: '999px',
    backgroundColor: '#6b91c7',
    opacity: 0.28,
    animation: `custom-talk-entry-dot 1.1s ${delaySeconds}s ease-in-out infinite`,
  }
}

const loadingBarStackStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: '180px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '18px',
}

function getLoadingBarStyle(width: string, delaySeconds: number): CSSProperties {
  return {
    width,
    height: '6px',
    borderRadius: '999px',
    alignSelf: 'center',
    background:
      'linear-gradient(90deg, rgba(107, 145, 199, 0.16) 0%, rgba(107, 145, 199, 0.52) 50%, rgba(107, 145, 199, 0.16) 100%)',
    backgroundSize: '200% 100%',
    animation: `custom-talk-entry-progress 1.5s ${delaySeconds}s linear infinite`,
  }
}

const centerAreaStyle: CSSProperties = {
  gridArea: 'center',
  minHeight: 0,
  borderRadius: '28px',
  border: '1px solid rgba(219, 227, 236, 0.9)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, #f8fbff 100%)',
  boxShadow: '0 18px 40px rgba(53, 77, 103, 0.08)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const layoutCss = `
  .custom-talk-entry-page {
    overflow-x: hidden;
  }

  .custom-talk-entry-card:hover:not([aria-disabled='true']) {
    transform: translateY(-4px);
    box-shadow: 0 26px 56px rgba(53, 77, 103, 0.14);
  }

  .custom-talk-entry-card:focus-visible {
    outline: 3px solid #6b91c7;
    outline-offset: 3px;
  }

  @media (max-height: 900px) {
    .custom-talk-entry-page {
      padding: 12px !important;
    }

    .custom-talk-entry-layout {
      gap: 8px !important;
      grid-template-rows: minmax(0, 1fr) minmax(88px, 0.32fr) minmax(0, 1fr) !important;
    }

    .custom-talk-entry-card {
      padding: 15px 13px !important;
    }
  }

  @media (max-height: 760px) {
    .custom-talk-entry-layout {
      gap: 6px !important;
    }

    .custom-talk-entry-card {
      padding: 12px 10px !important;
      border-radius: 24px !important;
    }
  }

  @keyframes custom-talk-entry-shimmer {
    0% {
      transform: translateX(-130%);
    }

    100% {
      transform: translateX(130%);
    }
  }

  @keyframes custom-talk-entry-dot {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.28;
    }

    50% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  @keyframes custom-talk-entry-progress {
    0% {
      background-position: 100% 50%;
    }

    100% {
      background-position: -100% 50%;
    }
  }

`

const entryCellByArea: Record<string, number> = {
  'top-left': 0,
  'top-center': 1,
  'top-right': 2,
  'bottom-left': 3,
  'bottom-center': 4,
  'bottom-right': 5,
}

function ActionCard({
  gridArea,
  card,
  dwellFeedback,
}: {
  gridArea: string
  card: CustomTalkEntryActionCard
  dwellFeedback?: UseDwellFeedbackResult<string>
}) {
  const isLoading = card.loading ?? false
  const isUnavailable = card.disabled ?? false
  const isCommitDisabled = card.commitDisabled ?? false
  const isInteractionBlocked = isUnavailable || isCommitDisabled
  const shouldShowDwellFeedback = isDwellFeedbackTargetActive(dwellFeedback ?? {
    activeTargetId: null,
    phase: 'idle',
    progress: 0,
    remainingMs: 0,
  }, card.trackingId)

  return (
    <button
      type="button"
      className="custom-talk-entry-card"
      style={getCardStyle(gridArea, card.tone, isInteractionBlocked, isLoading)}
      aria-disabled={isInteractionBlocked || undefined}
      tabIndex={isInteractionBlocked ? -1 : undefined}
      onClick={event => {
        if (isInteractionBlocked) {
          event.preventDefault()
          event.stopPropagation()
          return
        }

        card.onSelect()
      }}
      data-tracking-id={card.trackingId}
      data-gaze-selectable={card.trackingId ? 'true' : undefined}
      data-gaze-commit-disabled={isInteractionBlocked ? 'true' : undefined}
      data-gaze-disabled-reason={
        isCommitDisabled ? 'busy' : isUnavailable ? 'unavailable' : undefined
      }
      data-cell={card.trackingId ? entryCellByArea[gridArea] : undefined}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? <div style={loadingSheenStyle} aria-hidden="true" /> : null}
      {shouldShowDwellFeedback && dwellFeedback ? (
        <DwellFeedbackBadge
          phase={dwellFeedback.phase}
          progress={dwellFeedback.progress}
          remainingMs={dwellFeedback.remainingMs}
        />
      ) : null}
      {isLoading ? (
        <div style={loadingBadgeStyle} aria-hidden="true">
          <span>{card.loadingLabel ?? 'AI 생성 중'}</span>
          <span style={loadingDotsStyle}>
            <span style={getLoadingDotStyle(0)} />
            <span style={getLoadingDotStyle(0.15)} />
            <span style={getLoadingDotStyle(0.3)} />
          </span>
        </div>
      ) : null}
      <h2
        className="custom-talk-entry-card-title"
        style={{ ...cardTitleStyle, position: 'relative', zIndex: 1 }}
      >
        {card.title}
      </h2>
      {card.description ? (
        <p
          className="custom-talk-entry-card-description"
          style={{ ...cardDescriptionStyle, position: 'relative', zIndex: 1 }}
        >
          {card.description}
        </p>
      ) : null}
      {isLoading ? (
        <div style={loadingBarStackStyle} aria-hidden="true">
          <span style={getLoadingBarStyle('78%', 0)} />
          <span style={getLoadingBarStyle('62%', 0.15)} />
          <span style={getLoadingBarStyle('88%', 0.3)} />
        </div>
      ) : null}
    </button>
  )
}

export default function CustomTalkEntryLayout({
  title,
  centerChildren,
  topLeft,
  topCenter,
  topRight,
  bottomLeft,
  bottomCenter,
  bottomRight,
  dwellFeedback,
  gridTemplateRows,
}: CustomTalkEntryLayoutProps) {
  const setContainerElement = dwellFeedback?.setContainerElement

  return (
    <main className="custom-talk-entry-page" style={pageWrap} aria-label={title}>
      <style>{layoutCss}</style>
      <div
        className="custom-talk-entry-layout"
        style={{
          ...gridStyle,
          gridTemplateRows: gridTemplateRows ?? gridStyle.gridTemplateRows,
        }}
        ref={setContainerElement}
      >
        <ActionCard gridArea="top-left" card={topLeft} dwellFeedback={dwellFeedback} />
        <ActionCard gridArea="top-center" card={topCenter} dwellFeedback={dwellFeedback} />
        <ActionCard gridArea="top-right" card={topRight} dwellFeedback={dwellFeedback} />

        <section style={centerAreaStyle} aria-label={`${title} 대화 맥락`}>
          {centerChildren}
        </section>

        <ActionCard gridArea="bottom-left" card={bottomLeft} dwellFeedback={dwellFeedback} />
        <ActionCard gridArea="bottom-center" card={bottomCenter} dwellFeedback={dwellFeedback} />
        <ActionCard gridArea="bottom-right" card={bottomRight} dwellFeedback={dwellFeedback} />
      </div>
    </main>
  )
}
