import type { CSSProperties, ReactNode } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type UseDwellFeedbackResult,
} from '../../input/hooks/useDwellFeedback'

type CustomTalkGuardianPromptTone = 'sky' | 'sand' | 'mint' | 'slate'

export interface CustomTalkGuardianPromptCard {
  title: string
  description?: string
  tone: CustomTalkGuardianPromptTone
  onSelect: () => void
  disabled?: boolean
  commitDisabled?: boolean
  trackingId?: string
  loading?: boolean
  loadingLabel?: string
}

interface CustomTalkGuardianPromptLayoutProps {
  title: string
  assistiveText?: string | null
  centerChildren: ReactNode
  topLeft: CustomTalkGuardianPromptCard
  topRight: CustomTalkGuardianPromptCard
  bottomLeft: CustomTalkGuardianPromptCard
  bottomRight: CustomTalkGuardianPromptCard
  dwellFeedback?: UseDwellFeedbackResult<string>
}

const pageWrapStyle: CSSProperties = {
  height: 'calc(100dvh - var(--sat, 0px) - var(--sab, 0px))',
  width: '100%',
  padding: '4px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  overflow: 'hidden',
}

const contentStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 0.66fr) minmax(0, 1fr)',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gridTemplateAreas: `
    "top-left center top-right"
    "bottom-left center bottom-right"
  `,
  gap: '12px',
}

const cardBaseStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '18px',
  border: '1px solid #d9dee5',
  boxShadow: '0 10px 26px rgba(76, 91, 108, 0.06)',
  padding: '22px 18px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease',
}

function getCardStyle(
  gridArea: string,
  tone: CustomTalkGuardianPromptTone,
  disabled: boolean,
  loading: boolean,
): CSSProperties {
  const backgroundByTone: Record<CustomTalkGuardianPromptTone, string> = {
    sky: 'linear-gradient(180deg, #f0f1ff 0%, #eaecff 100%)',
    sand: 'linear-gradient(180deg, #fff5c9 0%, #fff1b6 100%)',
    mint: 'linear-gradient(180deg, #f3fbfb 0%, #eef8f8 100%)',
    slate: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
  }

  return {
    ...cardBaseStyle,
    gridArea,
    background: backgroundByTone[tone],
    opacity: disabled && !loading ? 0.58 : 1,
    cursor: disabled ? 'default' : 'pointer',
    borderColor: loading ? '#c5d1e0' : tone === 'slate' ? '#d5dbe2' : '#d9dee5',
    boxShadow: loading
      ? '0 14px 30px rgba(114, 137, 164, 0.12)'
      : cardBaseStyle.boxShadow,
  }
}

const cardTitleStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  margin: 0,
  maxWidth: '12ch',
  color: '#111111',
  fontSize: 'clamp(1.9rem, 3.4vmin, 3rem)',
  fontWeight: 900,
  lineHeight: 1.28,
  letterSpacing: '-0.03em',
  wordBreak: 'keep-all',
  whiteSpace: 'pre-wrap',
}

const cardDescriptionStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  margin: 0,
  maxWidth: '18ch',
  color: '#70757d',
  fontSize: 'clamp(0.92rem, 1.25vmin, 1rem)',
  fontWeight: 700,
  lineHeight: 1.45,
}

const centerCellStyle: CSSProperties = {
  gridArea: 'center',
  minHeight: 0,
  display: 'flex',
}

const centerInnerStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
}

const loadingSheenStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(115deg, rgba(255, 255, 255, 0) 18%, rgba(255, 255, 255, 0.42) 48%, rgba(255, 255, 255, 0) 78%)',
  transform: 'translateX(-130%)',
  animation: 'guardian-prompt-card-sheen 1.7s ease-in-out infinite',
  pointerEvents: 'none',
}

const loadingLabelStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  margin: 0,
  color: '#78879a',
  fontSize: 'clamp(0.86rem, 1.1vmin, 0.94rem)',
  fontWeight: 800,
}

const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const layoutCss = `
  .custom-talk-guardian-prompt-card:hover:not([aria-disabled='true']) {
    transform: translateY(-3px);
    box-shadow: 0 16px 34px rgba(76, 91, 108, 0.11);
  }

  .custom-talk-guardian-prompt-card:focus-visible {
    outline: 3px solid #7f98bc;
    outline-offset: 3px;
  }

  @media (max-width: 900px) {
    .custom-talk-guardian-prompt-page {
      padding: 4px !important;
    }

    .custom-talk-guardian-prompt-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: minmax(240px, 0.9fr) minmax(0, 1fr) minmax(0, 1fr) !important;
      grid-template-areas:
        "center center"
        "top-left top-right"
        "bottom-left bottom-right" !important;
      gap: 12px !important;
    }
  }

  @media (max-width: 560px) {
    .custom-talk-guardian-prompt-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      grid-template-rows: minmax(220px, 0.88fr) repeat(4, minmax(120px, 1fr)) !important;
      grid-template-areas:
        "center"
        "top-left"
        "top-right"
        "bottom-left"
        "bottom-right" !important;
    }
  }

  @keyframes guardian-prompt-card-sheen {
    0% {
      transform: translateX(-130%);
    }

    100% {
      transform: translateX(130%);
    }
  }
