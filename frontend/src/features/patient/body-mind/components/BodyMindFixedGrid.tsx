import type { CSSProperties, ReactNode } from 'react'

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gridTemplateAreas: `
    "slot-1 slot-2 top"
    "slot-3 slot-4 bottom"
  `,
  gap: '12px',
}

const slotWrapStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
}

const placeholderStyle: CSSProperties = {
  flex: 1,
  visibility: 'hidden',
  pointerEvents: 'none',
}

const slotAreas = ['slot-1', 'slot-2', 'slot-3', 'slot-4'] as const

interface BodyMindFixedGridProps {
  primaryCards: ReactNode[]
  topRightCard: ReactNode
  bottomRightCard: ReactNode
}

export default function BodyMindFixedGrid({
  primaryCards,
  topRightCard,
  bottomRightCard,
}: BodyMindFixedGridProps) {
  return (
    <div className="body-mind-fixed-grid" style={gridStyle}>
      {slotAreas.map((area, index) => (
        <div key={area} style={{ ...slotWrapStyle, gridArea: area }}>
          {primaryCards[index] ?? <div aria-hidden style={placeholderStyle} />}
        </div>
      ))}

      <div style={{ ...slotWrapStyle, gridArea: 'top' }}>{topRightCard}</div>
      <div style={{ ...slotWrapStyle, gridArea: 'bottom' }}>{bottomRightCard}</div>
    </div>
  )
}
