import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { completePatientCalibration } from '../../../services/calibration/patientCalibrationService'
import {
  getEyeTrackingUiUrl,
  isEyeTrackingApiEnabled,
} from '../../../services/eyeTrackingServiceConfig'

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

export default function PatientCalibrationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pageState, setPageState] = useState<CalibrationPageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const iframeUrl = useMemo(() => {
    const baseUrl = getEyeTrackingUiUrl().trim().replace(/\/+$/, '')

    if (!baseUrl) {
      return ''
    }

    const query = new URLSearchParams({
      embed: '1',
      autostart: '1',
    })

    if (user?.userId != null) {
      query.set('userId', String(user.userId))
    }

    return `${baseUrl}/?${query.toString()}`
  }, [user?.userId])

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
    if (!isEyeTrackingApiEnabled()) {
      return 'Eye tracking is disabled. Set VITE_EYE_TRACKING_API_MODE=real and restart the frontend dev server.'
    }

    if (isLocalEyeTrackingUiOnRemoteHost) {
      return 'Eye tracking UI is configured as localhost, so it cannot open from this remote host. Set VITE_EYE_TRACKING_UI_URL to a reachable domain or reverse-proxied path.'
    }

    if (!iframeUrl || !allowedOrigin) {
      return 'Eye tracking calibration UI URL is missing. Check VITE_EYE_TRACKING_UI_URL.'
    }

    return ''
  }, [allowedOrigin, iframeUrl, isLocalEyeTrackingUiOnRemoteHost])

  const overlayMessage =
    pageState === 'saving'
      ? 'Calibration completed. Saving your session...'
      : pageState === 'loading'
        ? 'Preparing the camera and calibration screen...'
        : pageState === 'error'
          ? errorMessage
          : ''

  useEffect(() => {
    if (blockingErrorMessage) {
      setPageState('error')
      setErrorMessage(blockingErrorMessage)
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
  }, [allowedOrigin, blockingErrorMessage, navigate, user])

  return (
    <main style={pageStyle}>
      {blockingErrorMessage ? (
        <section style={errorPanelStyle}>
          <p style={errorEyebrowStyle}>Patient Calibration</p>
          <h1 style={errorTitleStyle}>Calibration screen unavailable</h1>
          <p style={errorDescriptionStyle}>{blockingErrorMessage}</p>
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
                  ...(pageState === 'error' ? statusCardErrorStyle : null),
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
