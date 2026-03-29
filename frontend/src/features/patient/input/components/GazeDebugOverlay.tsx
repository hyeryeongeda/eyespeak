import { type CSSProperties, useEffect, useRef } from 'react'
import { useGazeInputStore } from '../stores/gazeInputStore'

const DOT_SIZE = 28
const DOT_BORDER = 3

const dotStyle: CSSProperties = {
  position: 'fixed',
  width: `${DOT_SIZE}px`,
  height: `${DOT_SIZE}px`,
  borderRadius: '50%',
  backgroundColor: 'rgba(239, 68, 68, 0.45)',
  border: `${DOT_BORDER}px solid rgba(239, 68, 68, 0.8)`,
  pointerEvents: 'none',
  zIndex: 99999,
  transform: 'translate(-50%, -50%)',
  transition: 'left 80ms linear, top 80ms linear',
  boxShadow: '0 0 12px 4px rgba(239, 68, 68, 0.25)',
}

export default function GazeDebugOverlay() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = useGazeInputStore.subscribe(state => {
      const dot = dotRef.current
      if (!dot) return

      if (!state.point) {
        dot.style.display = 'none'
        return
      }

      dot.style.display = 'block'
      dot.style.left = `${state.point.clientX}px`
      dot.style.top = `${state.point.clientY}px`
    })

    return unsubscribe
  }, [])

  return <div ref={dotRef} style={{ ...dotStyle, display: 'none' }} aria-hidden />
}
