import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import {
  getEyeTrackingConfigSnapshot,
  getEyeTrackingUiUrl,
  isBrowserEyeTrackingEnabled,
} from '../../../../services/eyeTrackingServiceConfig'
import type {
  PatientCalibrationIssueKind,
  PatientCalibrationLocationState,
} from '../../../../types/calibration'
import { useAuth } from '../../../auth/hooks/useAuth'
import { useGazeInputStore } from '../stores/gazeInputStore'
import {
  completePatientCalibration,
  getPatientEyeTrackingProfileId,
  getPatientPostAuthNotice,
} from '../services/calibration/patientCalibrationService'
import BrowserPatientCalibrationPage from './BrowserPatientCalibrationPage'

type CalibrationPageState = 'loading' | 'saving' | 'ready' | 'error'

type EyeTrackingEmbedMessageType =
  | 'EMBED_LOADED'
  | 'CALIBRATION_READY'
  | 'CALIBRATION_COMPLETE'
  | 'CALIBRATION_ERROR'

type EyeTrackingEmbedHandshakeStage =
  | 'iframe-requested'
  | 'iframe-loaded'
  | 'embed-loaded'
  | 'ready'
  | 'error'

interface EyeTrackingCalibrationMessage {
  source?: string
  type?: string
  message?: string
  userId?: string | number
  profileId?: string | number
}

const EYE_TRACKING_MESSAGE_SOURCE = 'eyespeak-eye-tracking'
const EYE_TRACKING_EMBED_MESSAGE_TYPES = {
  EMBED_LOADED: 'EMBED_LOADED',
  CALIBRATION_READY: 'CALIBRATION_READY',
  CALIBRATION_COMPLETE: 'CALIBRATION_COMPLETE',
  CALIBRATION_ERROR: 'CALIBRATION_ERROR',
} as const
const LEGACY_EYE_TRACKING_EMBED_MESSAGE_TYPES: Record<string, EyeTrackingEmbedMessageType> = {
  'calibration-ready': EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_READY,
  'calibration-complete': EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_COMPLETE,
  'calibration-error': EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_ERROR,
}
const MAX_DIAGNOSTIC_MESSAGES = 6
const IFRAME_LOAD_TIMEOUT_MS = 10_000
const EMBED_HANDSHAKE_TIMEOUT_MS = 10_000
const CALIBRATION_READY_TIMEOUT_MS = 30_000

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function normalizeEyeTrackingMessageType(value: string | undefined): EyeTrackingEmbedMessageType | null {
  if (!value) {
    return null
  }

  if (
    value === EYE_TRACKING_EMBED_MESSAGE_TYPES.EMBED_LOADED ||
    value === EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_READY ||
    value === EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_COMPLETE ||
    value === EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_ERROR
  ) {
    return value
  }

  return LEGACY_EYE_TRACKING_EMBED_MESSAGE_TYPES[value] ?? null
}

