import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'

type FeatureCardProps = {
  badge: string
  title: string
  description: string
  background: string
  className: string
  centered?: boolean
  onClick?: () => void
}

function FeatureCard({
  badge,
  title,
  description,
  background,
  className,
  centered = false,
  onClick,
}: FeatureCardProps) {
  return (
    <section
      className={className}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      style={{
        ...featureCardBase,
        background,
        height: '100%',
        minHeight: 0,
        alignItems: centered ? 'center' : 'flex-start',
        justifyContent: centered ? 'center' : 'flex-start',
        textAlign: centered ? 'center' : 'left',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
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
    </section>
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

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

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
              onClick={() => navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)}
            />

            <FeatureCard
              className="patient-main-card patient-main-half"
              badge="즉시 행동"
              title="호출"
              description="보호자를 호출해요"
              background="linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)"
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
    </>
  )
}