`

const guardianPromptCellByArea: Record<string, number> = {
  'top-left': 0,
  'top-right': 2,
  'bottom-left': 3,
  'bottom-right': 5,
}

function ActionCard({
  gridArea,
  card,
  dwellFeedback,
}: {
  gridArea: string
  card: CustomTalkGuardianPromptCard
  dwellFeedback?: UseDwellFeedbackResult<string>
}) {
  const isLoading = card.loading ?? false
  const isUnavailable = card.disabled ?? false
  const isCommitDisabled = card.commitDisabled ?? false
  const isInteractionBlocked = isUnavailable || isCommitDisabled
  const shouldShowDwellFeedback = isDwellFeedbackTargetActive(
    dwellFeedback ?? {
      activeTargetId: null,
      phase: 'idle',
      progress: 0,
      remainingMs: 0,
    },
    card.trackingId,
  )

  return (
    <button
      type="button"
      className="custom-talk-guardian-prompt-card"
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
      data-cell={card.trackingId ? guardianPromptCellByArea[gridArea] : undefined}
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
      {isLoading && card.loadingLabel ? <p style={loadingLabelStyle}>{card.loadingLabel}</p> : null}
      <h2 style={cardTitleStyle}>{card.title}</h2>
      {card.description ? <p style={cardDescriptionStyle}>{card.description}</p> : null}
    </button>
  )
}

export default function CustomTalkGuardianPromptLayout({
  title,
  assistiveText,
  centerChildren,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  dwellFeedback,
}: CustomTalkGuardianPromptLayoutProps) {
  const setContainerElement = dwellFeedback?.setContainerElement

  return (
    <main
      className="custom-talk-guardian-prompt-page"
      style={pageWrapStyle}
      aria-label={title}
    >
      <style>{layoutCss}</style>
      <div style={contentStyle}>
        <h1 style={srOnlyStyle}>{title}</h1>
        {assistiveText ? (
          <p style={srOnlyStyle} aria-live="polite">
            {assistiveText}
          </p>
        ) : null}
        <div
          className="custom-talk-guardian-prompt-grid"
          style={gridStyle}
          ref={setContainerElement}
        >
          <ActionCard gridArea="top-left" card={topLeft} dwellFeedback={dwellFeedback} />
          <ActionCard gridArea="top-right" card={topRight} dwellFeedback={dwellFeedback} />
          <ActionCard
            gridArea="bottom-left"
            card={bottomLeft}
            dwellFeedback={dwellFeedback}
          />

          <section style={centerCellStyle} aria-label={`${title} 문장`}>
            <div style={centerInnerStyle}>{centerChildren}</div>
          </section>

          <ActionCard
            gridArea="bottom-right"
            card={bottomRight}
            dwellFeedback={dwellFeedback}
          />
        </div>
      </div>
    </main>
  )
}
