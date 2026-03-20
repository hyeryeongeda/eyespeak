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
  userId?: string
}

const EYE_TRACKING_MESSAGE_SOURCE = 'eyespeak-eye-tracking'

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

    if (user?.id) {
      query.set('userId', user.id)
    }

    return `${baseUrl}/?${query.toString()}`
  }, [user?.id])

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

  useEffect(() => {
    if (!isEyeTrackingApiEnabled()) {
      setPageState('error')
      setErrorMessage(
        'Eye tracking is disabled. Set VITE_EYE_TRACKING_API_MODE=real and restart the frontend dev server.',
      )
      return
    }

    if (!iframeUrl || !allowedOrigin) {
      setPageState('error')
      setErrorMessage(
        'Eye tracking calibration UI URL is missing. Check VITE_EYE_TRACKING_UI_URL.',
      )
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
  }, [allowedOrigin, iframeUrl, navigate, user])

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>Patient Calibration</p>
          <h1 style={titleStyle}>AI calibration screen</h1>
          <p style={descriptionStyle}>
            The AI team calibration UI is embedded below. Keep your face centered and follow the
            on-screen target.
          </p>
          <p style={statusStyle}>
            {pageState === 'saving'
              ? 'Saving calibration...'
              : pageState === 'error'
                ? errorMessage
                : 'The page will continue automatically after calibration completes.'}
          </p>
        </div>

        {iframeUrl ? (
          <iframe
            key={iframeUrl}
            src={iframeUrl}
            title="Eye tracking calibration"
            style={iframeStyle}
            allow="camera; fullscreen"
          />
        ) : (
          <div style={fallbackStyle}>Calibration UI URL is not configured.</div>
        )}
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  width: '100%',
  minHeight: '100dvh',
  padding: '20px',
  boxSizing: 'border-box',
  background:
    'radial-gradient(circle at top left, rgba(39, 62, 96, 0.92) 0%, rgba(14, 22, 34, 1) 48%, rgba(8, 12, 21, 1) 100%)',
}

const panelStyle: CSSProperties = {
  width: '100%',
  minHeight: 'calc(100dvh - 40px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  color: '#ffffff',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(173, 197, 230, 0.92)',
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  fontWeight: 900,
  letterSpacing: '-0.05em',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '820px',
  fontSize: '15px',
  lineHeight: 1.6,
  color: 'rgba(229, 238, 251, 0.88)',
}

const statusStyle: CSSProperties = {
  margin: 0,
  minHeight: '24px',
  fontSize: '14px',
  fontWeight: 700,
  color: '#ffda85',
}

const iframeStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  minHeight: '720px',
  border: '1px solid rgba(178, 197, 226, 0.22)',
  borderRadius: '24px',
  overflow: 'hidden',
  backgroundColor: '#020617',
}

const fallbackStyle: CSSProperties = {
  flex: 1,
  minHeight: '420px',
  borderRadius: '24px',
  border: '1px solid rgba(178, 197, 226, 0.22)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  backgroundColor: 'rgba(8, 12, 21, 0.72)',
}
