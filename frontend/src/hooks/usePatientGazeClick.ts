import { useEffect, useMemo, useRef, useState } from 'react'
import { useDwell } from './useDwell'
import {
  CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
  getActivationDelayPreset,
  type CareActivationDelayPresetUpdatedDetail,
} from '../services/careSettingService'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import {
  getInteractiveElementFromPoint,
  getInteractiveElementSelectionKey,
} from '../services/trackingService'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { usePatientModeStore } from '../stores/patientModeStore'
import {
  ACTIVATION_DELAY_OPTIONS,
  type ActivationDelayPreset,
} from '../types/care'

interface UsePatientGazeClickOptions {
  enabled?: boolean
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

  const gazeTarget = useMemo(() => {
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
    activeElementRef.current = gazeTarget?.element ?? null
  }, [gazeTarget])

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
    hoveredTargetId: gazeTarget?.key ?? null,
    dwellDurationMs,
    activationDelayMs,
    disabled: !enabled || !gazeTarget,
    onCommit: () => {
      const targetElement = activeElementRef.current

      if (!targetElement || !targetElement.isConnected) {
        return
      }

      submitActiveEyeTrackingSelectionFeedback()
      targetElement.click()
    },
  })
}

export default usePatientGazeClick
