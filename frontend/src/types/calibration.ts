export type CameraPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error'

export type CalibrationTrackingStatus =
  | 'idle'
  | 'face-not-detected'
  | 'tracking-unstable'
  | 'ready'

export type CalibrationPhase =
  | 'idle'
  | 'checking-face'
  | 'ready'
  | 'calibrating'
  | 'completed'
  | 'error'

export interface CalibrationPoint {
  id: string
  label: string
  xPercent: number
  yPercent: number
}

export interface CalibrationReadinessStep {
  status: Exclude<CalibrationTrackingStatus, 'idle'>
  durationMs: number
}

export interface CalibrationCaptureResult {
  success: boolean
  trackingStatus?: Exclude<CalibrationTrackingStatus, 'idle' | 'ready'>
}

export interface PatientCalibrationStatus {
  required: boolean
  completedAt: string | null
}

export interface StoredPatientCalibrationRecord {
  completedAt: string
  eyeTrackingProfileId: string | null
  runtimeVerifiedAt: string | null
}

export interface PatientPostAuthNotice {
  authSuccessMessage: string
  calibrationMessage?: string
}

export interface PatientCalibrationLocationState {
  postAuthNotice?: PatientPostAuthNotice
}
