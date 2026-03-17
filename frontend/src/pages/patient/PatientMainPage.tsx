import { type CSSProperties, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'
import PatientCallOverlay from './components/PatientCallOverlay'
import {
  getPatientCallCooldownSeconds,
  getRemainingPatientCallCooldownMs,
  requestMockPatientCall,
} from '../../services/patientCallService'
import type { PatientCallFlowStatus } from '../../types/patientCall'

type FeatureCardProps = {
  badge: string
  title: string
  description: string
  background: string
  className: string
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
  onSelect,
  disabled = false,
  centered = false,
}: FeatureCardProps) {
  const isInteractive = typeof onSelect === 'function'
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
        cursor: isInteractive && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.7 : 1,
        alignItems: centered ? 'center' : 'flex-start',
        justifyContent: centered ? 'center' : 'flex-start',
        textAlign: centered ? 'center' : 'left',
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

  @media (max-width: 900px) {
    .patient-main-grid {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(3, minmax(0, 1fr));
    }

    .patient-main-full,
    .patient-main-half {
      grid-column: auto;
      grid-row: auto;
    }
  }

  @media (max-width: 640px) {
    .patient-main-page {
      padding: 8px;
    }

    .patient-main-card {
      padding: 18px;
      border-radius: 24px;
    }
  }
`

export default function PatientMainPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [callStatus, setCallStatus] = useState<PatientCallFlowStatus>('idle')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const patientId = user?.id ?? 'patient-guest'
  const isOverlayVisible =
    callStatus === 'requesting' || callStatus === 'success' || callStatus === 'cooldown'
  const overlayStatus = isOverlayVisible ? callStatus : null

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  const closeCallOverlay = () => {
    setCallStatus('idle')
    setCooldownSeconds(0)
  }

  const requestPatientCall = async () => {
    const result = await requestMockPatientCall(patientId)

    if (!result.success) {
      setCooldownSeconds(Math.ceil(result.remainingMs / 1000))
      setCallStatus('cooldown')
      return
    }

    setCallStatus('success')
  }

  const handleSelectCall = () => {
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
            <p style={userTextStyle}>{user?.name ? `${user.name} 님` : '환자 메인'}</p>
            <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
              로그아웃
            </button>
          </div>

          <div className="patient-main-grid" style={featureGridStyle}>
            <FeatureCard
              className="patient-main-card patient-main-full"
              badge="주기능"
              title="대화"
              description="렛츠고우!"
              background="linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)"
              centered
              onSelect={() => navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)}
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="즉시 행동"
              title="호출"
              description="보호자를 호출해요"
              background="linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)"
              onSelect={handleSelectCall}
              disabled={callStatus === 'requesting'}
              centered
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="휴식"
              title="여가"
              description="음악 · 유튜브 · 뉴스"
              background="linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)"
              centered
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
