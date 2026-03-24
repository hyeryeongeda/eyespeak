import type { CSSProperties, ReactNode } from 'react'

type CustomTalkStageTone = 'sky' | 'sand' | 'mint' | 'slate'

export interface CustomTalkStageActionCard {
  title: string
  description: string
  tone: CustomTalkStageTone
  onSelect: () => void
  disabled?: boolean
}

interface CustomTalkStageLayoutProps {
  code: string
  title: string
  description: string
  stepLabel: string
  centerChildren: ReactNode
  leftTop: CustomTalkStageActionCard
  leftBottom: CustomTalkStageActionCard
  rightTop: CustomTalkStageActionCard
  rightBottom: CustomTalkStageActionCard
}

const pageWrap: CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  padding: '16px',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const statusBar: CSSProperties = {
  flexShrink: 0,
  marginBottom: '12px',
  padding: '12px 16px',
  borderRadius: '16px',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid #dde7ed',
  fontSize: '16px',
  fontWeight: 700,
  color: '#203042',
}

const threeColLayout: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: '1fr 2fr 1fr',
  gridTemplateRows: '1fr 1fr',
  gap: '12px',
  gridTemplateAreas: `
    "left-top center right-top"
    "left-bottom center right-bottom"
  `,
}

const cardBase: CSSProperties = {
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  padding: '20px 18px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '#ffffff',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  textAlign: 'center',
}

function getCardStyle(gridArea: string, tone: CustomTalkStageTone, disabled: boolean): CSSProperties {
  const backgroundByTone: Record<CustomTalkStageTone, string> = {
    sky: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
    sand: 'linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)',
    mint: 'linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)',
    slate: 'linear-gradient(135deg, #f5f5f8 0%, #eef0f5 100%)',
  }

  return {
    ...cardBase,
    gridArea,
    background: backgroundByTone[tone],
    opacity: disabled ? 0.58 : 1,
    cursor: disabled ? 'default' : 'pointer',
  }
}

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.35rem, 2.2vw, 1.9rem)',
  fontWeight: 800,
  color: '#203042',
  lineHeight: 1.3,
}

const cardSubStyle: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 'clamp(1rem, 1.35vw, 1.1rem)',
  fontWeight: 600,
  color: '#708191',
  lineHeight: 1.5,
}

const centerArea: CSSProperties = {
  gridArea: 'center',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  backgroundColor: '#ffffff',
  overflow: 'hidden',
}

const centerHeader: CSSProperties = {
  flexShrink: 0,
  padding: '14px 20px',
  borderBottom: '1px solid #e8eef4',
}

const headerTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.45rem, 2vw, 1.95rem)',
  fontWeight: 800,
  color: '#203042',
}

const headerSubStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 'clamp(1rem, 1.25vw, 1.08rem)',
  fontWeight: 700,
  color: '#708191',
  lineHeight: 1.5,
}

const centerBody: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const layoutCss = `
  .custom-talk-stage-card:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 24px 56px rgba(40, 66, 90, 0.16);
  }

  .custom-talk-stage-card:focus-visible {
    outline: 2px solid #5d8ec7;
    outline-offset: 2px;
  }

  @media (max-width: 1320px) {
    .custom-talk-stage-layout {
      grid-template-columns: 1fr 1.5fr 1fr !important;
    }
  }

  @media (max-width: 1100px) {
    .custom-talk-stage-layout {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto auto auto auto auto !important;
      grid-template-areas:
        "center"
        "left-top"
        "right-top"
        "left-bottom"
        "right-bottom" !important;
    }
  }
`

function ActionCard({
  gridArea,
  card,
}: {
  gridArea: string
  card: CustomTalkStageActionCard
}) {
  return (
    <button
      type="button"
      className="custom-talk-stage-card"
      style={getCardStyle(gridArea, card.tone, card.disabled ?? false)}
      disabled={card.disabled}
      onClick={card.onSelect}
    >
      <h2 style={cardTitleStyle}>{card.title}</h2>
      <p style={cardSubStyle}>{card.description}</p>
    </button>
  )
}

export default function CustomTalkStageLayout({
  code,
  title,
  description,
  stepLabel,
  centerChildren,
  leftTop,
  leftBottom,
  rightTop,
  rightBottom,
}: CustomTalkStageLayoutProps) {
  return (
    <main style={pageWrap} aria-label={title}>
      <style>{layoutCss}</style>
      <div style={statusBar}>
        {code} / {stepLabel}
      </div>

      <div className="custom-talk-stage-layout" style={threeColLayout}>
        <ActionCard gridArea="left-top" card={leftTop} />
        <ActionCard gridArea="left-bottom" card={leftBottom} />

        <section style={centerArea} aria-label={title}>
          <div style={centerHeader}>
            <h2 style={headerTitleStyle}>{title}</h2>
            <p style={headerSubStyle}>{description}</p>
          </div>
          <div style={centerBody}>{centerChildren}</div>
        </section>

        <ActionCard gridArea="right-top" card={rightTop} />
        <ActionCard gridArea="right-bottom" card={rightBottom} />
      </div>
    </main>
  )
}
