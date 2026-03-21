import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { useAuth } from '../../../auth/hooks/useAuth'
import {
  completePatientCalibration,
  getPatientEyeTrackingProfileId,
} from '../services/calibration/patientCalibrationService'
import {
  getEyeTrackingConfigSnapshot,
  getEyeTrackingUiUrl,
} from '../../../../services/eyeTrackingServiceConfig'
import { useGazeInputStore } from '../stores/gazeInputStore'

type CalibrationPageState = 'loading' | 'saving' | 'ready' | 'error'

interface EyeTrackingCalibrationMessage {
  source?: string
  type?: 'calibration-ready' | 'calibration-complete' | 'calibration-error'
  message?: string
  userId?: string | number
}

const EYE_TRACKING_MESSAGE_SOURCE = 'eyespeak-eye-tracking'

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function normalizeMessageUserId(value: string | number | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

export default function PatientCalibrationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pageState, setPageState] = useState<CalibrationPageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const eyeTrackingProfileId = useMemo(() => getPatientEyeTrackingProfileId(user), [user])
  const eyeTrackingConfig = useMemo(() => getEyeTrackingConfigSnapshot(), [])

  const iframeUrl = useMemo(() => {
    const baseUrl = getEyeTrackingUiUrl().trim().replace(/\/+$/, '')

    if (!baseUrl) {
      return ''
    }

    const query = new URLSearchParams({
      embed: '1',
      autostart: '1',
    })

    if (eyeTrackingProfileId) {
      query.set('userId', eyeTrackingProfileId)
      query.set('profileId', eyeTrackingProfileId)
    }

    return `${baseUrl}/?${query.toString()}`
  }, [eyeTrackingProfileId])

  const allowedOrigin = useMemo(() => {
    if (!iframeUrl || typeof window === 'undefined') {
      return null
    }

    try {
      return new URL(iframeUrl, window.location.origin).origin
    } catch {
      return null
    }
  }, [iframeUrl])

  const isLocalEyeTrackingUiOnRemoteHost = useMemo(() => {
    if (!iframeUrl || typeof window === 'undefined') {
      return false
    }

    try {
      const iframeHostname = new URL(iframeUrl, window.location.origin).hostname
      const appHostname = window.location.hostname

      return !isLoopbackHost(appHostname) && isLoopbackHost(iframeHostname)
    } catch {
      return false
    }
  }, [iframeUrl])

  const blockingErrorMessage = useMemo(() => {
    if (eyeTrackingConfig.resolvedApiMode !== 'real') {
      return `Eye tracking is not running in real mode for this frontend bundle (resolved mode: ${eyeTrackingConfig.resolvedApiMode}). If your env file already says real, restart the frontend build/dev server and verify the active bundle is not stale.`
    }

    if (!eyeTrackingProfileId) {
      return 'Eye tracking profile id is missing for this patient session, so calibration and runtime tracking cannot be aligned.'
    }

    if (isLocalEyeTrackingUiOnRemoteHost) {
      return 'Eye tracking UI is configured as localhost, so it cannot open from this remote host. Set VITE_EYE_TRACKING_UI_URL to a reachable domain or reverse-proxied path.'
    }

    if (!iframeUrl || !allowedOrigin) {
      return 'Eye tracking calibration UI URL is missing. Check VITE_EYE_TRACKING_UI_URL.'
    }

    return ''
  }, [allowedOrigin, eyeTrackingConfig.resolvedApiMode, eyeTrackingProfileId, iframeUrl, isLocalEyeTrackingUiOnRemoteHost])

  const debugItems = useMemo(
    () => {
      const items: Array<[string, string]> = [
        ['Resolved mode', eyeTrackingConfig.resolvedApiMode],
        ['Eye tracking UI URL', eyeTrackingConfig.uiUrl || '(unset)'],
        ['Eye tracking profile id', eyeTrackingProfileId || '(missing)'],
        ['Iframe origin', allowedOrigin || '(invalid)'],
        ['App origin', typeof window === 'undefined' ? '(unknown)' : window.location.origin],
      ]

      if (eyeTrackingConfig.diagnosticsEnabled) {
        items.splice(
          1,
          0,
          ['Raw mode', eyeTrackingConfig.rawApiMode || '(unset)'],
          ['Normalized mode', eyeTrackingConfig.normalizedApiMode || '(unset)'],
          ['Eye tracking API base URL', eyeTrackingConfig.apiBaseUrl || '(unset)'],
        )
      }

      return items
    },
    [allowedOrigin, eyeTrackingConfig, eyeTrackingProfileId],
  )

  const overlayMessage =
    blockingErrorMessage
      ? blockingErrorMessage
      : pageState === 'saving'
      ? 'Calibration completed. Verifying runtime readiness...'
      : pageState === 'loading'
        ? 'Preparing the camera and calibration screen...'
        : pageState === 'error'
          ? errorMessage
          : ''

  useEffect(() => {
    if (!blockingErrorMessage || !import.meta.env.DEV) {
      return
    }

    console.warn('[eye-tracking] calibration page blocked', {
      reason: blockingErrorMessage,
      config: eyeTrackingConfig,
      eyeTrackingProfileId,
      iframeUrl,
      allowedOrigin,
    })
  }, [allowedOrigin, blockingErrorMessage, eyeTrackingConfig, eyeTrackingProfileId, iframeUrl])

  useEffect(() => {
    if (blockingErrorMessage) {
      return
    }

    let isMounted = true
    let isSaving = false

    const persistCalibration = async () => {
      if (!isMounted || isSaving) {
        return
      }

      isSaving = true
      setPageState('saving')
      setErrorMessage('')

      const result = await completePatientCalibration(user)

      if (!isMounted) {
        return
      }

      if (!result.success) {
        isSaving = false
        setPageState('error')
        setErrorMessage(result.message)
        return
      }

      useGazeInputStore.getState().clearPoint()
      navigate(ROUTE_PATHS.PATIENT_MAIN, { replace: true })
    }

    const handleMessage = (event: MessageEvent<EyeTrackingCalibrationMessage>) => {
      if (event.origin !== allowedOrigin) {
        return
      }

      const payload = event.data

      if (!payload || payload.source !== EYE_TRACKING_MESSAGE_SOURCE) {
        return
      }

      const messageUserId = normalizeMessageUserId(payload.userId)

      if (!eyeTrackingProfileId || messageUserId !== eyeTrackingProfileId) {
        if (import.meta.env.DEV) {
          console.warn('[eye-tracking] ignored calibration message with mismatched user id', {
            expectedEyeTrackingProfileId: eyeTrackingProfileId,
            receivedUserId: messageUserId,
            type: payload.type,
          })
        }

        return
      }

      if (payload.type === 'calibration-ready') {
        setPageState(currentState => (currentState === 'loading' ? 'ready' : currentState))
        setErrorMessage('')
        return
      }

      if (payload.type === 'calibration-error') {
        setPageState('error')
        setErrorMessage(payload.message || 'Calibration failed.')
        return
      }

      if (payload.type === 'calibration-complete') {
        void persistCalibration()
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      isMounted = false
      window.removeEventListener('message', handleMessage)
    }
  }, [allowedOrigin, blockingErrorMessage, eyeTrackingProfileId, navigate, user])

  return (
    <main style={pageStyle}>
      {blockingErrorMessage ? (
        <section style={errorPanelStyle}>
          <p style={errorEyebrowStyle}>Patient Calibration</p>
          <h1 style={errorTitleStyle}>Calibration screen unavailable</h1>
          <p style={errorDescriptionStyle}>{blockingErrorMessage}</p>
          <dl style={debugListStyle}>
            {debugItems.map(([label, value]) => (
              <div key={label} style={debugRowStyle}>
                <dt style={debugLabelStyle}>{label}</dt>
                <dd style={debugValueStyle}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <>
          <iframe
            key={iframeUrl}
            src={iframeUrl}
            title="Eye tracking calibration"
            style={iframeStyle}
            allow="camera; fullscreen"
          />

          <div style={overlayLayerStyle}>
            <div style={labelBadgeStyle}>Patient Calibration</div>

            {overlayMessage ? (
              <div
                style={{
                  ...statusCardStyle,
                  ...((blockingErrorMessage || pageState === 'error') ? statusCardErrorStyle : null),
                }}
              >
                {overlayMessage}
              </div>
            ) : null}
          </div>
        </>
      )}
    </main>
  )
}

const pageStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100dvh',
  backgroundColor: '#02040a',
  overflow: 'hidden',
  zIndex: 20,
}

const iframeStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
  backgroundColor: '#020617',
}

const overlayLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '20px',
  boxSizing: 'border-box',
}

