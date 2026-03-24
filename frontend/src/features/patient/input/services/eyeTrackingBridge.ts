import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import { EYE_TRACKING_BRIDGE_SOURCE, type EyeTrackingBridgeMessage } from '../types/eyeTrackingBridge'

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

export function buildEyeTrackingRuntimeUrl(args: {
  eyeTrackingUiUrl: string
  eyeTrackingProfileId: string
  requestId: string
}) {
  const baseUrl = normalizeBaseUrl(args.eyeTrackingUiUrl)

  if (!baseUrl) {
    return ''
  }

  const runtimeUrl = new URL(
    './runtime_embed.html',
    typeof window === 'undefined' ? baseUrl : new URL(baseUrl, window.location.origin),
  )

  runtimeUrl.searchParams.set('embed', '1')
  runtimeUrl.searchParams.set('autostart', '1')
  runtimeUrl.searchParams.set('profileId', args.eyeTrackingProfileId)
  runtimeUrl.searchParams.set('userId', args.eyeTrackingProfileId)
  runtimeUrl.searchParams.set('requestId', args.requestId)

  return runtimeUrl.toString()
}

export function isEyeTrackingBridgeMessage(
  value: unknown,
  requestId: string,
): value is EyeTrackingBridgeMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.source === EYE_TRACKING_BRIDGE_SOURCE &&
    candidate.requestId === requestId &&
    typeof candidate.type === 'string' &&
    candidate.payload !== undefined
  )
}

export function clampTrackingStatus(
  status: CalibrationTrackingStatus | null | undefined,
): CalibrationTrackingStatus {
  return status === 'ready' || status === 'tracking-unstable' || status === 'face-not-detected'
    ? status
    : 'idle'
}
