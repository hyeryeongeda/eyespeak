import { useEffect, useMemo, useRef } from 'react'
import { getEyeTrackingUiUrl } from '../../../../services/eyeTrackingServiceConfig'
import { emitPatientDoubleBlink, emitPatientTrackingStatus } from '../services/patientModeBridge'
import {
  buildEyeTrackingRuntimeUrl,
  clampTrackingStatus,
  isEyeTrackingBridgeMessage,
} from '../services/eyeTrackingBridge'
import { useGazeInputStore } from '../stores/gazeInputStore'

interface EyeTrackingRuntimeHostProps {
  enabled?: boolean
  eyeTrackingProfileId: string | null
}

function clampToViewport(value: number, size: number) {
  if (!Number.isFinite(value) || size <= 0) {
    return 0
  }

  return Math.min(Math.max(0, value), 1) * size
}

export default function EyeTrackingRuntimeHost({
  enabled = true,
  eyeTrackingProfileId,
}: EyeTrackingRuntimeHostProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const requestIdRef = useRef(`eye-tracking-runtime-${Date.now()}`)
  const lastDoubleBlinkAtRef = useRef(0)
  const eyeTrackingUiUrl = getEyeTrackingUiUrl()

  const runtimeUrl = useMemo(() => {
    if (!enabled || !eyeTrackingProfileId) {
      return ''
    }

    return buildEyeTrackingRuntimeUrl({
      eyeTrackingUiUrl,
      eyeTrackingProfileId,
      requestId: requestIdRef.current,
    })
  }, [enabled, eyeTrackingProfileId, eyeTrackingUiUrl])

  useEffect(() => {
    if (!enabled || !eyeTrackingProfileId || !runtimeUrl) {
      useGazeInputStore.getState().clearPoint()
      emitPatientTrackingStatus('idle')
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isEyeTrackingBridgeMessage(event.data, requestIdRef.current)) {
        return
      }

      switch (event.data.type) {
        case 'RUNTIME_READY':
          emitPatientTrackingStatus('face-not-detected')
          break
        case 'RUNTIME_STATUS': {
          const status = clampTrackingStatus(event.data.payload.status)
          if (status !== 'ready') {
            useGazeInputStore.getState().clearPoint()
          }
          emitPatientTrackingStatus(status)
          break
        }
        case 'GAZE_POINT_UPDATE':
          useGazeInputStore.getState().setSnapshot({
            clientX: clampToViewport(event.data.payload.screenX, window.innerWidth),
            clientY: clampToViewport(event.data.payload.screenY, window.innerHeight),
            cell: event.data.payload.cell,
          })
          emitPatientTrackingStatus(clampTrackingStatus(event.data.payload.status))
          break
        case 'RUNTIME_DOUBLE_BLINK': {
          const now = Date.now()
          if (now - lastDoubleBlinkAtRef.current >= 1000) {
            lastDoubleBlinkAtRef.current = now
            emitPatientDoubleBlink()
          }
          break
        }
        case 'RUNTIME_ERROR':
          useGazeInputStore.getState().clearPoint()
          emitPatientTrackingStatus(clampTrackingStatus(event.data.payload.status))
          break
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      useGazeInputStore.getState().clearPoint()
      emitPatientTrackingStatus('idle')
    }
  }, [enabled, eyeTrackingProfileId, runtimeUrl])

  useEffect(() => {
    return () => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          source: 'eyespeak-parent',
          type: 'RUNTIME_STOP',
          requestId: requestIdRef.current,
        },
        '*',
      )
    }
  }, [])

  if (!enabled || !eyeTrackingProfileId || !runtimeUrl) {
    return null
  }

  return (
    <iframe
      ref={iframeRef}
      src={runtimeUrl}
      title="Eye Tracking Runtime Host"
      allow="camera"
      aria-hidden="true"
      tabIndex={-1}
      style={iframeStyle}
    />
  )
}

const iframeStyle = {
  position: 'fixed',
  width: '1px',
  height: '1px',
  opacity: 0,
  pointerEvents: 'none',
  border: 'none',
  bottom: 0,
  right: 0,
} as const
