export type EyeTrackingTrigger = 'none' | 'select' | 'start' | 'stop' | 'sos'

export interface EyeTrackingFrameResponseDto {
  cell: number | null
  rx: number | null
  ry: number | null
  raw_rx: number | null
  raw_ry: number | null
  ear: number
  face: boolean
  blink: boolean
  trigger: EyeTrackingTrigger | string
  screen_x: number
  screen_y: number
}

export interface EyeTrackingFrame {
  cell: number | null
  ratioX: number | null
  ratioY: number | null
  rawRatioX: number | null
  rawRatioY: number | null
  eyeAspectRatio: number
  faceDetected: boolean
  blinkDetected: boolean
  trigger: EyeTrackingTrigger
  screenX: number
  screenY: number
}

export interface EyeTrackingHealthResponseDto {
  status?: string
  calibrated?: boolean
}

export interface EyeTrackingHealthStatus {
  status: string
  calibrated: boolean
}

export interface EyeTrackingCalibrationSample {
  rx: number
  ry: number
}

export interface EyeTrackingCalibrationResponseDto {
  ok?: boolean
  error?: string
}

export interface EyeTrackingCalibrationLoadResponseDto
  extends EyeTrackingCalibrationResponseDto {
  calibrated?: boolean
}
