export type EyeTrackingTrigger = 'none' | 'select' | 'start' | 'stop' | 'sos'

export interface EyeTrackingCalibrationResponseDto {
  ok?: boolean
  error?: string
}

export interface EyeTrackingCalibrationLoadResponseDto
  extends EyeTrackingCalibrationResponseDto {
  calibrated?: boolean
}

export interface EyeTrackingSelectionResponseDto {
  status?: string
  error?: string
}
