import type { CSSProperties } from 'react'
import type { DwellPhase } from '../hooks/useDwell'
import { isDwellFeedbackVisible } from '../hooks/useDwellFeedback'

interface DwellFeedbackBadgeProps {
  phase: DwellPhase
  progress: number
  remainingMs: number
  size?: number
}

const shellStyle: CSSProperties = {
  position: 'absolute',
  inset: '1px',
  pointerEvents: 'none',
  zIndex: 4,
}

const svgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'visible',
  filter: 'drop-shadow(0 0 8px rgba(130, 149, 238, 0.16))',
}

export default function DwellFeedbackBadge({
  phase,
  progress,
  remainingMs: _remainingMs,
  size = 5,
}: DwellFeedbackBadgeProps) {
  if (!isDwellFeedbackVisible(phase)) {
    return null
  }

  const normalizedProgress = Math.min(1, Math.max(0, progress))
  const outlineProgress = phase === 'dwelling' ? 1 : normalizedProgress
  const strokeWidth = Math.min(5.2, Math.max(3.2, size * 0.62))
  const glowWidth = strokeWidth + 2.6
  const rectInset = 4.5
  const rectSize = 1000 - rectInset * 2
  const radius = 48
  const guideColor = 'rgba(165, 181, 229, 0.55)'
  const glowColor =
    phase === 'dwelling' ? 'rgba(113, 133, 238, 0.24)' : 'rgba(134, 154, 244, 0.14)'
  const strokeColor = phase === 'dwelling' ? '#6f82ef' : '#8ea0f7'

  return (
    <span aria-hidden style={shellStyle}>
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={svgStyle}
      >
        <rect
          x={rectInset}
          y={rectInset}
          width={rectSize}
          height={rectSize}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={guideColor}
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={rectInset}
          y={rectInset}
          width={rectSize}
          height={rectSize}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={glowColor}
          strokeWidth={glowWidth}
          opacity={phase === 'dwelling' ? 0.95 : 0.85}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={rectInset}
          y={rectInset}
          width={rectSize}
          height={rectSize}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1000}
          strokeDasharray={`${outlineProgress * 1000} 1000`}
          transform="rotate(-90 500 500)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  )
}
