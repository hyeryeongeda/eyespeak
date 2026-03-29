import { useEffect, useMemo, useRef } from 'react'
import { getEyeTrackingUiUrl } from '../../../../services/eyeTrackingServiceConfig'
import type { EyeTrackingTrigger } from '../../../../types/eyeTracking'
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

const EDGE_MARGIN = 0.02
const RUNTIME_TRIGGER_LOG_COOLDOWN_MS = 1000

function clampToViewport(value: number, size: number) {
  if (!Number.isFinite(value) || size <= 0) {
    return size * 0.5
  }

  const clamped = Math.min(Math.max(EDGE_MARGIN, value), 1 - EDGE_MARGIN)
  return clamped * size
}

export default function EyeTrackingRuntimeHost({
  enabled = true,
  eyeTrackingProfileId,
}: EyeTrackingRuntimeHostProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const requestIdRef = useRef(`eye-tracking-runtime-${Date.now()}`)
  const lastDoubleBlinkAtRef = useRef(0)
  const lastRuntimeTriggerLogRef = useRef<{
    trigger: EyeTrackingTrigger
    reason: string
    loggedAt: number
  } | null>(null)
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

    const logRuntimeTrigger = (
      trigger: EyeTrackingTrigger,
      reason: string,
      payload?: Record<string, unknown>,
    ) => {
      const now = Date.now()
      const previousLog = lastRuntimeTriggerLogRef.current

      if (
        previousLog &&
        previousLog.trigger === trigger &&
        previousLog.reason === reason &&
        now - previousLog.loggedAt < RUNTIME_TRIGGER_LOG_COOLDOWN_MS
      ) {
        return
      }

      lastRuntimeTriggerLogRef.current = {
        trigger,
        reason,
        loggedAt: now,
      }

      console.info('[patient-input] runtime-trigger', {
        trigger,
        reason,
        ...payload,
      })
    }

    const handlePointTrigger = (trigger: EyeTrackingTrigger) => {
      if (trigger === 'none') {
        return
      }

      if (trigger === 'start') {
        // `start` is consumed only through the dedicated double-blink bridge event.
        logRuntimeTrigger(trigger, 'ignored-on-point-update')
        return
      }

      // `select` / `stop` / `sos` stay as explicit future-contract paths until FE owns actions for them.
      logRuntimeTrigger(trigger, 'ignored-not-consumed-by-fe-this-phase')
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
          handlePointTrigger(event.data.payload.trigger)
          // Dwell timing is FE-owned in this phase; the runtime only feeds coordinates/cell/trigger.
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
            logRuntimeTrigger('start', 'consumed-via-double-blink')
            emitPatientDoubleBlink()
          }
          break
        }
        case 'RUNTIME_ERROR':
          console.error(
            '[EyeTrackingRuntimeHost] Runtime error:',
            event.data.payload.message ?? 'unknown',
          )
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
