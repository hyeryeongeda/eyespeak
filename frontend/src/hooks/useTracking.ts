import { useEffect, useMemo, useState, type RefObject } from 'react'
import {
  getTrackingTargetIdFromPoint,
  isPointInsideElement,
} from '../services/trackingService'
import { useGazeInputStore } from '../stores/gazeInputStore'

interface UseTrackingOptions {
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

interface TrackingState<TTarget extends string> {
  hoveredTargetId: TTarget | null
  isPointerInside: boolean
  pointerType: string | null
  inputSource: 'pointer' | 'gaze' | null
}

const INITIAL_TRACKING_STATE = {
  hoveredTargetId: null,
  isPointerInside: false,
  pointerType: null,
  inputSource: null,
} as const

export function useTracking<TTarget extends string>({
  containerRef,
  enabled = true,
}: UseTrackingOptions): TrackingState<TTarget> {
  const gazePoint = useGazeInputStore(state => state.point)
  const [trackingState, setTrackingState] =
    useState<TrackingState<TTarget>>(INITIAL_TRACKING_STATE)

  const gazeTrackingState = useMemo<TrackingState<TTarget>>(() => {
    if (!enabled || !gazePoint) {
      return INITIAL_TRACKING_STATE
    }

    const container = containerRef.current

    if (!container) {
      return INITIAL_TRACKING_STATE
    }

    const isPointerInside = isPointInsideElement(gazePoint.clientX, gazePoint.clientY, container)

    if (!isPointerInside) {
      return INITIAL_TRACKING_STATE
    }

    return {
      hoveredTargetId: getTrackingTargetIdFromPoint<TTarget>(
        gazePoint.clientX,
        gazePoint.clientY,
        container,
      ),
      isPointerInside: true,
      pointerType: 'gaze',
      inputSource: 'gaze',
    }
  }, [containerRef, enabled, gazePoint])

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
          inputSource: null,
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
        inputSource: 'pointer',
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

  return gazeTrackingState.isPointerInside ? gazeTrackingState : trackingState
}

export default useTracking
