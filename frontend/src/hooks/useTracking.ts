import { useEffect, useState, type RefObject } from 'react'
import {
  getTrackingTargetIdFromPoint,
  isPointInsideElement,
} from '../services/trackingService'

interface UseTrackingOptions {
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

interface TrackingState<TTarget extends string> {
  hoveredTargetId: TTarget | null
  isPointerInside: boolean
  pointerType: string | null
}

const INITIAL_TRACKING_STATE = {
  hoveredTargetId: null,
  isPointerInside: false,
  pointerType: null,
} as const

export function useTracking<TTarget extends string>({
  containerRef,
  enabled = true,
}: UseTrackingOptions): TrackingState<TTarget> {
  const [trackingState, setTrackingState] =
    useState<TrackingState<TTarget>>(INITIAL_TRACKING_STATE)

  useEffect(() => {
    if (!enabled) {
      setTrackingState(INITIAL_TRACKING_STATE)
      return
    }

    const resetTracking = () => {
      setTrackingState(INITIAL_TRACKING_STATE)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current

      if (!container) {
        resetTracking()
        return
      }

      const isPointerInside = isPointInsideElement(event.clientX, event.clientY, container)

      if (!isPointerInside) {
        setTrackingState({
          hoveredTargetId: null,
          isPointerInside: false,
          pointerType: event.pointerType || null,
        })
        return
      }

      const hoveredTargetId = getTrackingTargetIdFromPoint<TTarget>(
        event.clientX,
        event.clientY,
        container,
      )

      setTrackingState({
        hoveredTargetId,
        isPointerInside: true,
        pointerType: event.pointerType || null,
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointercancel', resetTracking)
    window.addEventListener('blur', resetTracking)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointercancel', resetTracking)
      window.removeEventListener('blur', resetTracking)
    }
  }, [containerRef, enabled])

  return trackingState
}

export default useTracking