function isAllowedEyeTrackingMessageOrigin(eventOrigin: string, allowedOrigin: string | null) {
  return Boolean(allowedOrigin) && eventOrigin === allowedOrigin
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
  if (isBrowserEyeTrackingEnabled()) {
    return <BrowserPatientCalibrationPage />
  }

  const navigate = useNavigate()
  const location = useLocation()
  const { user, patientPostAuth, clearPatientPostAuth } = useAuth()
  const [pageState, setPageState] = useState<CalibrationPageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [issueKind, setIssueKind] = useState<PatientCalibrationIssueKind>('none')
  const [iframeRenderKey, setIframeRenderKey] = useState(0)
  const [handshakeStage, setHandshakeStage] =
    useState<EyeTrackingEmbedHandshakeStage>('iframe-requested')
  const [diagnosticMessages, setDiagnosticMessages] = useState<string[]>([])
  const routeState = (location.state as PatientCalibrationLocationState | null) ?? null
  const postAuthNotice = routeState?.postAuthNotice ?? getPatientPostAuthNotice(patientPostAuth)
  const postCalibrationRedirectPath =
    routeState?.redirectPath ?? patientPostAuth?.redirectPath ?? ROUTE_PATHS.PATIENT_MAIN
  const eyeTrackingProfileId = useMemo(() => getPatientEyeTrackingProfileId(user), [user])
  const eyeTrackingConfig = useMemo(() => getEyeTrackingConfigSnapshot(), [])
  const authSuccessMessage = postAuthNotice?.authSuccessMessage ?? ''
  const calibrationNoticeMessage = postAuthNotice?.calibrationMessage ?? ''

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
      return `Eye tracking is not running in real mode for this frontend bundle (resolved mode: ${eyeTrackingConfig.resolvedApiMode}). If your env file already says real, restart the frontend build or dev server and verify the active bundle is not stale.`
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
  }, [
    allowedOrigin,
    eyeTrackingConfig.resolvedApiMode,
    eyeTrackingProfileId,
    iframeUrl,
    isLocalEyeTrackingUiOnRemoteHost,
  ])

  const debugItems = useMemo(() => {
    const items: Array<[string, string]> = [
      ['Resolved mode', eyeTrackingConfig.resolvedApiMode],
      ['Eye tracking UI URL', eyeTrackingConfig.uiUrl || '(unset)'],
      ['Eye tracking profile id', eyeTrackingProfileId || '(missing)'],
      ['Iframe origin', allowedOrigin || '(invalid)'],
      ['App origin', typeof window === 'undefined' ? '(unknown)' : window.location.origin],
      ['Handshake stage', handshakeStage],
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
  }, [allowedOrigin, eyeTrackingConfig, eyeTrackingProfileId, handshakeStage])

  const statusTitle =
    blockingErrorMessage
      ? 'Calibration entry failed'
      : pageState === 'saving'
        ? 'Verifying eye-tracking runtime'
        : pageState === 'loading'
          ? handshakeStage === 'embed-loaded'
            ? 'Preparing camera and calibration screen'
            : handshakeStage === 'iframe-loaded'
              ? 'Waiting for calibration handshake'
              : 'Preparing calibration screen'
          : issueKind === 'eye-tracking-preparation-failed'
            ? 'Eye-tracking preparation failed'
            : issueKind === 'calibration-failed'
              ? 'Calibration failed'
              : ''

  const statusDescription =
    blockingErrorMessage
      ? blockingErrorMessage
      : pageState === 'saving'
        ? 'Calibration completed. Verifying runtime readiness before entering the patient workspace.'
        : pageState === 'loading'
          ? handshakeStage === 'iframe-loaded'
            ? 'Calibration iframe loaded. Waiting for EMBED_LOADED from the eye-tracking UI.'
            : handshakeStage === 'embed-loaded'
              ? 'Eye-tracking UI loaded. Preparing camera and calibration screen...'
              : 'Preparing the camera and calibration screen...'
          : pageState === 'error'
            ? errorMessage
            : ''

  const environmentNoticeMessage = useMemo(() => {
    if (user?.authMode !== 'mock' || eyeTrackingConfig.resolvedApiMode === 'mock') {
      return ''
    }

    return 'Development note: authentication already succeeded in mock mode. Any issue on this screen is happening in calibration or eye-tracking setup, not during login.'
  }, [eyeTrackingConfig.resolvedApiMode, user?.authMode])

  useEffect(() => {
    if (!blockingErrorMessage || !import.meta.env.DEV) {
      return
    }

    console.warn('[calibration] entry failed before the calibration UI became usable', {
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

    const openMessage = `Opening calibration iframe: ${iframeUrl}`
    setPageState('loading')
    setErrorMessage('')
    setIssueKind('none')
    setHandshakeStage('iframe-requested')
    setDiagnosticMessages([openMessage])

    if (import.meta.env.DEV) {
      console.info('[calibration] opening eye-tracking iframe', {
        iframeUrl,
        allowedOrigin,
        eyeTrackingProfileId,
      })
    }
  }, [allowedOrigin, blockingErrorMessage, eyeTrackingProfileId, iframeRenderKey, iframeUrl])

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      user?.authMode !== 'mock' ||
      eyeTrackingConfig.resolvedApiMode !== 'real'
    ) {
      return
    }

    console.info('[auth] mock auth succeeded and calibration is using the real eye-tracking stack', {
      patientId: user.id,
      eyeTrackingProfileId,
    })
  }, [eyeTrackingConfig.resolvedApiMode, eyeTrackingProfileId, user])

  useEffect(() => {
    if (blockingErrorMessage || pageState === 'ready' || pageState === 'saving' || pageState === 'error') {
      return
    }

    const timeoutMessage =
      handshakeStage === 'iframe-requested'
        ? 'Calibration iframe did not finish loading in time.'
        : handshakeStage === 'iframe-loaded'
          ? 'Calibration iframe loaded, but EMBED_LOADED was not received.'
          : 'Eye-tracking UI did not report CALIBRATION_READY in time.'
    const timeoutMs =
      handshakeStage === 'iframe-requested'
        ? IFRAME_LOAD_TIMEOUT_MS
        : handshakeStage === 'iframe-loaded'
          ? EMBED_HANDSHAKE_TIMEOUT_MS
          : CALIBRATION_READY_TIMEOUT_MS

    const timeoutId = window.setTimeout(() => {
      setPageState('error')
      setIssueKind('calibration-failed')
      setHandshakeStage('error')
      setErrorMessage(timeoutMessage)
      setDiagnosticMessages(currentMessages =>
        [...currentMessages, timeoutMessage].slice(-MAX_DIAGNOSTIC_MESSAGES),
      )

      if (import.meta.env.DEV) {
        console.warn('[calibration] iframe handshake timed out', {
          handshakeStage,
          timeoutMs,
          allowedOrigin,
          iframeUrl,
          eyeTrackingProfileId,
        })
      }
    }, timeoutMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [allowedOrigin, blockingErrorMessage, eyeTrackingProfileId, handshakeStage, iframeUrl, pageState])

  useEffect(() => {
    if (blockingErrorMessage) {
      setIssueKind('calibration-entry-failed')
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
      setIssueKind('none')

      const result = await completePatientCalibration(user)

      if (!isMounted) {
        return
      }

      if (!result.success) {
        isSaving = false
        setPageState('error')
        setIssueKind('eye-tracking-preparation-failed')
        setErrorMessage(
          `Eye-tracking runtime preparation failed after authentication. ${result.message}`,
        )

        if (import.meta.env.DEV) {
          console.warn('[calibration] eye-tracking runtime preparation failed after calibration', {
            patientId: user?.id ?? null,
            eyeTrackingProfileId,
            message: result.message,
            statusCode: result.statusCode,
          })
        }

        return
      }

      clearPatientPostAuth()
      useGazeInputStore.getState().clearPoint()
      navigate(postCalibrationRedirectPath, { replace: true })
    }

    const handleMessage = (event: MessageEvent<EyeTrackingCalibrationMessage>) => {
      if (!isAllowedEyeTrackingMessageOrigin(event.origin, allowedOrigin)) {
        return
      }

      const payload = event.data

      if (!payload || payload.source !== EYE_TRACKING_MESSAGE_SOURCE) {
        return
      }

      const messageType = normalizeEyeTrackingMessageType(payload.type)

      if (!messageType) {
        return
      }

      const messageUserId = normalizeMessageUserId(payload.userId)

      if (eyeTrackingProfileId && messageUserId && messageUserId !== eyeTrackingProfileId) {
        if (import.meta.env.DEV) {
          console.warn('[eye-tracking] ignored calibration message with mismatched user id', {
            expectedEyeTrackingProfileId: eyeTrackingProfileId,
            receivedUserId: messageUserId,
            type: messageType,
          })
        }

        return
      }

      setDiagnosticMessages(currentMessages =>
        [
          ...currentMessages,
          `Received ${messageType}${messageUserId ? ` for profile ${messageUserId}` : ''}`,
        ].slice(-MAX_DIAGNOSTIC_MESSAGES),
      )

      if (import.meta.env.DEV) {
        console.info('[calibration] received eye-tracking iframe message', {
          type: messageType,
          eventOrigin: event.origin,
          allowedOrigin,
          userId: messageUserId,
          profileId: normalizeMessageUserId(payload.profileId),
        })
      }

      if (messageType === EYE_TRACKING_EMBED_MESSAGE_TYPES.EMBED_LOADED) {
        setHandshakeStage(currentStage =>
          currentStage === 'ready' || currentStage === 'error' ? currentStage : 'embed-loaded',
        )
        return
      }

      if (messageType === EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_READY) {
        setHandshakeStage('ready')
        setPageState(currentState => (currentState === 'loading' ? 'ready' : currentState))
        setErrorMessage('')
        setIssueKind('none')
        return
      }

      if (messageType === EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_ERROR) {
        setPageState('error')
        setHandshakeStage('error')
        setIssueKind('calibration-failed')
        setErrorMessage(payload.message || 'The calibration flow reported an error.')

        if (import.meta.env.DEV) {
          console.warn('[calibration] calibration UI reported an error', {
            patientId: user?.id ?? null,
            eyeTrackingProfileId,
            message: payload.message ?? null,
          })
        }

        return
      }

      if (messageType === EYE_TRACKING_EMBED_MESSAGE_TYPES.CALIBRATION_COMPLETE) {
        void persistCalibration()
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      isMounted = false
      window.removeEventListener('message', handleMessage)
    }
  }, [
    allowedOrigin,
    blockingErrorMessage,
    clearPatientPostAuth,
    eyeTrackingProfileId,
    navigate,
    postCalibrationRedirectPath,
    user,
  ])

  const handleIframeLoad = () => {
    if (blockingErrorMessage) {
      return
    }

    setHandshakeStage(currentStage =>
      currentStage === 'ready' || currentStage === 'error' ? currentStage : 'iframe-loaded',
    )
    setDiagnosticMessages(currentMessages =>
      [...currentMessages, 'Calibration iframe loaded. Waiting for EMBED_LOADED.'].slice(
        -MAX_DIAGNOSTIC_MESSAGES,
      ),
    )

    if (import.meta.env.DEV) {
      console.info('[calibration] iframe onLoad fired', {
        iframeUrl,
        allowedOrigin,
        eyeTrackingProfileId,
      })
    }
  }

  const handleIframeError = () => {
    const nextErrorMessage = 'Calibration iframe failed to load. Check the DEV proxy and eye-tracking server.'
    setPageState('error')
    setHandshakeStage('error')
    setIssueKind('calibration-failed')
    setErrorMessage(nextErrorMessage)
    setDiagnosticMessages(currentMessages =>
      [...currentMessages, nextErrorMessage].slice(-MAX_DIAGNOSTIC_MESSAGES),
    )

    if (import.meta.env.DEV) {
      console.error('[calibration] iframe onError fired', {
        iframeUrl,
        allowedOrigin,
        eyeTrackingProfileId,
      })
    }
  }

  const handleRetry = () => {
    setIframeRenderKey(currentKey => currentKey + 1)
  }

  return (
    <main style={pageStyle}>
      {blockingErrorMessage ? (
        <section style={errorPanelStyle}>
          <p style={errorEyebrowStyle}>Patient Calibration</p>
          <h1 style={errorTitleStyle}>Calibration entry failed</h1>
          {authSuccessMessage || calibrationNoticeMessage || environmentNoticeMessage ? (
            <div style={successPanelStyle}>
              {authSuccessMessage ? (
                <p style={successTitleStyle}>{authSuccessMessage}</p>
              ) : null}
              {calibrationNoticeMessage ? (
                <p style={successDescriptionStyle}>{calibrationNoticeMessage}</p>
              ) : null}
              {environmentNoticeMessage ? (
                <p style={successDescriptionStyle}>{environmentNoticeMessage}</p>
              ) : null}
            </div>
          ) : null}
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
            key={`${iframeRenderKey}:${iframeUrl}`}
            src={iframeUrl}
            title="Eye tracking calibration"
            style={iframeStyle}
            allow="camera; fullscreen"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />

          <div style={overlayLayerStyle}>
            <div style={labelBadgeStyle}>Patient Calibration</div>

            {authSuccessMessage || calibrationNoticeMessage || environmentNoticeMessage ? (
              <div style={noticeStackStyle}>
                {authSuccessMessage ? (
                  <div style={successCardStyle}>
                    <p style={successCardTitleStyle}>{authSuccessMessage}</p>
                    {calibrationNoticeMessage ? (
                      <p style={successCardDescriptionStyle}>{calibrationNoticeMessage}</p>
                    ) : null}
                    {environmentNoticeMessage ? (
                      <p style={successCardDescriptionStyle}>{environmentNoticeMessage}</p>
                    ) : null}
                  </div>
                ) : environmentNoticeMessage ? (
                  <div style={infoCardStyle}>{environmentNoticeMessage}</div>
                ) : null}
              </div>
            ) : null}

            {statusTitle || statusDescription ? (
              <div
                style={{
                  ...statusCardStyle,
                  ...((blockingErrorMessage || pageState === 'error') ? statusCardErrorStyle : null),
                }}
              >
                {statusTitle ? <p style={statusTitleStyle}>{statusTitle}</p> : null}
                {statusDescription ? <p style={statusDescriptionStyle}>{statusDescription}</p> : null}
                {pageState === 'error' ? (
                  <div style={statusActionRowStyle}>
                    <button type="button" style={statusButtonStyle} onClick={handleRetry}>
                      Retry calibration
                    </button>
                    <a href={iframeUrl} target="_blank" rel="noreferrer" style={statusLinkStyle}>
                      Open iframe directly
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            {import.meta.env.DEV && diagnosticMessages.length > 0 ? (
              <div style={diagnosticPanelStyle}>
                {diagnosticMessages.map((message, index) => (
                  <p key={`${index}:${message}`} style={diagnosticMessageStyle}>
                    {message}
                  </p>
                ))}
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
  justifyContent: 'flex-start',
  padding: '20px',
  boxSizing: 'border-box',
  gap: '14px',
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
  marginTop: 'auto',
  marginBottom: '24px',
  maxWidth: 'min(720px, calc(100vw - 40px))',
  padding: '16px 22px',
  borderRadius: '20px',
  backgroundColor: 'rgba(2, 6, 23, 0.66)',
  border: '1px solid rgba(125, 211, 252, 0.24)',
  boxShadow: '0 18px 36px rgba(2, 6, 23, 0.32)',
  color: '#f8fafc',
  backdropFilter: 'blur(16px)',
}

const statusCardErrorStyle: CSSProperties = {
  border: '1px solid rgba(251, 146, 60, 0.38)',
  color: '#ffe7cf',
}

const statusTitleStyle: CSSProperties = {
  margin: 0,
  color: 'inherit',
  fontSize: '15px',
  fontWeight: 800,
  lineHeight: 1.5,
  textAlign: 'center',
}

const statusDescriptionStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'inherit',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.6,
  textAlign: 'center',
}

const statusActionRowStyle: CSSProperties = {
  marginTop: '14px',
  display: 'flex',
  justifyContent: 'center',
  gap: '10px',
  pointerEvents: 'auto',
}

const statusButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: '999px',
  padding: '10px 18px',
  backgroundColor: '#f8fafc',
  color: '#0f172a',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
}

const statusLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  padding: '10px 18px',
  border: '1px solid rgba(248, 250, 252, 0.32)',
  color: '#f8fafc',
  fontSize: '13px',
  fontWeight: 800,
  textDecoration: 'none',
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

const successPanelStyle: CSSProperties = {
  maxWidth: '840px',
  padding: '18px 20px',
  borderRadius: '20px',
  backgroundColor: 'rgba(14, 116, 144, 0.14)',
  border: '1px solid rgba(125, 211, 252, 0.28)',
}

const successTitleStyle: CSSProperties = {
  margin: 0,
  color: '#e0f2fe',
  fontSize: '16px',
  fontWeight: 800,
}

const successDescriptionStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'rgba(226, 232, 240, 0.92)',
  fontSize: '14px',
  lineHeight: 1.6,
}

const noticeStackStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  pointerEvents: 'none',
}

const successCardStyle: CSSProperties = {
  width: 'min(720px, calc(100vw - 40px))',
  padding: '16px 22px',
  borderRadius: '20px',
  backgroundColor: 'rgba(8, 47, 73, 0.74)',
  border: '1px solid rgba(125, 211, 252, 0.3)',
  boxShadow: '0 18px 36px rgba(2, 6, 23, 0.28)',
  backdropFilter: 'blur(16px)',
}

const successCardTitleStyle: CSSProperties = {
  margin: 0,
  color: '#e0f2fe',
  fontSize: '15px',
  fontWeight: 800,
  lineHeight: 1.5,
  textAlign: 'center',
}

const successCardDescriptionStyle: CSSProperties = {
  margin: '8px 0 0',
  color: 'rgba(226, 232, 240, 0.92)',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.6,
  textAlign: 'center',
}

const infoCardStyle: CSSProperties = {
  width: 'min(720px, calc(100vw - 40px))',
  padding: '14px 20px',
  borderRadius: '18px',
  backgroundColor: 'rgba(15, 23, 42, 0.72)',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  color: 'rgba(226, 232, 240, 0.92)',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.6,
  textAlign: 'center',
  backdropFilter: 'blur(16px)',
}

const diagnosticPanelStyle: CSSProperties = {
  alignSelf: 'flex-end',
  marginTop: 'auto',
  width: 'min(420px, calc(100vw - 40px))',
  padding: '14px 16px',
  borderRadius: '16px',
  backgroundColor: 'rgba(2, 6, 23, 0.72)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: '0 14px 30px rgba(2, 6, 23, 0.24)',
  backdropFilter: 'blur(16px)',
}

const diagnosticMessageStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(226, 232, 240, 0.86)',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: 1.5,
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
