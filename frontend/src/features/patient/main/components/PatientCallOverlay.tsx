import type { CSSProperties } from 'react'
import type { PatientCallFlowStatus } from '../../../../types/patientCall'

interface PatientCallOverlayProps {
  status: PatientCallFlowStatus
  message?: string
}

const overlayBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(206, 233, 174, 0.56)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 1000,
}

const overlayPanelStyle: CSSProperties = {
  width: '100%',
  maxWidth: '620px',
  padding: '36px 32px',
  borderRadius: '32px',
  backgroundColor: 'rgba(255, 255, 255, 0.86)',
  border: '1px solid rgba(206, 221, 194, 0.9)',
  boxShadow: '0 28px 70px rgba(67, 82, 61, 0.16)',
  textAlign: 'center',
}

const statusTextStyle: CSSProperties = {
  margin: '0 0 16px',
  color: '#6d7f64',
  fontSize: '15px',
  fontWeight: 800,
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#2d384f',
  fontSize: 'clamp(2rem, 4vw, 3.25rem)',
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: '-0.03em',
}

const descriptionStyle: CSSProperties = {
  margin: '16px 0 0',
  color: '#5b6c83',
  fontSize: '18px',
  lineHeight: 1.55,
  fontWeight: 600,
}

const spinnerStyle: CSSProperties = {
  width: '52px',
  height: '52px',
  margin: '4px auto 18px',
  borderRadius: '50%',
  border: '5px solid rgba(109, 145, 214, 0.22)',
  borderTopColor: '#6d91d6',
  animation: 'patient-call-spin 0.9s linear infinite',
}

const animationStyle = `
  @keyframes patient-call-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`

function getOverlayCopy(status: PatientCallFlowStatus, message?: string) {
  if (status === 'requesting') {
    return {
      label: '호출 전송 중',
      title: '보호자를 호출하는 중입니다.',
      description: '잠시만 기다려 주세요.',
    }
  }

  return {
    label: '호출 완료',
    title: message ?? '보호자에게 호출 신호가 전송되었습니다.',
    description: '잠시 후 메인 화면으로 돌아갑니다.',
  }
}

export default function PatientCallOverlay({ status, message }: PatientCallOverlayProps) {
  const copy = getOverlayCopy(status, message)

  return (
    <div style={overlayBackdropStyle} role="dialog" aria-modal="true" aria-labelledby="patient-call-title">
      <style>{animationStyle}</style>
      <div style={overlayPanelStyle}>
        <p style={statusTextStyle}>{copy.label}</p>
        {status === 'requesting' ? <div style={spinnerStyle} aria-hidden="true" /> : null}
        <h2 id="patient-call-title" style={titleStyle}>
          {copy.title}
        </h2>
        <p style={descriptionStyle}>{copy.description}</p>
      </div>
    </div>
  )
}
