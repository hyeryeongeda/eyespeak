import type { CalibrationTrackingStatus } from '../../../../types/calibration'

export const PATIENT_DOUBLE_BLINK_EVENT = 'patient-tracking:double-blink'
export const PATIENT_TRACKING_STATUS_EVENT = 'patient-tracking:status-change'
export const PATIENT_GLOBAL_MENU_ACTION_EVENT = 'patient-global-menu:action'

export type PatientGlobalMenuActionId = 'yes' | 'no' | 'sos' | 'home'
export type PatientDoubleBlinkSource = 'runtime' | 'keyboard-shortcut'

export interface PatientDoubleBlinkDetail {
  source: PatientDoubleBlinkSource
}

export interface PatientTrackingStatusChangeDetail {
  status: CalibrationTrackingStatus
}

export interface PatientGlobalMenuActionDetail {
  actionId: PatientGlobalMenuActionId
}

const VALID_TRACKING_STATUSES: CalibrationTrackingStatus[] = [
  'idle',
  'face-not-detected',
  'tracking-unstable',
  'ready',
]

export function isCalibrationTrackingStatus(value: unknown): value is CalibrationTrackingStatus {
  return (
    typeof value === 'string' &&
    VALID_TRACKING_STATUSES.includes(value as CalibrationTrackingStatus)
  )
}

export function emitPatientDoubleBlink(source: PatientDoubleBlinkSource = 'runtime') {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<PatientDoubleBlinkDetail>(PATIENT_DOUBLE_BLINK_EVENT, {
      cancelable: true,
      detail: {
        source,
      },
    }),
  )
}

export function emitPatientTrackingStatus(status: CalibrationTrackingStatus) {
  if (typeof window === 'undefined') {
    return
  }

  // TODO: Wire runtime face detection / tracking stability updates into this bridge.
  window.dispatchEvent(
    new CustomEvent<PatientTrackingStatusChangeDetail>(PATIENT_TRACKING_STATUS_EVENT, {
      detail: { status },
    }),
  )
}

export function emitPatientGlobalMenuAction(actionId: PatientGlobalMenuActionId) {
  if (typeof window === 'undefined') {
    return false
  }

  return !window.dispatchEvent(
    new CustomEvent<PatientGlobalMenuActionDetail>(PATIENT_GLOBAL_MENU_ACTION_EVENT, {
      cancelable: true,
      detail: { actionId },
    }),
  )
}
