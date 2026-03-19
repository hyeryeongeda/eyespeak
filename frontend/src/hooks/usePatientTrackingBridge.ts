import { useEffect } from 'react'
import {
  PATIENT_DOUBLE_BLINK_EVENT,
  PATIENT_TRACKING_STATUS_EVENT,
  isCalibrationTrackingStatus,
  type PatientTrackingStatusChangeDetail,
} from '../services/patientModeBridge'
import { usePatientModeStore } from '../stores/patientModeStore'

interface UsePatientTrackingBridgeOptions {
  enabled?: boolean
}

export function usePatientTrackingBridge({
  enabled = true,
}: UsePatientTrackingBridgeOptions = {}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    usePatientModeStore.getState().setTrackingStatus('ready')

    const handleDoubleBlink = () => {
      usePatientModeStore.getState().handleDoubleBlink()
    }

    const handleTrackingStatusChange = (event: Event) => {
      const status = (event as CustomEvent<PatientTrackingStatusChangeDetail>).detail?.status

      if (!isCalibrationTrackingStatus(status)) {
        return
      }

      usePatientModeStore.getState().setTrackingStatus(status)
    }

    window.addEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink)
    window.addEventListener(
      PATIENT_TRACKING_STATUS_EVENT,
      handleTrackingStatusChange as EventListener,
    )

    return () => {
      window.removeEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink)
      window.removeEventListener(
        PATIENT_TRACKING_STATUS_EVENT,
        handleTrackingStatusChange as EventListener,
      )
      usePatientModeStore.getState().resetPatientModeState()
    }
  }, [enabled])
}

export default usePatientTrackingBridge
