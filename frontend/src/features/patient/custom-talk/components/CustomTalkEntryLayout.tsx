import type { CSSProperties, ReactNode } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  type UseDwellFeedbackResult,
} from '../../input/hooks/useDwellFeedback'
import type { CustomTalkStageActionCard } from './CustomTalkStageLayout'

type CustomTalkEntryActionCard = CustomTalkStageActionCard & {
  trackingId?: string
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
  minHeight: '100dvh',
  width: '100%',
  padding: '16px',
  boxSizing: 'border-box',
  background: 'linear-gradient(180deg, #edf3f8 0%, #f8fbff 48%, #eef2f6 100%)',
  overflow: 'auto',
}

const gridStyle: CSSProperties = {
  width: '100%',
  minHeight: 'calc(100dvh - 32px)',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'minmax(200px, 0.92fr) minmax(120px, auto) minmax(200px, 0.92fr)',
  gridTemplateAreas: `
    "top-left top-center top-right"
    "center center center"
    "bottom-left bottom-center bottom-right"
  `,
  gap: '12px',
}

const cardBaseStyle: CSSProperties = {
  borderRadius: '30px',
  padding: '20px 18px',
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
    opacity: disabled ? 0.58 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
}

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: '#1f3047',
  fontSize: 'clamp(3.5rem, 6vw, 4.75rem)',
  fontWeight: 900,
  lineHeight: 1.28,
}

const cardDescriptionStyle: CSSProperties = {
  margin: '10px 0 0',
  maxWidth: '20ch',
  color: '#6f8095',
  fontSize: 'clamp(0.85rem, 1vw, 1rem)',
  fontWeight: 700,
  lineHeight: 1.58,
}

const centerAreaStyle: CSSProperties = {
  gridArea: 'center',
  minHeight: 0,
  borderRadius: '30px',
  border: '1px solid rgba(219, 227, 236, 0.9)',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, #f8fbff 100%)',
  boxShadow: '0 18px 40px rgba(53, 77, 103, 0.08)',
  overflow: 'hidden',
}

const layoutCss = `
  .custom-talk-entry-page {
    overflow-x: hidden;
  }

  .custom-talk-entry-card:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 26px 56px rgba(53, 77, 103, 0.14);
  }

  .custom-talk-entry-card:focus-visible {
    outline: 3px solid #6b91c7;
    outline-offset: 3px;
  }

`

function ActionCard({
  gridArea,
  card,
  dwellFeedback,
}: {
  gridArea: string
  card: CustomTalkEntryActionCard
  dwellFeedback?: UseDwellFeedbackResult<string>
}) {
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
      style={getCardStyle(gridArea, card.tone, card.disabled ?? false)}
      disabled={card.disabled}
      onClick={card.onSelect}
      data-tracking-id={card.disabled ? undefined : card.trackingId}
    >
      {shouldShowDwellFeedback && dwellFeedback ? (
        <DwellFeedbackBadge
          phase={dwellFeedback.phase}
          progress={dwellFeedback.progress}
          remainingMs={dwellFeedback.remainingMs}
        />
      ) : null}
      <h2 style={cardTitleStyle}>{card.title}</h2>
      {card.description ? <p style={cardDescriptionStyle}>{card.description}</p> : null}
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
  return (
    <main className="custom-talk-entry-page" style={pageWrap} aria-label={title}>
      <style>{layoutCss}</style>
      <div
        className="custom-talk-entry-layout"
        style={{
          ...gridStyle,
          gridTemplateRows: gridTemplateRows ?? gridStyle.gridTemplateRows,
        }}
        ref={element => {
          if (dwellFeedback) {
            dwellFeedback.containerRef.current = element
          }
        }}
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