const labelBadgeStyle: CSSProperties = {
  alignSelf: 'flex-start',
  padding: '10px 14px',
  borderRadius: '999px',
  backgroundColor: 'rgba(2, 6, 23, 0.54)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  color: 'rgba(226, 232, 240, 0.9)',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  backdropFilter: 'blur(14px)',
}

const statusCardStyle: CSSProperties = {
  alignSelf: 'center',
  marginBottom: '24px',
  maxWidth: 'min(720px, calc(100vw - 40px))',
  padding: '16px 22px',
  borderRadius: '20px',
  backgroundColor: 'rgba(2, 6, 23, 0.66)',
  border: '1px solid rgba(125, 211, 252, 0.24)',
  boxShadow: '0 18px 36px rgba(2, 6, 23, 0.32)',
  color: '#f8fafc',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
  textAlign: 'center',
  backdropFilter: 'blur(16px)',
}

const statusCardErrorStyle: CSSProperties = {
  border: '1px solid rgba(251, 146, 60, 0.38)',
  color: '#ffe7cf',
}

const errorPanelStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '14px',
  padding: 'clamp(24px, 6vw, 56px)',
  boxSizing: 'border-box',
  background:
    'radial-gradient(circle at top left, rgba(30, 41, 59, 0.96) 0%, rgba(10, 15, 26, 1) 48%, rgba(2, 6, 23, 1) 100%)',
  color: '#f8fafc',
}

const errorEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(173, 197, 230, 0.92)',
}

const errorTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2rem, 4vw, 3.25rem)',
  fontWeight: 900,
  letterSpacing: '-0.05em',
}

const errorDescriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '840px',
  fontSize: '16px',
  lineHeight: 1.7,
  color: 'rgba(226, 232, 240, 0.92)',
}

const debugListStyle: CSSProperties = {
  margin: '10px 0 0',
  width: 'min(840px, 100%)',
  padding: '18px 20px',
  borderRadius: '18px',
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxSizing: 'border-box',
}

const debugRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '220px minmax(0, 1fr)',
  gap: '12px',
  alignItems: 'start',
  padding: '6px 0',
}

const debugLabelStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(148, 163, 184, 0.9)',
  fontSize: '13px',
  fontWeight: 800,
}

const debugValueStyle: CSSProperties = {
  margin: 0,
  color: '#f8fafc',
  fontSize: '13px',
  fontWeight: 600,
  lineHeight: 1.6,
  wordBreak: 'break-all',
}
