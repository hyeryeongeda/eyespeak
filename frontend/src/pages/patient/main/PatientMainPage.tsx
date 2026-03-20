import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import PatientCallOverlay from './PatientCallOverlay'
import {
  getPatientCallCooldownSeconds,
  getRemainingPatientCallCooldownMs,
  requestMockPatientCall,
} from '../../../services/patientCallService'
import { requestPatientRecalibration } from '../../../services/calibration/patientCalibrationService'
import type { PatientCallFlowStatus } from '../../../types/patientCall'
import { useTracking } from '../../../hooks/useTracking'
import { useDwell, type DwellPhase } from '../../../hooks/useDwell'
import {
  getActivationDelayPreset,
  getDwellTimePreset,
} from '../../../services/careSettingService'
import { submitActiveEyeTrackingSelectionFeedback } from '../../../services/eyeTrackingSelectionFeedbackService'
import { ACTIVATION_DELAY_OPTIONS, DWELL_TIME_OPTIONS } from '../../../types/care'

type PatientMainTrackingTargetId = 'talk' | 'call' | 'leisure'

type FeatureCardProps = {
  badge: string
  title: string
  description: string
  background: string
  className: string
  trackingId?: PatientMainTrackingTargetId
  trackingFocused?: boolean
  dwellPhase?: DwellPhase
  dwellProgress?: number
  dwellRemainingMs?: number
  onSelect?: () => void
  disabled?: boolean
  centered?: boolean
}

