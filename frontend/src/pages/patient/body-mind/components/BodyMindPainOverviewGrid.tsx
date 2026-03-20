import type { CSSProperties, ReactNode } from 'react'

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 1.3fr) minmax(0, 1fr)',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gridTemplateAreas: `
    "upper guide lower"
    "middle guide back"
  `,
  gap: '14px',
}

const slotStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
}

interface BodyMindPainOverviewGridProps {
  upperCard: ReactNode
  middleCard: ReactNode
  guideCard: ReactNode
  lowerCard: ReactNode
  backCard: ReactNode
}

export default function BodyMindPainOverviewGrid({
  upperCard,
  middleCard,
  guideCard,
  lowerCard,
  backCard,
}: BodyMindPainOverviewGridProps) {
  return (
    <div style={gridStyle}>
      <div style={{ ...slotStyle, gridArea: 'upper' }}>{upperCard}</div>
      <div style={{ ...slotStyle, gridArea: 'middle' }}>{middleCard}</div>
      <div style={{ ...slotStyle, gridArea: 'guide' }}>{guideCard}</div>
      <div style={{ ...slotStyle, gridArea: 'lower' }}>{lowerCard}</div>
      <div style={{ ...slotStyle, gridArea: 'back' }}>{backCard}</div>
    </div>
  )
}
