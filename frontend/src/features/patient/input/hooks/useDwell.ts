import { useEffect, useRef, useState } from 'react'
import { clampTrackingProgress } from '../services/trackingService'

export type DwellPhase = 'idle' | 'locking' | 'dwelling' | 'triggered'

interface UseDwellOptions<TTarget extends string> {
  hoveredTargetId: TTarget | null
  dwellDurationMs: number
  activationDelayMs?: number
  disabled?: boolean
  onCommit: (targetId: TTarget) => void
}

interface DwellState<TTarget extends string> {
  activeTargetId: TTarget | null
  phase: DwellPhase
  progress: number
  remainingMs: number
}

const INITIAL_DWELL_STATE = {
  activeTargetId: null,
  phase: 'idle',
  progress: 0,
  remainingMs: 0,
} as const

export function useDwell<TTarget extends string>({
  hoveredTargetId,
  dwellDurationMs,
  activationDelayMs = 0,
  disabled = false,
  onCommit,
}: UseDwellOptions<TTarget>): DwellState<TTarget> {
  const [dwellState, setDwellState] = useState<DwellState<TTarget>>(INITIAL_DWELL_STATE)
  const onCommitRef = useRef(onCommit)

  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  useEffect(() => {
    if (disabled || !hoveredTargetId) {
      return
    }

    const normalizedDwellMs = Math.max(1, dwellDurationMs)
    const normalizedActivationDelayMs = Math.max(0, activationDelayMs)
    const lockEndsAt = performance.now() + normalizedActivationDelayMs
    const dwellEndsAt = lockEndsAt + normalizedDwellMs
    let frameId = 0
    let didCommit = false

    const tick = (now: number) => {
      if (now < lockEndsAt) {
        setDwellState({
          activeTargetId: hoveredTargetId,
          phase: 'locking',
          progress: 0,
          remainingMs: Math.max(0, Math.ceil(lockEndsAt - now)),
        })
        frameId = window.requestAnimationFrame(tick)
        return
      }

      const progress = clampTrackingProgress((now - lockEndsAt) / normalizedDwellMs)

      if (progress >= 1) {
        setDwellState({
          activeTargetId: hoveredTargetId,
          phase: 'triggered',
          progress: 1,
          remainingMs: 0,
        })

        if (!didCommit) {
          didCommit = true
          onCommitRef.current(hoveredTargetId)
        }

        return
      }

      setDwellState({
        activeTargetId: hoveredTargetId,
        phase: 'dwelling',
        progress,
        remainingMs: Math.max(0, Math.ceil(dwellEndsAt - now)),
      })
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [activationDelayMs, disabled, dwellDurationMs, hoveredTargetId])

  if (disabled || !hoveredTargetId) {
    return INITIAL_DWELL_STATE
  }

  return dwellState
}

export default useDwell
