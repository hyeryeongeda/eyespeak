import { type CSSProperties, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { useCalibrationFlow } from '../../../hooks/useCalibrationFlow'
import { useCameraPermission } from '../../../hooks/useCameraPermission'
import {
  CALIBRATION_COMPLETION_REDIRECT_DELAY_MS,
  CALIBRATION_START_COUNTDOWN_SECONDS,
} from '../../../services/calibration/calibrationConstants'
import { completePatientCalibration } from '../../../services/calibration/patientCalibrationService'
import type {
  CalibrationPhase,
  CalibrationPoint,
  CalibrationTrackingStatus,
  CameraPermissionState,
} from '../../../types/calibration'

type CompletionState = 'idle' | 'saving' | 'saved' | 'error'

function getPointStyle(args: {
  point: CalibrationPoint
  isActive: boolean
  isCompleted: boolean
}) {
  const { point, isActive, isCompleted } = args

  return {
    ...calibrationPointStyle,
    left: `${point.xPercent}%`,
    top: `${point.yPercent}%`,
    backgroundColor: isCompleted ? '#1fa971' : isActive ? '#ffb454' : 'rgba(255, 255, 255, 0.98)',
    color: isCompleted || isActive ? '#ffffff' : '#32445f',
    borderColor: isCompleted ? 'rgba(31, 169, 113, 0.42)' : isActive ? '#ffb454' : '#d7e0f3',
    transform: `translate(-50%, -50%) scale(${isActive ? 1.18 : isCompleted ? 0.94 : 1})`,
    boxShadow: isActive
      ? '0 0 0 18px rgba(255, 180, 84, 0.2)'
      : '0 12px 24px rgba(54, 72, 100, 0.22)',
  } satisfies CSSProperties
}

function getStatusMessage(args: {
  permissionState: CameraPermissionState
  phase: CalibrationPhase
  trackingStatus: CalibrationTrackingStatus
  completionState: CompletionState
  errorMessage: string
}) {
  const { permissionState, phase, trackingStatus, completionState, errorMessage } = args

  if (errorMessage) {
    return errorMessage
  }

  if (completionState === 'saving') {
    return '캘리브레이션 완료 상태를 저장하고 있습니다.'
  }

  if (completionState === 'saved' || phase === 'completed') {
    return '캘리브레이션이 완료되었습니다.'
  }

  if (permissionState === 'requesting') {
    return '카메라 권한을 확인하고 있습니다.'
  }

  if (permissionState === 'denied') {
    return '브라우저 설정에서 카메라 권한을 허용한 뒤 다시 시도해주세요.'
  }

  if (permissionState === 'unavailable' || permissionState === 'error') {
    return '카메라를 시작할 수 없습니다. 다시 시도해주세요.'
  }

  if (
    trackingStatus === 'face-not-detected' ||
    trackingStatus === 'tracking-unstable' ||
    phase === 'checking-face'
  ) {
    return '얼굴을 화면 중앙에 맞춰주세요.'
  }

  return null
}

function GuideLines() {
  return (
    <div style={guideLineLayerStyle}>
      <div style={{ ...horizontalGuideLineStyle, left: '3%', right: '3%', top: '12%' }} />
      <div style={{ ...horizontalGuideLineStyle, left: '3%', right: '3%', top: '82%' }} />

      <div style={{ ...verticalGuideLineStyle, top: '12%', bottom: '18%', left: '3%' }} />
      <div style={{ ...verticalGuideLineStyle, top: '12%', bottom: '18%', left: '20%' }} />
      <div style={{ ...verticalGuideLineStyle, top: '12%', bottom: '18%', left: '40%' }} />
      <div style={{ ...verticalGuideLineStyle, top: '12%', bottom: '18%', left: '60%' }} />
      <div style={{ ...verticalGuideLineStyle, top: '12%', bottom: '18%', left: '80%' }} />
      <div style={{ ...verticalGuideLineStyle, top: '12%', bottom: '18%', left: '97%' }} />
    </div>
  )
}

export default function PatientCalibrationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    videoRef,
    stream,
    permissionState,
    errorMessage: cameraErrorMessage,
    requestPermission,
  } = useCameraPermission()
  const calibration = useCalibrationFlow({
    enabled: permissionState === 'granted',
    patientId: user?.id ?? null,
    previewStream: stream,
    videoRef,
  })
  const [completionState, setCompletionState] = useState<CompletionState>('idle')
  const [pageError, setPageError] = useState('')
  const [countdownValue, setCountdownValue] = useState<number | null>(null)
  const navigationTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const hasAutoRequestedRef = useRef(false)
  const isCountdownRunningRef = useRef(false)
  const isCalibrationSubmittingRef = useRef(false)

  const totalPoints = calibration.points.length
  const statusMessage = getStatusMessage({
    permissionState,
    phase: calibration.phase,
    trackingStatus: calibration.trackingStatus,
    completionState,
    errorMessage: pageError || cameraErrorMessage || calibration.errorMessage,
  })

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current !== null) {
      window.clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }

    setCountdownValue(null)
    isCountdownRunningRef.current = false
  }

  const persistCompletion = async () => {
    setPageError('')
    setCompletionState('saving')

    const result = await completePatientCalibration(user)

    if (!result.success) {
      setCompletionState('error')
      setPageError(result.message)
      isCalibrationSubmittingRef.current = false
      return
    }

    setCompletionState('saved')
    navigationTimerRef.current = window.setTimeout(() => {
      navigate(ROUTE_PATHS.PATIENT_MAIN, { replace: true })
    }, CALIBRATION_COMPLETION_REDIRECT_DELAY_MS)
  }

  const startCalibrationSequence = async () => {
    if (isCalibrationSubmittingRef.current) {
      return
    }

    isCalibrationSubmittingRef.current = true
    setPageError('')
    setCompletionState('idle')

    const isCompleted = await calibration.startCalibration()

    if (!isCompleted) {
      isCalibrationSubmittingRef.current = false
      return
    }

    await persistCompletion()
  }
  const handleCountdownCompleted = useEffectEvent(() => {
    void startCalibrationSequence()
  })

  const handleRetry = async () => {
    clearCountdownTimer()
    isCalibrationSubmittingRef.current = false
    setCompletionState('idle')
    setPageError('')
    calibration.resetCalibration()
    await requestPermission()
  }

  useEffect(() => {
    return () => {
      clearCountdownTimer()

      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (hasAutoRequestedRef.current || permissionState !== 'idle') {
      return
    }

    hasAutoRequestedRef.current = true
    void requestPermission()
  }, [permissionState, requestPermission])

  useEffect(() => {
    if (
      permissionState !== 'granted' ||
      calibration.phase !== 'ready' ||
      completionState !== 'idle' ||
      isCountdownRunningRef.current ||
      isCalibrationSubmittingRef.current
    ) {
      return
    }

    isCountdownRunningRef.current = true
    let currentValue = CALIBRATION_START_COUNTDOWN_SECONDS

    const tick = () => {
      setCountdownValue(currentValue)
      countdownTimerRef.current = window.setTimeout(() => {
        currentValue -= 1

        if (currentValue <= 0) {
          clearCountdownTimer()
          handleCountdownCompleted()
          return
        }

        tick()
      }, 1000)
    }

    countdownTimerRef.current = window.setTimeout(tick, 0)

    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearTimeout(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [completionState, calibration.phase, permissionState])

  return (
    <main style={pageStyle}>
      <section style={stageStyle}>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            ...videoStyle,
            opacity: permissionState === 'granted' ? 1 : 0,
          }}
        />

        <div style={videoShadeStyle} />
        <div style={topGlowStyle} />

        {permissionState === 'granted' ? (
          <>
            <GuideLines />
            <div style={faceGuideStyle} />

            <div style={pointLayerStyle}>
              {calibration.points.map(point => (
                <div
                  key={point.id}
                  style={getPointStyle({
                    point,
                    isActive: calibration.activePoint?.id === point.id,
                    isCompleted: calibration.completedPointIds.includes(point.id),
                  })}
                >
                  {point.label}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {countdownValue !== null ? <div style={countdownOverlayStyle}>{countdownValue}</div> : null}

        {completionState === 'saved' ? <div style={countdownOverlayStyle}>완료</div> : null}

        {permissionState === 'granted' ? (
          <div style={hudRowStyle}>
            <div style={hudChipStyle}>
              {Math.min(calibration.completedCount, totalPoints)}/{totalPoints}
            </div>
          </div>
        ) : null}

        {statusMessage ? <div style={statusMessageStyle}>{statusMessage}</div> : null}

        {(permissionState === 'denied' ||
          permissionState === 'unavailable' ||
          permissionState === 'error' ||
          completionState === 'error') && (
          <div style={actionOverlayStyle}>
            <button type="button" style={retryButtonStyle} onClick={() => void handleRetry()}>
              다시 시도
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  width: '100%',
  height: '100dvh',
  backgroundColor: '#0e1622',
}

const stageStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top left, rgba(39, 62, 96, 0.9) 0%, rgba(14, 22, 34, 1) 58%, rgba(8, 12, 21, 1) 100%)',
}

const videoStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const videoShadeStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(7, 11, 18, 0.42) 0%, rgba(7, 11, 18, 0.14) 22%, rgba(7, 11, 18, 0.2) 76%, rgba(7, 11, 18, 0.46) 100%)',
}

const topGlowStyle: CSSProperties = {
  position: 'absolute',
  inset: '-12% auto auto -8%',
  width: '42vw',
  height: '42vw',
  minWidth: '280px',
  minHeight: '280px',
  borderRadius: '999px',
  background: 'radial-gradient(circle, rgba(87, 171, 255, 0.24) 0%, rgba(87, 171, 255, 0) 72%)',
}

const guideLineLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
}

const horizontalGuideLineStyle: CSSProperties = {
  position: 'absolute',
  height: '2px',
  backgroundColor: 'rgba(255, 255, 255, 0.34)',
}

const verticalGuideLineStyle: CSSProperties = {
  position: 'absolute',
  width: '2px',
  backgroundColor: 'rgba(255, 255, 255, 0.34)',
}

const faceGuideStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '48%',
  width: 'min(34vw, 320px)',
  height: 'min(44vw, 400px)',
  transform: 'translate(-50%, -50%)',
  borderRadius: '42px',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 0 0 9999px rgba(8, 12, 20, 0.08)',
  zIndex: 1,
}

const pointLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
}

const calibrationPointStyle: CSSProperties = {
  position: 'absolute',
  width: '46px',
  height: '46px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '15px',
  fontWeight: 900,
  border: '2px solid transparent',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
}

const countdownOverlayStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  zIndex: 4,
  transform: 'translate(-50%, -50%)',
  color: '#ffffff',
  fontSize: 'clamp(4rem, 16vw, 10rem)',
  fontWeight: 900,
  letterSpacing: '-0.06em',
  textShadow: '0 18px 40px rgba(0, 0, 0, 0.32)',
}

