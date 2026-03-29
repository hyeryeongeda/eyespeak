import { type CSSProperties, useEffect, useRef } from 'react'
import { useGazeInputStore } from '../stores/gazeInputStore'

const dotStyle: CSSProperties = {
  position: 'fixed',
  width: '100px',
  height: '100px',
  borderRadius: '50%',
  backgroundColor: 'rgba(0, 0, 0, 0.025)',
  pointerEvents: 'none',
  zIndex: 99999,
  transform: 'translate(-50%, -50%)',
  transition: 'left 80ms linear, top 80ms linear',
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
