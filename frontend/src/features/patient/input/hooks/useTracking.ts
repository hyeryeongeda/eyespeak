import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  getWeightedInteractiveTargetFromArea,
  getTrackingTargetIdFromPoint,
  isPointInsideElement,
} from '../services/trackingService'
import {
  getPatientSelectionProfile,
  type PatientSelectionSurface,
} from '../services/patientSelectionPolicy'
import { useGazeInputStore } from '../stores/gazeInputStore'

interface UseTrackingOptions {
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
  selectionSurface?: PatientSelectionSurface
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

interface TrackingTargetCandidate<TTarget extends string> {
  targetId: TTarget | null
  confidence: number
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

const INITIAL_TRACKING_TARGET_CANDIDATE = {
  targetId: null,
  confidence: 0,
} as const

export function useTracking<TTarget extends string>({
  containerRef,
  enabled = true,
  selectionSurface = 'common',
}: UseTrackingOptions): TrackingState<TTarget> {
  const selectionProfile = useMemo(
    () => getPatientSelectionProfile(selectionSurface),
    [selectionSurface],
  )
  const [trackingState, setTrackingState] =
    useState<InputTrackingState<TTarget>>(INITIAL_INPUT_TRACKING_STATE)
  const [isGazeInside, setIsGazeInside] = useState(false)
  const [gazeRawTarget, setGazeRawTarget] = useState<TrackingTargetCandidate<TTarget>>(
    INITIAL_TRACKING_TARGET_CANDIDATE,
  )
  const [gazeStableTarget, setGazeStableTarget] = useState<TrackingTargetCandidate<TTarget>>(
    INITIAL_TRACKING_TARGET_CANDIDATE,
  )
  const pendingGazeTargetRef = useRef<TrackingTargetCandidate<TTarget>>(
    INITIAL_TRACKING_TARGET_CANDIDATE,
  )
  const targetSwitchTimerRef = useRef<number | null>(null)

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
      setIsGazeInside(false)
      setGazeRawTarget(INITIAL_TRACKING_TARGET_CANDIDATE)
      setGazeStableTarget(INITIAL_TRACKING_TARGET_CANDIDATE)
      return
    }

    let frameId = 0
    const resolveTrackingCandidate = (
      clientX: number,
      clientY: number,
      container: HTMLElement,
    ): TrackingTargetCandidate<TTarget> => {
      const areaTarget = getWeightedInteractiveTargetFromArea(clientX, clientY, {
        container,
        radiusPx: selectionProfile.areaHitRadiusPx,
      })
      const areaTargetId = areaTarget?.element.dataset.trackingId as TTarget | undefined

      if (areaTarget && areaTargetId) {
        return {
          targetId: areaTargetId,
          confidence: 0.55 + areaTarget.score * 0.45,
        }
      }

      const pointTargetId = getTrackingTargetIdFromPoint<TTarget>(clientX, clientY, container)

      return pointTargetId
        ? {
            targetId: pointTargetId,
            confidence: 0.88,
          }
        : INITIAL_TRACKING_TARGET_CANDIDATE
    }

    const updateFromPoint = () => {
      const gazePoint = useGazeInputStore.getState().point
      const container = containerRef.current

      if (!gazePoint || !container) {
        setIsGazeInside(false)
        setGazeRawTarget(INITIAL_TRACKING_TARGET_CANDIDATE)
        return
      }

      const isPointerInside = isPointInsideElement(gazePoint.clientX, gazePoint.clientY, container)

      if (!isPointerInside) {
        setIsGazeInside(false)
        setGazeRawTarget(INITIAL_TRACKING_TARGET_CANDIDATE)
        return
      }

      setIsGazeInside(true)
      setGazeRawTarget(current => {
        const nextCandidate = resolveTrackingCandidate(
          gazePoint.clientX,
          gazePoint.clientY,
          container,
        )

        return current.targetId === nextCandidate.targetId &&
          current.confidence === nextCandidate.confidence
          ? current
          : nextCandidate
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
  }, [containerRef, enabled, selectionProfile.areaHitRadiusPx])

  useEffect(() => {
    const clearTargetSwitchTimer = () => {
      if (targetSwitchTimerRef.current !== null) {
        window.clearTimeout(targetSwitchTimerRef.current)
        targetSwitchTimerRef.current = null
      }
    }

    if (!enabled || !isGazeInside) {
      clearTargetSwitchTimer()
      setGazeStableTarget(INITIAL_TRACKING_TARGET_CANDIDATE)
      return
    }

    const currentTargetId = gazeStableTarget.targetId
    const nextTargetId = gazeRawTarget.targetId

    if (currentTargetId === nextTargetId) {
      clearTargetSwitchTimer()

      if (
        gazeStableTarget.confidence !== gazeRawTarget.confidence &&
        nextTargetId !== null
      ) {
        setGazeStableTarget(gazeRawTarget)
      }

      return
    }

    if (!currentTargetId && nextTargetId) {
      clearTargetSwitchTimer()
      setGazeStableTarget(gazeRawTarget)
      return
    }

    if (
      currentTargetId &&
      nextTargetId &&
      gazeRawTarget.confidence < gazeStableTarget.confidence + selectionProfile.switchMargin
    ) {
      clearTargetSwitchTimer()
      return
    }

    clearTargetSwitchTimer()

    pendingGazeTargetRef.current = gazeRawTarget
    targetSwitchTimerRef.current = window.setTimeout(() => {
      targetSwitchTimerRef.current = null
      setGazeStableTarget(pendingGazeTargetRef.current)
    }, nextTargetId !== null ? selectionProfile.switchHoldMs : selectionProfile.stableHoldMs)

    return clearTargetSwitchTimer
  }, [enabled, gazeRawTarget, gazeStableTarget, isGazeInside, selectionProfile])

  if (!enabled) {
    return INITIAL_TRACKING_STATE
  }

  const gazeHoveredTargetId = isGazeInside ? gazeStableTarget.targetId : null
  const activeTrackingState: InputTrackingState<TTarget> = gazeHoveredTargetId
    ? {
        hoveredTargetId: gazeHoveredTargetId,
        isPointerInside: true,
        pointerType: 'gaze',
        inputSource: 'gaze',
      }
    : trackingState
  const pointerHoveredTargetId =
    trackingState.pointerType === 'mouse' ? trackingState.hoveredTargetId : null

  return {
    ...activeTrackingState,
    pointerHoveredTargetId,
    gazeHoveredTargetId,
  }
}

export default useTracking