const hudRowStyle: CSSProperties = {
  position: 'absolute',
  top: '24px',
  right: '24px',
  zIndex: 4,
  display: 'flex',
  gap: '10px',
}

const hudChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '78px',
  height: '40px',
  padding: '0 16px',
  borderRadius: '999px',
  backgroundColor: 'rgba(9, 15, 27, 0.46)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 800,
  border: '1px solid rgba(177, 196, 225, 0.24)',
  backdropFilter: 'blur(12px)',
}

const statusMessageStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: '26px',
  zIndex: 4,
  transform: 'translateX(-50%)',
  maxWidth: 'min(760px, calc(100vw - 48px))',
  padding: '12px 18px',
  borderRadius: '999px',
  backgroundColor: 'rgba(9, 15, 27, 0.54)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
  textAlign: 'center',
  backdropFilter: 'blur(14px)',
}

const actionOverlayStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: '82px',
  zIndex: 4,
  transform: 'translateX(-50%)',
}

const retryButtonStyle: CSSProperties = {
  minHeight: '54px',
  padding: '0 22px',
  borderRadius: '18px',
  border: '1px solid rgba(191, 207, 233, 0.24)',
  backgroundColor: 'rgba(255, 255, 255, 0.12)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 800,
  cursor: 'pointer',
}
