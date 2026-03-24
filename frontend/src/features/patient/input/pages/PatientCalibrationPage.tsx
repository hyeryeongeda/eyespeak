import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { resolveAppPath, ROUTE_PATHS } from '../../../../app/router/routePaths'
import {
  getEyeTrackingConfigSnapshot,
  getEyeTrackingUiUrl,
  isEyeTrackingApiEnabled,
} from '../../../../services/eyeTrackingServiceConfig'
import type { PatientCalibrationLocationState } from '../../../../types/calibration'
import { useAuth } from '../../../auth/hooks/useAuth'
import { useGazeInputStore } from '../stores/gazeInputStore'
import {
  completePatientCalibration,
  getPatientEyeTrackingProfileId,
  getPatientPostAuthNotice,
} from '../services/calibration/patientCalibrationService'

type CalibrationCallbackStatus = 'success' | 'error' | 'cancelled'
type CalibrationPagePhase = 'preparing' | 'returning' | 'error'

function normalizeTextValue(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function getCalibrationCallbackStatus(value: string | null): CalibrationCallbackStatus | null {
  return value === 'success' || value === 'error' || value === 'cancelled' ? value : null
}

function buildAbsoluteAppUrl(path: string) {
  if (typeof window === 'undefined') {
    return path
  }

  return new URL(resolveAppPath(path), window.location.origin).toString()
}

function buildEyeTrackingEntryUrl(args: {
  eyeTrackingUiUrl: string
  eyeTrackingProfileId: string
  redirectPath: string
  authSuccessMessage: string
  calibrationMessage: string
  requestId: string
  mode: string
}) {
  const {
    eyeTrackingUiUrl,
    eyeTrackingProfileId,
    redirectPath,
    authSuccessMessage,
    calibrationMessage,
    requestId,
    mode,
  } = args

  const calibrationUrl = new URL(eyeTrackingUiUrl, typeof window === 'undefined' ? undefined : window.location.origin)
  const returnUrl = new URL(buildAbsoluteAppUrl(ROUTE_PATHS.PATIENT_CALIBRATION))

  returnUrl.searchParams.set('redirectPath', redirectPath)
  returnUrl.searchParams.set('requestId', requestId)

  if (authSuccessMessage) {
    returnUrl.searchParams.set('authSuccessMessage', authSuccessMessage)
  }

  if (calibrationMessage) {
    returnUrl.searchParams.set('calibrationMessage', calibrationMessage)
  }

  calibrationUrl.searchParams.set('userId', eyeTrackingProfileId)
  calibrationUrl.searchParams.set('profileId', eyeTrackingProfileId)
  calibrationUrl.searchParams.set('mode', mode)
  calibrationUrl.searchParams.set('requestId', requestId)
  calibrationUrl.searchParams.set('autostart', '1')
  calibrationUrl.searchParams.set('returnUrl', returnUrl.toString())

  return calibrationUrl.toString()
}

export default function PatientCalibrationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, patientPostAuth, clearPatientPostAuth } = useAuth()
  const handledCallbackRef = useRef(false)
  const [pagePhase, setPagePhase] = useState<CalibrationPagePhase>('preparing')
  const [errorMessage, setErrorMessage] = useState('')
  const routeState = (location.state as PatientCalibrationLocationState | null) ?? null
  const queryRedirectPath =
    normalizeTextValue(searchParams.get('redirectPath')) || ROUTE_PATHS.PATIENT_MAIN
  const postAuthNotice = routeState?.postAuthNotice ?? getPatientPostAuthNotice(patientPostAuth)
  const authSuccessMessage =
    normalizeTextValue(searchParams.get('authSuccessMessage')) ||
    postAuthNotice?.authSuccessMessage ||
    ''
  const calibrationMessage =
    normalizeTextValue(searchParams.get('calibrationMessage')) ||
    postAuthNotice?.calibrationMessage ||
    ''
  const redirectPath =
    routeState?.redirectPath ??
    patientPostAuth?.redirectPath ??
    queryRedirectPath
  const callbackStatus = getCalibrationCallbackStatus(searchParams.get('calibrationStatus'))
  const callbackMessage = normalizeTextValue(searchParams.get('message'))
  const requestId =
    normalizeTextValue(searchParams.get('requestId')) ||
    `patient-calibration-${Date.now()}`
  const eyeTrackingProfileId = useMemo(() => getPatientEyeTrackingProfileId(user), [user])
  const eyeTrackingConfig = useMemo(() => getEyeTrackingConfigSnapshot(), [])
  const eyeTrackingUiUrl = useMemo(() => normalizeTextValue(getEyeTrackingUiUrl()), [])
  const entryUrl = useMemo(() => {
    if (!eyeTrackingUiUrl || !eyeTrackingProfileId) {
      return ''
    }

    return buildEyeTrackingEntryUrl({
      eyeTrackingUiUrl,
      eyeTrackingProfileId,
      redirectPath,
      authSuccessMessage,
      calibrationMessage,
      requestId,
      mode: user?.authMode === 'mock' ? 'mock' : 'real',
    })
  }, [
    authSuccessMessage,
    calibrationMessage,
    eyeTrackingProfileId,
    eyeTrackingUiUrl,
    redirectPath,
    requestId,
    user?.authMode,
  ])

  const blockingErrorMessage = useMemo(() => {
    if (!isEyeTrackingApiEnabled()) {
      return `Eye tracking is disabled for this frontend bundle (resolved mode: ${eyeTrackingConfig.resolvedApiMode}).`
    }

    if (!eyeTrackingProfileId) {
      return 'Eye tracking profile id is missing for this patient session.'
    }

    if (!eyeTrackingUiUrl) {
      return 'Eye tracking calibration UI URL is missing. Check VITE_EYE_TRACKING_UI_URL.'
    }

    if (!entryUrl) {
      return 'Eye tracking calibration entry URL could not be created.'
    }

    return ''
  }, [entryUrl, eyeTrackingConfig.resolvedApiMode, eyeTrackingProfileId, eyeTrackingUiUrl])

  useEffect(() => {
    if (!callbackStatus || handledCallbackRef.current) {
      return
    }

    handledCallbackRef.current = true

    if (callbackStatus !== 'success') {
      setPagePhase('error')
      setErrorMessage(
        callbackMessage ||
          (callbackStatus === 'cancelled'
            ? 'Calibration was cancelled before completion.'
            : 'Calibration failed in the eye-tracking service.'),
      )
      return
    }

    let isMounted = true

    const finalizeCalibration = async () => {
      setPagePhase('returning')
      const result = await completePatientCalibration(user)

      if (!isMounted) {
        return
      }

      if (!result.success) {
        setPagePhase('error')
        setErrorMessage(result.message)
        return
      }

      clearPatientPostAuth()
      useGazeInputStore.getState().clearPoint()
      navigate(redirectPath, { replace: true })
    }

    void finalizeCalibration()

    return () => {
      isMounted = false
    }
  }, [callbackMessage, callbackStatus, clearPatientPostAuth, navigate, redirectPath, user])

  useEffect(() => {
    if (callbackStatus || blockingErrorMessage) {
      if (blockingErrorMessage) {
        setPagePhase('error')
        setErrorMessage(blockingErrorMessage)
      }
      return
    }

    setPagePhase('preparing')
    const redirectTimer = window.setTimeout(() => {
      window.location.replace(entryUrl)
    }, 60)

    return () => {
      window.clearTimeout(redirectTimer)
    }
  }, [blockingErrorMessage, callbackStatus, entryUrl])

  const handleRetry = () => {
    if (!entryUrl) {
      return
    }

    window.location.replace(entryUrl)
  }

  const description =
    pagePhase === 'returning'
      ? 'Calibration completed. Verifying the remote eye-tracking runtime before returning to the patient flow.'
      : pagePhase === 'error'
        ? errorMessage
        : 'Opening the remote eye-tracking calibration screen.'

  const title =
    pagePhase === 'returning'
      ? 'Finishing calibration'
      : pagePhase === 'error'
        ? 'Calibration unavailable'
        : 'Redirecting to calibration'

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <p style={eyebrowStyle}>Patient Calibration</p>
        <h1 style={titleStyle}>{title}</h1>
        {(authSuccessMessage || calibrationMessage) && pagePhase !== 'returning' ? (
          <div style={noticeStyle}>
            {authSuccessMessage ? <p style={noticeTitleStyle}>{authSuccessMessage}</p> : null}
            {calibrationMessage ? <p style={noticeBodyStyle}>{calibrationMessage}</p> : null}
          </div>
        ) : null}
        <p style={bodyStyle}>{description}</p>
        {pagePhase === 'error' ? (
          <button type="button" style={buttonStyle} onClick={handleRetry}>
            Retry calibration
          </button>
        ) : null}
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background:
    'radial-gradient(circle at top left, rgba(30, 41, 59, 0.96) 0%, rgba(10, 15, 26, 1) 48%, rgba(2, 6, 23, 1) 100%)',
  boxSizing: 'border-box',
}

