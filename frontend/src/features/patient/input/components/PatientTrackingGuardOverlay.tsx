import { type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { useAuth } from '../../../auth/hooks/useAuth'
import { requestPatientRecalibration } from '../services/calibration/patientCalibrationService'
import { isPatientTrackingBlocked, usePatientModeStore } from '../stores/patientModeStore'
import type { CalibrationTrackingStatus } from '../../../../types/calibration'

const responsiveStyle = `
  .patient-tracking-guard-shell {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(320px, 0.96fr) minmax(220px, 1fr);
    width: 100%;
    height: 100%;
  }

  .patient-tracking-guard-action {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 960px) {
    .patient-tracking-guard-shell {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(112px, 0.9fr) minmax(0, 1.4fr) minmax(112px, 0.9fr);
    }
  }
`

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1160,
  backgroundColor: '#d8a569',
}

const actionPanelStyle: CSSProperties = {
  border: 'none',
  backgroundColor: 'transparent',
  color: '#ffffff',
  fontSize: 'clamp(2rem, 4vw, 3.2rem)',
  fontWeight: 900,
  lineHeight: 1.08,
  letterSpacing: '-0.05em',
  cursor: 'pointer',
  padding: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}

const centerPanelStyle: CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(248, 246, 243, 0.99) 0%, rgba(245, 241, 236, 0.99) 100%)',
  borderLeft: '2px solid rgba(148, 186, 235, 0.9)',
  borderRight: '2px solid rgba(148, 186, 235, 0.9)',
  padding: 'clamp(28px, 5vw, 52px) clamp(28px, 4vw, 44px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const centerContentStyle: CSSProperties = {
  width: '100%',
  maxWidth: '420px',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#9d7447',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const titleStyle: CSSProperties = {
  margin: '14px 0 0',
  color: '#37373d',
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  fontWeight: 900,
  lineHeight: 1.12,
  letterSpacing: '-0.06em',
  wordBreak: 'keep-all',
}

const bodyStyle: CSSProperties = {
  margin: '20px 0 0',
  color: '#73737b',
  fontSize: 'clamp(1rem, 1.8vw, 1.12rem)',
  fontWeight: 700,
  lineHeight: 1.75,
  wordBreak: 'keep-all',
}

function getWarningCopy(status: CalibrationTrackingStatus) {
  if (status === 'face-not-detected') {
    return {
      title: '시선 추적이 불안정해 입력을 잠시 멈췄습니다.',
      description:
        '얼굴이 프레임을 벗어났거나 카메라가 눈동자를 안정적으로 읽지 못하고 있습니다. 새로고침으로 다시 연결하거나 재캘리브레이션으로 추적 기준점을 다시 맞춰주세요.',
    }
  }

  return {
    title: '시선 추적이 불안정해 입력을 잠시 멈췄습니다.',
    description:
      'dwell 입력과 글로벌 메뉴 선택이 모두 차단된 상태입니다. 재캘리브레이션으로 추적 기준점을 다시 맞춰주세요.',
  }
}

export default function PatientTrackingGuardOverlay() {
  const navigate = useNavigate()
  const { user, clearPatientPostAuth } = useAuth()
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const isGlobalMenuTrackingBypassed = usePatientModeStore(
    state => state.isGlobalMenuTrackingBypassed,
  )
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)

  if (
    !isPatientTrackingBlocked(trackingStatus) ||
    (isGlobalMenuOpen && isGlobalMenuTrackingBypassed)
  ) {
    return null
  }

  const warningCopy = getWarningCopy(trackingStatus)

  const handleRefresh = () => {
    closeGlobalMenu()
    window.location.reload()
  }

  const handleRecalibration = () => {
    closeGlobalMenu()
    clearPatientPostAuth()
    requestPatientRecalibration(user)
    navigate(ROUTE_PATHS.PATIENT_CALIBRATION)
  }

  return (
    <>
      <style>{responsiveStyle}</style>
      <div
        style={overlayStyle}
        role="alertdialog"
        aria-modal="true"
        aria-label="시선 추적 안내"
      >
        <div className="patient-tracking-guard-shell">
          <button
            type="button"
            className="patient-tracking-guard-action"
            onClick={handleRefresh}
            style={actionPanelStyle}
            data-smoke-id="patient-tracking-guard-refresh"
          >
            새로고침
          </button>

          <section style={centerPanelStyle}>
            <div style={centerContentStyle}>
              <p style={eyebrowStyle}>Tracking Unavailable</p>
              <h2 style={titleStyle}>{warningCopy.title}</h2>
              <p style={bodyStyle}>{warningCopy.description}</p>
            </div>
          </section>

          <div style={actionPanelStyle} />
        </div>
      </div>
    </>
  )
}
