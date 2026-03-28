import type { CSSProperties, ReactNode } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type UseDwellFeedbackResult,
} from '../../input/hooks/useDwellFeedback'
import { CUSTOM_TALK_SELECTION_SCOPE_ID } from '../utils/selectionScope'

type CustomTalkGuardianPromptTone = 'sky' | 'sand' | 'mint' | 'slate'

export interface CustomTalkGuardianPromptCard {
  title: string
  description?: string
  tone: CustomTalkGuardianPromptTone
  onSelect: () => void
  disabled?: boolean
  trackingId?: string
  loading?: boolean
  loadingLabel?: string
}

interface CustomTalkGuardianPromptLayoutProps {
  title: string
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
  padding: '8px',
  boxSizing: 'border-box',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  overflow: 'hidden',
}

const contentStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
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
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  padding: '20px 18px',
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
    sky: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
    sand: 'linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)',
    mint: 'linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)',
    slate: 'linear-gradient(135deg, #f5f5f8 0%, #eef0f5 100%)',
  }

  return {
    ...cardBaseStyle,
    gridArea,
    background: backgroundByTone[tone],
    opacity: disabled && !loading ? 0.58 : 1,
    cursor: disabled ? 'default' : 'pointer',
    borderColor: loading ? '#c5d1e0' : tone === 'slate' ? '#d4dfe7' : '#dde7ed',
    boxShadow: loading
      ? '0 24px 52px rgba(114, 137, 164, 0.14)'
      : cardBaseStyle.boxShadow,
  }
}

const cardTitleStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  margin: 0,
  maxWidth: '12ch',
  color: '#111111',
  fontSize: 'clamp(2.9rem, 5vw, 4.2rem)',
  fontWeight: 800,
  lineHeight: 1.24,
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
  borderRadius: '24px',
  overflow: 'hidden',
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

const layoutCss = `
  html:not([data-patient-mode='true']) .custom-talk-guardian-prompt-card:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 24px 56px rgba(40, 66, 90, 0.16);
  }

  html:not([data-patient-mode='true']) .custom-talk-guardian-prompt-card:focus-visible {
    outline: 2px solid #5d8ec7;
    outline-offset: 2px;
  }

  @media (max-width: 1320px) {
    .custom-talk-guardian-prompt-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: minmax(280px, 0.95fr) repeat(2, minmax(0, 1fr)) !important;
      grid-template-areas:
        "center center"
        "top-left top-right"
        "bottom-left bottom-right" !important;
    }
  }

  @media (max-width: 900px) {
    .custom-talk-guardian-prompt-page {
      padding: 8px !important;
    }

    .custom-talk-guardian-prompt-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: minmax(240px, 0.9fr) minmax(150px, 1fr) minmax(150px, 1fr) !important;
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
      grid-template-rows: minmax(220px, 0.88fr) repeat(4, minmax(130px, 1fr)) !important;
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
  const isDisabled = Boolean(card.disabled || isLoading)
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
      style={getCardStyle(gridArea, card.tone, isDisabled, isLoading)}
      disabled={isDisabled}
      onClick={card.onSelect}
      data-tracking-id={isDisabled ? undefined : card.trackingId}
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
  centerChildren,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  dwellFeedback,
}: CustomTalkGuardianPromptLayoutProps) {
  return (
    <main
      className="custom-talk-guardian-prompt-page"
      style={pageWrapStyle}
      aria-label={title}
      data-gaze-selection-scope={CUSTOM_TALK_SELECTION_SCOPE_ID}
    >
      <style>{layoutCss}</style>
      <div style={contentStyle}>
        <div
          className="custom-talk-guardian-prompt-grid"
          style={gridStyle}
          data-gaze-selectable-group={CUSTOM_TALK_SELECTION_SCOPE_ID}
          ref={dwellFeedback?.setContainerElement}
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