function FeatureCard({
  badge,
  title,
  description,
  background,
  className,
  trackingId,
  trackingFocused = false,
  dwellPhase = 'idle',
  dwellProgress = 0,
  dwellRemainingMs = 0,
  onSelect,
  disabled = false,
  centered = false,
}: FeatureCardProps) {
  const isInteractive = typeof onSelect === 'function'
  const showTrackingFeedback = Boolean(trackingId) && trackingFocused
  const cardClassName = isInteractive ? `${className} patient-main-interactive` : className
  const content = (
    <>
      <span style={{ ...badgeStyle, alignSelf: centered ? 'center' : 'flex-start' }}>{badge}</span>
      <h2
        style={{
          margin: centered ? '18px 0 10px' : '22px 0 12px',
          width: '100%',
          color: '#2b3850',
          fontSize: centered ? 'clamp(3.5rem, 6vw, 4.75rem)' : 'clamp(2.8rem, 4vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          textAlign: centered ? 'center' : 'left',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          width: '100%',
          color: '#5f6f88',
          fontSize: centered ? 'clamp(1.2rem, 2vw, 1.8rem)' : 'clamp(1.05rem, 1.8vw, 1.65rem)',
          fontWeight: 700,
          lineHeight: 1.35,
          textAlign: centered ? 'center' : 'left',
        }}
        >
        {description}
      </p>
      {showTrackingFeedback ? (
        <div style={trackingPanelStyle}>
          <p style={trackingLabelStyle}>{getTrackingStatusCopy(dwellPhase, dwellRemainingMs)}</p>
          <div style={trackingBarStyle}>
            <div
              style={{
                ...trackingBarFillStyle,
                width: `${Math.max(8, Math.round(dwellProgress * 100))}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  )

  if (!isInteractive) {
    return (
      <section
        className={cardClassName}
        style={{
          ...featureCardBase,
          background,
          height: '100%',
          minHeight: 0,
          width: '100%',
          alignItems: centered ? 'center' : 'flex-start',
          justifyContent: centered ? 'center' : 'flex-start',
          textAlign: centered ? 'center' : 'left',
          ...(trackingFocused
            ? {
                borderColor: '#8ab6de',
                boxShadow: '0 28px 52px rgba(93, 142, 199, 0.2)',
              }
            : null),
        }}
      >
        {content}
      </section>
    )
  }

  return (
    <button
      type="button"
      className={cardClassName}
      onClick={onSelect}
      disabled={disabled}
      aria-label={`${title} 카드`}
      data-tracking-id={trackingId && !disabled ? trackingId : undefined}
      data-gaze-selection={trackingId && !disabled ? 'local' : undefined}
      style={{
        ...featureCardBase,
        background,
        height: '100%',
        minHeight: 0,
        width: '100%',
        appearance: 'none',
        textDecoration: 'none',
        cursor: isInteractive && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.7 : 1,
        alignItems: centered ? 'center' : 'flex-start',
        justifyContent: centered ? 'center' : 'flex-start',
        textAlign: centered ? 'center' : 'left',
        ...(trackingFocused
          ? {
              borderColor: '#8ab6de',
              boxShadow: '0 28px 52px rgba(93, 142, 199, 0.24)',
            }
          : null),
      }}
    >
      {content}
    </button>
  )
}

const pageStyle: CSSProperties = {
  height: '100dvh',
  width: '100%',
  padding: '10px',
  background:
    'radial-gradient(circle at top left, rgba(255, 255, 255, 0.9) 0%, rgba(239, 244, 255, 0.88) 36%, #eef2fb 100%)',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const containerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}

const topBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '10px',
  flexWrap: 'wrap',
}

const userTextStyle: CSSProperties = {
  margin: 0,
  color: '#7384a1',
  fontSize: '14px',
  fontWeight: 600,
}

const trackingTextStyle: CSSProperties = {
  margin: '4px 0 0',
  color: '#6f82a0',
  fontSize: '12px',
  fontWeight: 700,
}

const logoutButtonStyle: CSSProperties = {
  height: '42px',
  padding: '0 18px',
  borderRadius: '999px',
  border: '1px solid rgba(131, 148, 179, 0.28)',
  backgroundColor: 'rgba(255, 255, 255, 0.78)',
  color: '#52627d',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
}

const topBarActionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
}

const recalibrationButtonStyle: CSSProperties = {
  ...logoutButtonStyle,
  border: '1px solid rgba(111, 147, 199, 0.28)',
  color: '#44648a',
}

const featureGridStyle: CSSProperties = {
  display: 'grid',
  gap: '10px',
  flex: 1,
  minHeight: 0,
}

const featureCardBase: CSSProperties = {
  borderRadius: '30px',
  border: '1px solid rgba(189, 201, 223, 0.62)',
  boxShadow: '0 24px 40px rgba(121, 139, 176, 0.12)',
  padding: 'clamp(20px, 2vw, 28px)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'flex-start',
  minWidth: '74px',
  height: '34px',
  padding: '0 14px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  color: '#6f87d9',
  fontSize: '16px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  boxShadow: '0 6px 16px rgba(115, 129, 180, 0.08)',
}

const trackingPanelStyle: CSSProperties = {
  width: '100%',
  marginTop: '14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const trackingLabelStyle: CSSProperties = {
  margin: 0,
  color: '#45688d',
  fontSize: '13px',
  fontWeight: 800,
}

const trackingBarStyle: CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  overflow: 'hidden',
}

const trackingBarFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  background: 'linear-gradient(90deg, #7ea8d7 0%, #5d8ec7 100%)',
  transition: 'width 0.08s linear',
}

const responsiveStyle = `
  .patient-main-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  .patient-main-interactive:hover:not(:disabled),
  .patient-main-interactive:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 28px 46px rgba(121, 139, 176, 0.18);
    outline: none;
  }

  .patient-main-interactive:active:not(:disabled) {
    transform: translateY(0);
  }

  .patient-main-full {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .patient-main-half {
    grid-column: span 6;
    grid-row: 2;
  }
`

function formatSecondsText(milliseconds: number) {
  const seconds = milliseconds / 1000

  if (seconds <= 0) {
    return '0.0초'
  }

  return `${seconds.toFixed(1)}초`
}

function getTrackingStatusCopy(phase: DwellPhase, remainingMs: number) {
  if (phase === 'locking') {
    return `입력 잠금 해제까지 ${formatSecondsText(remainingMs)}`
  }

  if (phase === 'dwelling') {
    return `선택 확정까지 ${formatSecondsText(remainingMs)}`
  }

  if (phase === 'triggered') {
    return '선택 확정'
  }

  return '시선 입력 대기'
}

export default function PatientMainPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [callStatus, setCallStatus] = useState<PatientCallFlowStatus>('idle')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [dwellDurationMs, setDwellDurationMs] = useState(DWELL_TIME_OPTIONS.default.value)
  const [activationDelayMs, setActivationDelayMs] =
    useState(ACTIVATION_DELAY_OPTIONS.medium.value)
  const gridRef = useRef<HTMLDivElement | null>(null)

  const patientId = user?.id ?? 'patient-guest'
  const isOverlayVisible =
    callStatus === 'requesting' || callStatus === 'success' || callStatus === 'cooldown'
  const overlayStatus = isOverlayVisible ? callStatus : null
  const trackingEnabled = !isOverlayVisible

  const { hoveredTargetId, isPointerInside, inputSource } = useTracking<PatientMainTrackingTargetId>({
    containerRef: gridRef,
    enabled: trackingEnabled,
  })
  const isGazeSelectionActive = inputSource === 'gaze'

  const dwellState = useDwell<PatientMainTrackingTargetId>({
    hoveredTargetId: isGazeSelectionActive ? hoveredTargetId : null,
    dwellDurationMs,
    activationDelayMs,
    disabled: !trackingEnabled,
    onCommit: targetId => {
      handleSelectTarget(targetId, 'gaze')
    },
  })

  const trackingStatusText = useMemo(() => {
    if (isOverlayVisible) {
      return '호출 상태 안내 중에는 시선 선택을 잠시 멈춥니다.'
    }

    if (dwellState.activeTargetId && dwellState.phase !== 'idle') {
      return getTrackingStatusCopy(dwellState.phase, dwellState.remainingMs)
    }

    if (inputSource === 'pointer' && isPointerInside) {
      return '\uB9C8\uC6B0\uC2A4\uB85C \uD074\uB9AD\uD558\uAC70\uB098 \uC2DC\uC120\uC744 \uACE0\uC815\uD574 \uC120\uD0DD\uD558\uC138\uC694.'
    }

    if (isPointerInside) {
      return `포인터를 유지하면 ${formatSecondsText(dwellDurationMs)} 뒤 선택됩니다.`
    }

    return `포인터를 카드 위에 올리면 입력 잠금 ${formatSecondsText(
      activationDelayMs,
    )} 후 dwell 선택이 시작됩니다.`
  }, [
    activationDelayMs,
    dwellDurationMs,
    dwellState.activeTargetId,
    dwellState.phase,
    dwellState.remainingMs,
    inputSource,
    isOverlayVisible,
    isPointerInside,
  ])

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  const handleRecalibration = () => {
    requestPatientRecalibration(user)
    navigate(ROUTE_PATHS.PATIENT_CALIBRATION)
  }

  function closeCallOverlay() {
    setCallStatus('idle')
    setCooldownSeconds(0)
  }

  async function requestPatientCall() {
    const result = await requestMockPatientCall(patientId)

    if (!result.success) {
      setCooldownSeconds(Math.ceil(result.remainingMs / 1000))
      setCallStatus('cooldown')
      return
    }

    setCallStatus('success')
  }

  function handleSelectCall() {
    const remainingMs = getRemainingPatientCallCooldownMs(patientId)

    if (remainingMs > 0) {
      setCooldownSeconds(getPatientCallCooldownSeconds(patientId))
      setCallStatus('cooldown')
      return
    }

    setCallStatus('requesting')

    window.setTimeout(() => {
      void requestPatientCall()
    }, 0)
  }

  function handleSelectTarget(
    targetId: PatientMainTrackingTargetId,
    source: 'pointer' | 'gaze',
  ) {
    if (source === 'gaze') {
      submitActiveEyeTrackingSelectionFeedback()
    }

    if (targetId === 'talk') {
      navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)
      return
    }

    if (targetId === 'call') {
      handleSelectCall()
      return
    }

    navigate(ROUTE_PATHS.PATIENT_LEISURE)
  }

  useEffect(() => {
    let isMounted = true

    const loadTrackingPresets = async () => {
      try {
        const [dwellPresetResult, activationDelayResult] = await Promise.all([
          getDwellTimePreset(),
          getActivationDelayPreset(),
        ])

        if (!isMounted) {
          return
        }

        if (dwellPresetResult.success) {
          setDwellDurationMs(DWELL_TIME_OPTIONS[dwellPresetResult.data].value)
        }

        if (activationDelayResult.success) {
          setActivationDelayMs(ACTIVATION_DELAY_OPTIONS[activationDelayResult.data].value)
        }
      } catch {
        // Preset fetch is non-blocking. Keep default timing values when it fails.
      }
    }

    void loadTrackingPresets()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (callStatus !== 'cooldown') {
      return
    }

    const syncCooldown = () => {
      const nextCooldownSeconds = getPatientCallCooldownSeconds(patientId)

      if (nextCooldownSeconds <= 0) {
        setCallStatus('idle')
        setCooldownSeconds(0)
        return
      }

      setCooldownSeconds(nextCooldownSeconds)
    }

    syncCooldown()

    const timerId = window.setInterval(syncCooldown, 500)

    return () => {
      window.clearInterval(timerId)
    }
  }, [callStatus, patientId])

  useEffect(() => {
    if (callStatus !== 'success') {
      return
    }

    const timerId = window.setTimeout(() => {
      setCallStatus('idle')
      setCooldownSeconds(0)
    }, 2500)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [callStatus])

  return (
    <>
      <style>{responsiveStyle}</style>
      <main className="patient-main-page" style={pageStyle}>
        <div style={containerStyle}>
          <div style={topBarStyle}>
            <div>
              <p style={userTextStyle}>{user?.name ? `${user.name} 님` : '환자 메인'}</p>
              <p style={trackingTextStyle}>{trackingStatusText}</p>
            </div>
            <div style={topBarActionRowStyle}>
              <button type="button" onClick={handleRecalibration} style={recalibrationButtonStyle}>
                재캘리브레이션
              </button>
              <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
                로그아웃
              </button>
            </div>
          </div>

          <div ref={gridRef} className="patient-main-grid" style={featureGridStyle}>
            <FeatureCard
              className="patient-main-card patient-main-full"
              badge="주기능"
              title="대화"
              description="렛츠고우!"
              background="linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)"
              trackingId="talk"
              trackingFocused={dwellState.activeTargetId === 'talk'}
              dwellPhase={dwellState.activeTargetId === 'talk' ? dwellState.phase : 'idle'}
              dwellProgress={dwellState.activeTargetId === 'talk' ? dwellState.progress : 0}
              dwellRemainingMs={
                dwellState.activeTargetId === 'talk' ? dwellState.remainingMs : 0
              }
              centered
              onSelect={() => handleSelectTarget('talk', 'pointer')}
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="즉시 행동"
              title="호출"
              description="보호자를 호출해요"
              background="linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)"
              trackingId="call"
              trackingFocused={dwellState.activeTargetId === 'call'}
              dwellPhase={dwellState.activeTargetId === 'call' ? dwellState.phase : 'idle'}
              dwellProgress={dwellState.activeTargetId === 'call' ? dwellState.progress : 0}
              dwellRemainingMs={
                dwellState.activeTargetId === 'call' ? dwellState.remainingMs : 0
              }
              onSelect={() => handleSelectTarget('call', 'pointer')}
              disabled={callStatus === 'requesting'}
              centered
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="휴식"
              title="여가"
              description="음악 · 유튜브 · 뉴스"
              background="linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)"
              trackingId="leisure"
              trackingFocused={dwellState.activeTargetId === 'leisure'}
              dwellPhase={dwellState.activeTargetId === 'leisure' ? dwellState.phase : 'idle'}
              dwellProgress={dwellState.activeTargetId === 'leisure' ? dwellState.progress : 0}
              dwellRemainingMs={
                dwellState.activeTargetId === 'leisure' ? dwellState.remainingMs : 0
              }
              centered
              onSelect={() => handleSelectTarget('leisure', 'pointer')}
            />
          </div>
        </div>
      </main>

      {overlayStatus ? (
        <PatientCallOverlay
          status={overlayStatus}
          message="보호자에게 호출 신호가 전송되었습니다."
          cooldownSeconds={cooldownSeconds}
          onClose={closeCallOverlay}
        />
      ) : null}
    </>
  )
}
