import { useEffect, useState, type RefObject } from 'react'
import {
  getTrackingTargetIdFromPoint,
  isPointInsideElement,
} from '../services/trackingService'
import { useGazeInputStore } from '../stores/gazeInputStore'

interface UseTrackingOptions {
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

interface InputTrackingState<TTarget extends string> {
  hoveredTargetId: TTarget | null
  isPointerInside: boolean
  pointerType: string | null
  inputSource: 'pointer' | 'gaze' | null
}

interface TrackingState<TTarget extends string>
  extends InputTrackingState<TTarget> {
  pointerHoveredTargetId: TTarget | null
  gazeHoveredTargetId: TTarget | null
}

const INITIAL_INPUT_TRACKING_STATE = {
  hoveredTargetId: null,
  isPointerInside: false,
  pointerType: null,
  inputSource: null,
} as const

const INITIAL_TRACKING_STATE = {
  ...INITIAL_INPUT_TRACKING_STATE,
  pointerHoveredTargetId: null,
  gazeHoveredTargetId: null,
} as const

export function useTracking<TTarget extends string>({
  containerRef,
  enabled = true,
}: UseTrackingOptions): TrackingState<TTarget> {
  const [trackingState, setTrackingState] =
    useState<InputTrackingState<TTarget>>(INITIAL_INPUT_TRACKING_STATE)
  const [gazeTrackingState, setGazeTrackingState] =
    useState<InputTrackingState<TTarget>>(INITIAL_INPUT_TRACKING_STATE)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const resetTracking = () => {
      setTrackingState(INITIAL_INPUT_TRACKING_STATE)
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

  useEffect(() => {
    if (!enabled) {
      return
    }

    let frameId = 0

    const updateFromPoint = () => {
      const gazePoint = useGazeInputStore.getState().point
      const container = containerRef.current

      if (!gazePoint || !container) {
        setGazeTrackingState(INITIAL_INPUT_TRACKING_STATE)
        return
      }

      const isPointerInside = isPointInsideElement(gazePoint.clientX, gazePoint.clientY, container)

      if (!isPointerInside) {
        setGazeTrackingState(INITIAL_INPUT_TRACKING_STATE)
        return
      }

      setGazeTrackingState({
        hoveredTargetId: getTrackingTargetIdFromPoint<TTarget>(
          gazePoint.clientX,
          gazePoint.clientY,
          container,
        ),
        isPointerInside: true,
        pointerType: 'gaze',
        inputSource: 'gaze',
      })
    }


    const tick = () => {
      updateFromPoint()
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [containerRef, enabled])

  if (!enabled) {
    return INITIAL_TRACKING_STATE
  }

  const activeTrackingState = gazeTrackingState.isPointerInside ? gazeTrackingState : trackingState
  const pointerHoveredTargetId =
    trackingState.pointerType === 'mouse' ? trackingState.hoveredTargetId : null

  return {
    ...activeTrackingState,
    pointerHoveredTargetId,
    gazeHoveredTargetId: gazeTrackingState.hoveredTargetId,
  }
}

export default useTracking
