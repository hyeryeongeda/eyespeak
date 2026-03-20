import type { CalibrationPoint, CalibrationReadinessStep } from '../../types/calibration'

export const PATIENT_CALIBRATION_STORAGE_KEY = 'patientCalibrationStatus'
export const CALIBRATION_START_COUNTDOWN_SECONDS = 3
export const CALIBRATION_POINT_CAPTURE_DELAY_MS = 1500
export const CALIBRATION_COMPLETION_REDIRECT_DELAY_MS = 1200

export const DEFAULT_CALIBRATION_POINTS: CalibrationPoint[] = [
  { id: 'p01', label: '1', xPercent: 3, yPercent: 12 },
  { id: 'p02', label: '2', xPercent: 20, yPercent: 12 },
  { id: 'p03', label: '3', xPercent: 40, yPercent: 12 },
  { id: 'p04', label: '4', xPercent: 60, yPercent: 12 },
  { id: 'p05', label: '5', xPercent: 80, yPercent: 12 },
  { id: 'p06', label: '6', xPercent: 97, yPercent: 12 },
  { id: 'p07', label: '7', xPercent: 3, yPercent: 82 },
  { id: 'p08', label: '8', xPercent: 20, yPercent: 82 },
  { id: 'p09', label: '9', xPercent: 40, yPercent: 82 },
  { id: 'p10', label: '10', xPercent: 60, yPercent: 82 },
  { id: 'p11', label: '11', xPercent: 80, yPercent: 82 },
  { id: 'p12', label: '12', xPercent: 97, yPercent: 82 },
]

export const DEFAULT_CALIBRATION_READINESS_STEPS: CalibrationReadinessStep[] = [
  { status: 'face-not-detected', durationMs: 1200 },
  { status: 'tracking-unstable', durationMs: 1000 },
  { status: 'ready', durationMs: 0 },
]
