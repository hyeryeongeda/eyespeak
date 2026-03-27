import { useCallback, useRef, useState, type MutableRefObject } from 'react'
import {
  isPatientTrackingAvailable,
  usePatientModeStore,
} from '../stores/patientModeStore'
import { useGazeSelectionStore } from '../stores/gazeSelectionStore'
import type { DwellPhase } from './useDwell'

export interface DwellFeedbackViewModel<TTarget extends string = string> {
  activeTargetId: TTarget | null
  phase: DwellPhase
  progress: number
  remainingMs: number
}

export interface UseDwellFeedbackResult<TTarget extends string = string>
  extends DwellFeedbackViewModel<TTarget> {
  containerRef: MutableRefObject<HTMLElement | null>
  setContainerElement: (element: HTMLElement | null) => void
  hoveredTargetId: TTarget | null
  inputSource: 'pointer' | 'gaze' | null
  enabled: boolean
}

interface UseDwellFeedbackOptions {
  enabled?: boolean
}

function getTrackedElement(trackingId: string | null) {
  if (!trackingId || typeof document === 'undefined') {
    return null
  }

  const escapedTrackingId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(trackingId)
      : trackingId.replace(/["\\]/g, '\\$&')

  return document.querySelector<HTMLElement>(`[data-tracking-id="${escapedTrackingId}"]`)
}

function isTrackedTargetInsideContainer(
  trackingId: string | null,
  container: HTMLElement | null,
) {
  if (!trackingId || !container) {
    return false
  }

  const trackedElement = getTrackedElement(trackingId)
  return Boolean(trackedElement && container.contains(trackedElement))
}

export function isDwellFeedbackVisible(phase: DwellPhase) {
  return phase === 'locking' || phase === 'dwelling'
}

export function isDwellFeedbackTargetActive<TTarget extends string>(
  feedback: DwellFeedbackViewModel<TTarget>,
  targetId: TTarget | string | undefined,
) {
  if (!targetId) {
    return false
  }

  return (
    feedback.activeTargetId === targetId &&
    isDwellFeedbackVisible(feedback.phase)
  )
}

export function useDwellFeedback<TTarget extends string>(
  options: UseDwellFeedbackOptions = {},
): UseDwellFeedbackResult<TTarget> {
  const { enabled = true } = options
  const containerRef = useRef<HTMLElement | null>(null)
  const [containerElement, setContainerElementState] = useState<HTMLElement | null>(null)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const selectionInputSource = useGazeSelectionStore(state => state.inputSource)
  const selectionHoveredTargetId = useGazeSelectionStore(state => state.hoveredTargetId)
  const selectionActiveTargetId = useGazeSelectionStore(state => state.activeTargetId)
  const selectionPhase = useGazeSelectionStore(state => state.phase)
  const selectionProgress = useGazeSelectionStore(state => state.progress)
  const selectionRemainingMs = useGazeSelectionStore(state => state.remainingMs)

  const isFeedbackEnabled =
    enabled &&
    !isGlobalMenuOpen &&
    isPatientTrackingAvailable(trackingStatus)
  const setContainerElement = useCallback((element: HTMLElement | null) => {
    containerRef.current = element
    setContainerElementState(element)
  }, [])

  const hoveredTargetId =
    isFeedbackEnabled &&
    isTrackedTargetInsideContainer(selectionHoveredTargetId, containerElement)
      ? (selectionHoveredTargetId as TTarget)
      : null
  const activeTargetId =
    isFeedbackEnabled &&
    isTrackedTargetInsideContainer(selectionActiveTargetId, containerElement)
      ? (selectionActiveTargetId as TTarget)
      : null

  return {
    containerRef,
    setContainerElement,
    hoveredTargetId,
    inputSource: hoveredTargetId ? selectionInputSource : null,
    enabled: isFeedbackEnabled,
    activeTargetId,
    phase: activeTargetId ? selectionPhase : 'idle',
    progress: activeTargetId ? selectionProgress : 0,
    remainingMs: activeTargetId ? selectionRemainingMs : 0,
  }
}

export default useDwellFeedback
