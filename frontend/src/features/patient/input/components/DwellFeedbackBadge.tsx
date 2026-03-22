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
  top: '10px',
  right: '10px',
  width: '50px',
  height: '50px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 3,
}

const ringStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '999px',
  padding: '4px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 18px rgba(35, 67, 109, 0.26)',
}

const labelStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.94)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#28476a',
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '-0.01em',
}

export default function DwellFeedbackBadge({
  phase,
  progress,
  remainingMs,
  size = 50,
}: DwellFeedbackBadgeProps) {
  if (!isDwellFeedbackVisible(phase)) {
    return null
  }

  const normalizedProgress = phase === 'locking' ? 0 : Math.min(1, Math.max(0, progress))
  const sweep = Math.round(normalizedProgress * 360)
  const ringBackground =
    phase === 'locking'
      ? 'conic-gradient(from -90deg, #92a8c7 0deg, #92a8c7 360deg)'
      : `conic-gradient(from -90deg, #5d8ec7 ${sweep}deg, rgba(149, 170, 200, 0.22) ${sweep}deg 360deg)`
  const label =
    phase === 'locking'
      ? `${Math.max(0, Math.ceil(remainingMs / 1000))}s`
      : `${Math.round(normalizedProgress * 100)}%`

  return (
    <span
      aria-hidden
      style={{
        ...shellStyle,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <span
        style={{
          ...ringStyle,
          background: ringBackground,
        }}
      >
        <span style={labelStyle}>{label}</span>
      </span>
    </span>
  )
}
