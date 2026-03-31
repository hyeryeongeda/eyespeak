import { useEffect } from 'react'
import {
  emitPatientDoubleBlink,
  PATIENT_DOUBLE_BLINK_EVENT,
  PATIENT_TRACKING_STATUS_EVENT,
  isCalibrationTrackingStatus,
  type PatientDoubleBlinkDetail,
  type PatientTrackingStatusChangeDetail,
} from '../services/patientModeBridge'
import { usePatientModeStore } from '../stores/patientModeStore'

interface UsePatientTrackingBridgeOptions {
  enabled?: boolean
}

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.getAttribute('role') === 'textbox'
  )
}

export function usePatientTrackingBridge({
  enabled = true,
}: UsePatientTrackingBridgeOptions = {}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleDoubleBlink = (event: Event) => {
      const detail = (event as CustomEvent<PatientDoubleBlinkDetail>).detail
      window.queueMicrotask(() => {
        if (event.defaultPrevented) {
          if (import.meta.env.DEV) {
            console.info('[patient-input] double blink bridge event consumed before menu toggle', {
              source: detail?.source ?? 'unknown',
              globalMenuOpen: usePatientModeStore.getState().isGlobalMenuOpen,
            })
          }

          return
        }

        if (import.meta.env.DEV) {
          const isGlobalMenuOpen = usePatientModeStore.getState().isGlobalMenuOpen

          console.info('[patient-input] double blink bridge event', {
            source: detail?.source ?? 'unknown',
            globalMenuBeforeToggle: isGlobalMenuOpen,
          })
        }

        usePatientModeStore.getState().handleDoubleBlink(detail?.source)
      })
    }

    const handleTrackingStatusChange = (event: Event) => {
      const status = (event as CustomEvent<PatientTrackingStatusChangeDetail>).detail?.status

      if (!isCalibrationTrackingStatus(status)) {
        return
      }

      // if (import.meta.env.DEV) {
      //   console.info('[patient-input] tracking status changed', {
      //     status,
      //   })
      // }

      usePatientModeStore.getState().setTrackingStatus(status)
    }

    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (
        !event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.metaKey ||
        event.repeat ||
        event.code !== 'KeyC' ||
        isEditableEventTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      emitPatientDoubleBlink('keyboard-shortcut')
    }

    window.addEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink)
    window.addEventListener(
      PATIENT_TRACKING_STATUS_EVENT,
      handleTrackingStatusChange as EventListener,
    )
    window.addEventListener('keydown', handleKeyboardShortcut)

    return () => {
      window.removeEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink)
      window.removeEventListener(
        PATIENT_TRACKING_STATUS_EVENT,
        handleTrackingStatusChange as EventListener,
      )
      window.removeEventListener('keydown', handleKeyboardShortcut)
      usePatientModeStore.getState().resetPatientModeState()
    }
  }, [enabled])
}

export default usePatientTrackingBridge
