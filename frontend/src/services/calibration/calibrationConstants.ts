import type { CalibrationPoint, CalibrationReadinessStep } from '../../types/calibration'

export const PATIENT_CALIBRATION_STORAGE_KEY = 'patientCalibrationStatus'
export const CALIBRATION_START_COUNTDOWN_SECONDS = 3
export const CALIBRATION_POINT_CAPTURE_DELAY_MS = 1500
export const CALIBRATION_COMPLETION_REDIRECT_DELAY_MS = 1200
export const CALIBRATION_SAFE_MARGIN_X_PERCENT = 2
export const CALIBRATION_SAFE_MARGIN_Y_PERCENT = 2

export const DEFAULT_CALIBRATION_POINTS: CalibrationPoint[] = [
  { id: 'p01', label: '1', xPercent: 2, yPercent: 2 },
  { id: 'p02', label: '2', xPercent: 21, yPercent: 2 },
  { id: 'p03', label: '3', xPercent: 40, yPercent: 2 },
  { id: 'p04', label: '4', xPercent: 60, yPercent: 2 },
  { id: 'p05', label: '5', xPercent: 79, yPercent: 2 },
  { id: 'p06', label: '6', xPercent: 98, yPercent: 2 },
  { id: 'p07', label: '7', xPercent: 2, yPercent: 98 },
  { id: 'p08', label: '8', xPercent: 21, yPercent: 98 },
  { id: 'p09', label: '9', xPercent: 40, yPercent: 98 },
  { id: 'p10', label: '10', xPercent: 60, yPercent: 98 },
  { id: 'p11', label: '11', xPercent: 79, yPercent: 98 },
  { id: 'p12', label: '12', xPercent: 98, yPercent: 98 },
]

export const DEFAULT_CALIBRATION_TARGETS = DEFAULT_CALIBRATION_POINTS.map(point => ({
  rx: point.xPercent / 100,
  ry: point.yPercent / 100,
}))

export const DEFAULT_CALIBRATION_READINESS_STEPS: CalibrationReadinessStep[] = [
  { status: 'face-not-detected', durationMs: 1200 },
  { status: 'tracking-unstable', durationMs: 1000 },
  { status: 'ready', durationMs: 0 },
]
