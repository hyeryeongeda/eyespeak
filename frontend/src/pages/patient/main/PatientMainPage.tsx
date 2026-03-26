import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import DwellFeedbackBadge from '../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
  type DwellFeedbackViewModel,
} from '../../../features/patient/input/hooks/useDwellFeedback'
import { requestPatientRecalibration } from '../../../features/patient/input/services/calibration/patientCalibrationService'
import {
  requestMockPatientCall,
} from '../../../services/patientCallService'
import type { PatientCallFlowStatus } from '../../../types/patientCall'
import PatientCallOverlay from './PatientCallOverlay'
import { useCellMapping } from '../../../features/patient/input/hooks/useCellMapping'

type PatientMainTargetId = 'talk' | 'call' | 'leisure'

type FeatureCardProps = {
  badge: string
  title: string
  description: string
  background: string
  className: string
  onSelect?: () => void
  disabled?: boolean
  centered?: boolean
  trackingId?: PatientMainTargetId
  dwellFeedback?: DwellFeedbackViewModel<PatientMainTargetId>
}

function FeatureCard({
  badge,
  title,
  description,
  background,
  className,
  onSelect,
  disabled = false,
  centered = false,
  trackingId,
  dwellFeedback,
}: FeatureCardProps) {
  const isInteractive = typeof onSelect === 'function'
  const cardClassName = isInteractive ? `${className} patient-main-interactive` : className
  const shouldShowDwellFeedback =
    isInteractive &&
    isDwellFeedbackTargetActive(
      dwellFeedback ?? { activeTargetId: null, phase: 'idle', progress: 0, remainingMs: 0 },
      trackingId,
    )
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
      data-tracking-id={trackingId && !disabled ? trackingId : undefined}
      onClick={onSelect}
      disabled={disabled}
      aria-label={`${title} 카드`}
      style={{
        ...featureCardBase,
        background,
        height: '100%',
        minHeight: 0,
        width: '100%',
        appearance: 'none',
        textDecoration: 'none',
        cursor: !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.7 : 1,
        position: 'relative',
        alignItems: centered ? 'center' : 'flex-start',
        justifyContent: centered ? 'center' : 'flex-start',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      {shouldShowDwellFeedback && dwellFeedback ? (
        <DwellFeedbackBadge
          phase={dwellFeedback.phase}
          progress={dwellFeedback.progress}
          remainingMs={dwellFeedback.remainingMs}
        />
      ) : null}
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

export default function PatientMainPage() {
  const navigate = useNavigate()
  const { logout, user, clearPatientPostAuth } = useAuth()
  const isMouseRecalibrationIntentRef = useRef(false)
  const isMouseLogoutIntentRef = useRef(false)
  const dwellFeedback = useDwellFeedback<PatientMainTargetId>({
    enabled: true,
  })
  const [callStatus, setCallStatus] = useState<PatientCallFlowStatus>('idle')

  const patientMainCellMapping = useMemo(() => ({
    0: 'talk',
    1: 'talk',
    2: 'talk',
    3: 'call',
    4: 'call',
    5: 'leisure',
  } as Record<number, string | null>), [])

  useCellMapping(patientMainCellMapping)

  const isOverlayVisible = callStatus === 'requesting' || callStatus === 'success'
  const overlayStatus = isOverlayVisible ? callStatus : null

  const trackingStatusText = useMemo(() => {
    if (isOverlayVisible) {
      return '호출 상태 안내가 열려 있습니다.'
    }

    return '시선을 카드 위에 머무르면 선택되고, 더블 블링크로 글로벌 메뉴를 열고 닫을 수 있습니다.'
  }, [isOverlayVisible])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  const handleRecalibrationPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    isMouseRecalibrationIntentRef.current = event.pointerType === 'mouse'
  }

  const handleRecalibrationClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!isMouseRecalibrationIntentRef.current || event.detail === 0) {
      isMouseRecalibrationIntentRef.current = false
      return
    }

    isMouseRecalibrationIntentRef.current = false
    clearPatientPostAuth()
    requestPatientRecalibration(user)
    navigate(ROUTE_PATHS.PATIENT_CALIBRATION)
  }

  const handleLogoutPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    isMouseLogoutIntentRef.current = event.pointerType === 'mouse'
  }

  const handleLogoutClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!isMouseLogoutIntentRef.current || event.detail === 0) {
      isMouseLogoutIntentRef.current = false
      return
    }

    isMouseLogoutIntentRef.current = false
    void handleLogout()
  }

  async function requestPatientCall() {
    try {
      await requestMockPatientCall(user!.matchingId!, user!.accessToken)
      setCallStatus('success')
    } catch {
      setCallStatus('idle')
    }
  }

  function handleSelectCall() {
    setCallStatus('requesting')

    window.setTimeout(() => {
      void requestPatientCall()
    }, 0)
  }

  function handleSelectTarget(targetId: PatientMainTargetId) {
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
    if (callStatus !== 'success') {
      return
    }

    const timerId = window.setTimeout(() => {
      setCallStatus('idle')
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
              <button
                type="button"
                onPointerDown={handleRecalibrationPointerDown}
                onClick={handleRecalibrationClick}
                onPointerLeave={() => {
                  isMouseRecalibrationIntentRef.current = false
                }}
                onPointerCancel={() => {
                  isMouseRecalibrationIntentRef.current = false
                }}
                onBlur={() => {
                  isMouseRecalibrationIntentRef.current = false
                }}
                style={recalibrationButtonStyle}
                data-gaze-selection="mouse-only"
              >
                재캘리브레이션
              </button>
              <button
                type="button"
                onPointerDown={handleLogoutPointerDown}
                onClick={handleLogoutClick}
                onPointerLeave={() => {
                  isMouseLogoutIntentRef.current = false
                }}
                onPointerCancel={() => {
                  isMouseLogoutIntentRef.current = false
                }}
                onBlur={() => {
                  isMouseLogoutIntentRef.current = false
                }}
                style={logoutButtonStyle}
                data-gaze-selection="mouse-only"
              >
                로그아웃
              </button>
            </div>
          </div>

          <div
            className="patient-main-grid"
            style={featureGridStyle}
            ref={element => {
              dwellFeedback.containerRef.current = element
            }}
          >
            <FeatureCard
              className="patient-main-card patient-main-full"
              badge="대화"
              title="대화"
              description="표현하기와 보호자 응답 화면으로 이동합니다."
              background="linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)"
              centered
              onSelect={() => handleSelectTarget('talk')}
              trackingId="talk"
              dwellFeedback={dwellFeedback}
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="즉시 호출"
              title="호출"
              description="보호자를 호출합니다."
              background="linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)"
              onSelect={() => handleSelectTarget('call')}
              disabled={callStatus === 'requesting'}
              centered
              trackingId="call"
              dwellFeedback={dwellFeedback}
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="여가"
              title="여가"
              description="음악과 영상 추천 화면으로 이동합니다."
              background="linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)"
              centered
              onSelect={() => handleSelectTarget('leisure')}
              trackingId="leisure"
              dwellFeedback={dwellFeedback}
            />
          </div>
        </div>
      </main>

      {overlayStatus ? (
        <PatientCallOverlay
          status={overlayStatus}
          message="보호자에게 호출 신호를 전송했습니다."
        />
      ) : null}
    </>
  )
}
