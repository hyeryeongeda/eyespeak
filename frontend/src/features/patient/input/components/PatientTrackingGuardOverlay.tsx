import { type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { useAuth } from '../../../auth/hooks/useAuth'
import { requestPatientRecalibration } from '../services/calibration/patientCalibrationService'
import { isPatientTrackingBlocked, usePatientModeStore } from '../stores/patientModeStore'
import type { CalibrationTrackingStatus } from '../../../../types/calibration'

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1160,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  backgroundColor: 'rgba(18, 26, 38, 0.56)',
  backdropFilter: 'blur(8px)',
}

const cardStyle: CSSProperties = {
  width: 'min(560px, 100%)',
  padding: '28px',
  borderRadius: '28px',
  background:
    'linear-gradient(180deg, rgba(255, 252, 249, 0.98) 0%, rgba(248, 245, 241, 0.98) 100%)',
  boxShadow: '0 28px 56px rgba(10, 16, 26, 0.28)',
  boxSizing: 'border-box',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#8c6138',
  fontSize: '13px',
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const titleStyle: CSSProperties = {
  margin: '12px 0 0',
  color: '#2c2f35',
  fontSize: 'clamp(1.75rem, 4vw, 2.2rem)',
  fontWeight: 900,
  lineHeight: 1.1,
  letterSpacing: '-0.04em',
}

const bodyStyle: CSSProperties = {
  margin: '14px 0 0',
  color: '#5d646f',
  fontSize: '16px',
  fontWeight: 700,
  lineHeight: 1.55,
}

const buttonStyle: CSSProperties = {
  marginTop: '22px',
  minHeight: '52px',
  padding: '0 18px',
  border: 'none',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #efb370 0%, #e59358 100%)',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 16px 30px rgba(191, 119, 63, 0.24)',
}

function getWarningCopy(status: CalibrationTrackingStatus) {
  if (status === 'face-not-detected') {
    return {
      title: '얼굴이 감지되지 않아 입력을 잠시 멈췄습니다.',
      description:
        '얼굴을 화면 중앙에 맞춘 뒤 다시 시도해주세요. 입력이 계속 불안정하면 재캘리브레이션을 진행해야 합니다.',
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
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)

  if (!isPatientTrackingBlocked(trackingStatus)) {
    return null
  }

  const warningCopy = getWarningCopy(trackingStatus)

  const handleRecalibration = () => {
    closeGlobalMenu()
    clearPatientPostAuth()
    requestPatientRecalibration(user)
    navigate(ROUTE_PATHS.PATIENT_CALIBRATION)
  }

  return (
    <div style={overlayStyle} role="alertdialog" aria-modal="true" aria-label="추적 상태 경고">
      <section style={cardStyle}>
        <p style={eyebrowStyle}>Tracking Unavailable</p>
        <h2 style={titleStyle}>{warningCopy.title}</h2>
        <p style={bodyStyle}>{warningCopy.description}</p>
        <button
          type="button"
          data-smoke-id="patient-tracking-guard-recalibrate"
          onClick={handleRecalibration}
          style={buttonStyle}
        >
          재캘리브레이션 다시 하기
        </button>
      </section>
    </div>
  )
}
