import { useEffect, useMemo, useRef, useState } from 'react'
import { useDwell } from './useDwell'
import {
  CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
  getActivationDelayPreset,
  type CareActivationDelayPresetUpdatedDetail,
} from '../../../../services/careSettingService'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import {
  getInteractiveElementFromPoint,
  getInteractiveElementSelectionKey,
} from '../services/trackingService'
import { PATIENT_DOUBLE_BLINK_EVENT } from '../services/patientModeBridge'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { usePatientModeStore } from '../stores/patientModeStore'
import {
  ACTIVATION_DELAY_OPTIONS,
  type ActivationDelayPreset,
} from '../../../../types/care'

interface UsePatientGazeClickOptions {
  enabled?: boolean
}

const DOUBLE_BLINK_COMMIT_GUARD_MS = 400
const GAZE_TARGET_SWITCH_GRACE_MS = 140

interface GazeTarget {
  element: HTMLElement
  key: string
}

function isActivationDelayPreset(value: unknown): value is ActivationDelayPreset {
  return typeof value === 'string' && value in ACTIVATION_DELAY_OPTIONS
}

export function usePatientGazeClick({
  enabled = true,
}: UsePatientGazeClickOptions = {}) {
  const gazePoint = useGazeInputStore(state => state.point)
  const dwellDurationMs = usePatientModeStore(state => state.globalMenuDwellDurationMs)
  const [activationDelayMs, setActivationDelayMs] =
    useState(ACTIVATION_DELAY_OPTIONS.medium.value)
  const activeElementRef = useRef<HTMLElement | null>(null)
  const lastDoubleBlinkAtRef = useRef(0)
  const targetSwitchTimerRef = useRef<number | null>(null)
  const highlightedElementRef = useRef<HTMLElement | null>(null)
  const [stableGazeTarget, setStableGazeTarget] = useState<GazeTarget | null>(null)

  const rawGazeTarget = useMemo(() => {
    if (!enabled || !gazePoint) {
      return null
    }

    const element = getInteractiveElementFromPoint(gazePoint.clientX, gazePoint.clientY)

    if (!element) {
      return null
    }

    return {
      element,
      key: getInteractiveElementSelectionKey(element),
    }
  }, [enabled, gazePoint])

  useEffect(() => {
    const clearTargetSwitchTimer = () => {
      if (targetSwitchTimerRef.current !== null) {
        window.clearTimeout(targetSwitchTimerRef.current)
        targetSwitchTimerRef.current = null
      }
    }

    if (!enabled) {
      clearTargetSwitchTimer()
      setStableGazeTarget(null)
      return
    }

    const currentTargetKey = stableGazeTarget?.key ?? null
    const nextTargetKey = rawGazeTarget?.key ?? null

    if (currentTargetKey === nextTargetKey) {
      clearTargetSwitchTimer()

      if (
        stableGazeTarget &&
        rawGazeTarget &&
        stableGazeTarget.element !== rawGazeTarget.element
      ) {
        setStableGazeTarget(rawGazeTarget)
      }

      return
    }

    clearTargetSwitchTimer()

    if (!stableGazeTarget && rawGazeTarget) {
      setStableGazeTarget(rawGazeTarget)
      return
    }

    targetSwitchTimerRef.current = window.setTimeout(() => {
      targetSwitchTimerRef.current = null
      setStableGazeTarget(rawGazeTarget)
    }, GAZE_TARGET_SWITCH_GRACE_MS)

    return clearTargetSwitchTimer
  }, [enabled, rawGazeTarget, stableGazeTarget])

  useEffect(() => {
    const nextHighlightedElement = stableGazeTarget?.element ?? null
    const previousHighlightedElement = highlightedElementRef.current

    if (previousHighlightedElement && previousHighlightedElement !== nextHighlightedElement) {
      previousHighlightedElement.removeAttribute('data-gaze-active')
    }

    if (nextHighlightedElement) {
      nextHighlightedElement.setAttribute('data-gaze-active', 'true')
    }

    highlightedElementRef.current = nextHighlightedElement
    activeElementRef.current = nextHighlightedElement

    return () => {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.removeAttribute('data-gaze-active')
        highlightedElementRef.current = null
      }
    }
  }, [stableGazeTarget])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleDoubleBlink = () => {
      lastDoubleBlinkAtRef.current = Date.now()
      activeElementRef.current = null

      if (import.meta.env.DEV) {
        console.info('[patient-input] double blink detected while dwell is active')
      }
    }

    window.addEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink)

    return () => {
      window.removeEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink)
    }
  }, [enabled])

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
        // Keep the default activation delay when preset sync fails.
      })

    return () => {
      isMounted = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleActivationDelayUpdated = (event: Event) => {
      const preset = (event as CustomEvent<CareActivationDelayPresetUpdatedDetail>).detail?.preset

      if (!isActivationDelayPreset(preset)) {
        return
      }

      setActivationDelayMs(ACTIVATION_DELAY_OPTIONS[preset].value)
    }

    window.addEventListener(
      CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
      handleActivationDelayUpdated as EventListener,
    )

    return () => {
      window.removeEventListener(
        CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
        handleActivationDelayUpdated as EventListener,
      )
    }
  }, [enabled])

  useDwell<string>({
    hoveredTargetId: stableGazeTarget?.key ?? null,
    dwellDurationMs,
    activationDelayMs,
    disabled: !enabled || !stableGazeTarget,
    onCommit: () => {
      const now = Date.now()

      if (now - lastDoubleBlinkAtRef.current <= DOUBLE_BLINK_COMMIT_GUARD_MS) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] skipped dwell commit because a double blink just fired', {
            targetKey: stableGazeTarget?.key ?? null,
          })
        }

        return
      }

      if (usePatientModeStore.getState().isGlobalMenuOpen) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] skipped dwell commit because the global menu is open', {
            targetKey: stableGazeTarget?.key ?? null,
          })
        }

        return
      }

      const targetElement = activeElementRef.current

      if (!targetElement || !targetElement.isConnected) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] skipped dwell commit because the active target is unavailable', {
            targetKey: stableGazeTarget?.key ?? null,
          })
        }

        return
      }

      if (import.meta.env.DEV) {
        console.info('[patient-input] dwell commit', {
          targetKey: stableGazeTarget?.key ?? null,
          dwellDurationMs,
          activationDelayMs,
          tagName: targetElement.tagName,
        })
      }

      submitActiveEyeTrackingSelectionFeedback()
      targetElement.click()
    },
  })
}

export default usePatientGazeClick
