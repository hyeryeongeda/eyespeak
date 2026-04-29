import type { CalibrationPoint, CalibrationReadinessStep } from '../../types/calibration'

export const PATIENT_CALIBRATION_STORAGE_KEY = 'patientCalibrationStatus'
export const CALIBRATION_START_COUNTDOWN_SECONDS = 3
export const CALIBRATION_POINT_CAPTURE_DELAY_MS = 1500
export const CALIBRATION_COMPLETION_REDIRECT_DELAY_MS = 1200
export const CALIBRATION_SAFE_MARGIN_X_PERCENT = 5
export const CALIBRATION_SAFE_MARGIN_Y_PERCENT = 5

function distributeAxisPositions(count: number, startPercent: number, endPercent: number) {
  if (count <= 1) {
    return [(startPercent + endPercent) / 2]
  }

  const distance = endPercent - startPercent

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1)
    return Number((startPercent + distance * progress).toFixed(2))
  })
}

function buildCalibrationGridPoints({
  columns,
  rows,
  safeMarginXPercent,
  safeMarginYPercent,
}: {
  columns: number
  rows: number
  safeMarginXPercent: number
  safeMarginYPercent: number
}): CalibrationPoint[] {
  const xPositions = distributeAxisPositions(columns, safeMarginXPercent, 100 - safeMarginXPercent)
  const yPositions = distributeAxisPositions(rows, safeMarginYPercent, 100 - safeMarginYPercent)

  return yPositions.flatMap((yPercent, rowIndex) =>
    xPositions.map((xPercent, columnIndex) => {
      const pointIndex = rowIndex * columns + columnIndex + 1

      return {
        id: `p${String(pointIndex).padStart(2, '0')}`,
        label: String(pointIndex),
        xPercent,
        yPercent,
      }
    }),
  )
}

export const DEFAULT_CALIBRATION_POINTS = buildCalibrationGridPoints({
  columns: 6,
  rows: 2,
  safeMarginXPercent: CALIBRATION_SAFE_MARGIN_X_PERCENT,
  safeMarginYPercent: CALIBRATION_SAFE_MARGIN_Y_PERCENT,
})

export const DEFAULT_CALIBRATION_TARGETS = DEFAULT_CALIBRATION_POINTS.map(point => ({
  rx: point.xPercent / 100,
  ry: point.yPercent / 100,
}))

export const DEFAULT_CALIBRATION_READINESS_STEPS: CalibrationReadinessStep[] = [
  { status: 'face-not-detected', durationMs: 1200 },
  { status: 'tracking-unstable', durationMs: 1000 },
  { status: 'ready', durationMs: 0 },
]
