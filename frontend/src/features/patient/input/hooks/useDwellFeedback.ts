import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import {
  CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
  getActivationDelayPreset,
  type CareActivationDelayPresetUpdatedDetail,
} from '../../../../services/careSettingService'
import {
  ACTIVATION_DELAY_OPTIONS,
  type ActivationDelayPreset,
} from '../../../../types/care'
import { useDwell, type DwellPhase } from './useDwell'
import { useTracking } from './useTracking'
import {
  isPatientTrackingAvailable,
  usePatientModeStore,
} from '../stores/patientModeStore'

export interface DwellFeedbackViewModel<TTarget extends string = string> {
  activeTargetId: TTarget | null
  phase: DwellPhase
  progress: number
  remainingMs: number
}

export interface UseDwellFeedbackResult<TTarget extends string = string>
  extends DwellFeedbackViewModel<TTarget> {
  containerRef: MutableRefObject<HTMLElement | null>
  hoveredTargetId: TTarget | null
  inputSource: 'pointer' | 'gaze' | null
  enabled: boolean
}

interface UseDwellFeedbackOptions {
  enabled?: boolean
}

function isActivationDelayPreset(value: unknown): value is ActivationDelayPreset {
  return typeof value === 'string' && value in ACTIVATION_DELAY_OPTIONS
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
  const dwellDurationMs = usePatientModeStore(state => state.globalMenuDwellDurationMs)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const [activationDelayMs, setActivationDelayMs] = useState(
    ACTIVATION_DELAY_OPTIONS.medium.value,
  )

  const isFeedbackEnabled =
    enabled &&
    !isGlobalMenuOpen &&
    isPatientTrackingAvailable(trackingStatus)

  const { gazeHoveredTargetId, pointerHoveredTargetId } = useTracking<TTarget>({
    containerRef,
    enabled: isFeedbackEnabled,
  })

  const hoveredTargetId = pointerHoveredTargetId ?? gazeHoveredTargetId
  const inputSource = pointerHoveredTargetId
    ? 'pointer'
    : gazeHoveredTargetId
      ? 'gaze'
      : null
  const handleCommit = useCallback((_targetId: TTarget) => {}, [])

  const dwellState = useDwell<TTarget>({
    hoveredTargetId,
    dwellDurationMs,
    activationDelayMs,
    disabled: !isFeedbackEnabled || !hoveredTargetId,
    onCommit: handleCommit,
  })

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isMounted = true

    void getActivationDelayPreset()
      .then(result => {
        if (!isMounted || !result.success) {
          return
        }

        setActivationDelayMs(ACTIVATION_DELAY_OPTIONS[result.data].value)
      })
      .catch(() => {
        // Keep default activation delay when sync fails.
      })

    return () => {
      isMounted = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handlePresetUpdated = (event: Event) => {
      const preset = (
        event as CustomEvent<CareActivationDelayPresetUpdatedDetail>
      ).detail?.preset

      if (!isActivationDelayPreset(preset)) {
        return
      }

      setActivationDelayMs(ACTIVATION_DELAY_OPTIONS[preset].value)
    }

    window.addEventListener(
      CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
      handlePresetUpdated as EventListener,
    )

    return () => {
      window.removeEventListener(
        CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
        handlePresetUpdated as EventListener,
      )
    }
  }, [enabled])

  return {
    containerRef,
    hoveredTargetId,
    inputSource,
    enabled: isFeedbackEnabled,
    activeTargetId: dwellState.activeTargetId,
    phase: dwellState.phase,
    progress: dwellState.progress,
    remainingMs: dwellState.remainingMs,
  }
}

export default useDwellFeedback
