import type { CalibrationPoint, CalibrationReadinessStep } from '../../types/calibration'

export const PATIENT_CALIBRATION_STORAGE_KEY = 'patientCalibrationStatus'
export const CALIBRATION_START_COUNTDOWN_SECONDS = 3
export const CALIBRATION_POINT_CAPTURE_DELAY_MS = 1500
export const CALIBRATION_COMPLETION_REDIRECT_DELAY_MS = 1200

export const DEFAULT_CALIBRATION_POINTS: CalibrationPoint[] = [
  { id: 'p01', label: '1', xPercent: 12, yPercent: 16 },
  { id: 'p02', label: '2', xPercent: 38, yPercent: 16 },
  { id: 'p03', label: '3', xPercent: 62, yPercent: 16 },
  { id: 'p04', label: '4', xPercent: 88, yPercent: 16 },
  { id: 'p05', label: '5', xPercent: 12, yPercent: 39 },
  { id: 'p06', label: '6', xPercent: 38, yPercent: 39 },
  { id: 'p07', label: '7', xPercent: 62, yPercent: 39 },
  { id: 'p08', label: '8', xPercent: 88, yPercent: 39 },
  { id: 'p09', label: '9', xPercent: 12, yPercent: 67 },
  { id: 'p10', label: '10', xPercent: 38, yPercent: 67 },
  { id: 'p11', label: '11', xPercent: 62, yPercent: 67 },
  { id: 'p12', label: '12', xPercent: 88, yPercent: 67 },
]

export const DEFAULT_CALIBRATION_READINESS_STEPS: CalibrationReadinessStep[] = [
  { status: 'face-not-detected', durationMs: 1200 },
  { status: 'tracking-unstable', durationMs: 1000 },
  { status: 'ready', durationMs: 0 },
]
