import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import type { EyeTrackingTrigger } from '../../../../types/eyeTracking'

export const EYE_TRACKING_BRIDGE_SOURCE = 'eyespeak-eye-tracking'

export type EyeTrackingBridgeMessageType =
  | 'RUNTIME_READY'
  | 'RUNTIME_STATUS'
  | 'GAZE_POINT_UPDATE'
  | 'RUNTIME_DOUBLE_BLINK'
  | 'RUNTIME_ERROR'

interface EyeTrackingBridgeEnvelopeBase<TType extends EyeTrackingBridgeMessageType, TPayload> {
  source: typeof EYE_TRACKING_BRIDGE_SOURCE
  type: TType
  requestId: string
  profileId?: string
  payload: TPayload
}

export type RuntimeReadyMessage = EyeTrackingBridgeEnvelopeBase<
  'RUNTIME_READY',
  {
    autostart: boolean
  }
>

export type RuntimeStatusMessage = EyeTrackingBridgeEnvelopeBase<
  'RUNTIME_STATUS',
  {
    status: CalibrationTrackingStatus
  }
>

export type GazePointUpdateMessage = EyeTrackingBridgeEnvelopeBase<
  'GAZE_POINT_UPDATE',
  {
    screenX: number
    screenY: number
    cell: number | null
    status: CalibrationTrackingStatus
    trigger: EyeTrackingTrigger
  }
>

export type RuntimeDoubleBlinkMessage = EyeTrackingBridgeEnvelopeBase<
  'RUNTIME_DOUBLE_BLINK',
  {
    trigger: 'start'
  }
>

export type RuntimeErrorMessage = EyeTrackingBridgeEnvelopeBase<
  'RUNTIME_ERROR',
  {
    message: string
    status?: CalibrationTrackingStatus
  }
>

export type EyeTrackingBridgeMessage =
  | RuntimeReadyMessage
  | RuntimeStatusMessage
  | GazePointUpdateMessage
  | RuntimeDoubleBlinkMessage
  | RuntimeErrorMessage