const panelStyle: CSSProperties = {
  width: 'min(720px, 100%)',
  padding: '28px',
  borderRadius: '28px',
  backgroundColor: 'rgba(2, 6, 23, 0.78)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  color: '#f8fafc',
  boxShadow: '0 28px 56px rgba(2, 6, 23, 0.3)',
  backdropFilter: 'blur(16px)',
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
  margin: '10px 0 0',
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  fontWeight: 900,
  letterSpacing: '-0.05em',
}

const bodyStyle: CSSProperties = {
  margin: '16px 0 0',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: 1.6,
  color: 'rgba(226, 232, 240, 0.92)',
}

const noticeStyle: CSSProperties = {
  marginTop: '16px',
  padding: '16px 18px',
  borderRadius: '20px',
  backgroundColor: 'rgba(8, 47, 73, 0.74)',
  border: '1px solid rgba(125, 211, 252, 0.3)',
}

const noticeTitleStyle: CSSProperties = {
  margin: 0,
  color: '#e0f2fe',
  fontSize: '15px',
  fontWeight: 800,
}

const noticeBodyStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'rgba(226, 232, 240, 0.92)',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.6,
}

const buttonStyle: CSSProperties = {
  marginTop: '18px',
  border: 'none',
  borderRadius: '999px',
  padding: '12px 20px',
  backgroundColor: '#f8fafc',
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
}
