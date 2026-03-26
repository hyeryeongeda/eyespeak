import type { CSSProperties } from 'react'
import usePatientGlobalMenuActionTarget from '../../../features/patient/input/hooks/usePatientGlobalMenuActionTarget'

interface LeisureReplyReturnOverlayProps {
  visible: boolean
  onReturnToLeisure: () => void
  onReturnToMain: () => void
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background:
    'linear-gradient(180deg, rgba(239, 245, 251, 0.82) 0%, rgba(228, 236, 246, 0.88) 100%)',
  backdropFilter: 'blur(10px)',
  zIndex: 1135,
}

const panelStyle: CSSProperties = {
  width: 'min(760px, 100%)',
  borderRadius: '30px',
  padding: '32px 28px',
  background:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 253, 0.96) 100%)',
  border: '1px solid rgba(212, 225, 236, 0.96)',
  boxShadow: '0 24px 56px rgba(60, 80, 104, 0.16)',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#213244',
  fontSize: 'clamp(1.8rem, 2.8vw, 2.3rem)',
  fontWeight: 900,
  lineHeight: 1.3,
  letterSpacing: '-0.03em',
  textAlign: 'center',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#66788f',
  fontSize: 'clamp(1rem, 1.5vw, 1.1rem)',
  fontWeight: 700,
  lineHeight: 1.6,
  textAlign: 'center',
}

const actionRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
}

const actionButtonBaseStyle: CSSProperties = {
  appearance: 'none',
  borderRadius: '24px',
  padding: '26px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  cursor: 'pointer',
  border: '1px solid rgba(214, 222, 232, 0.96)',
  backgroundColor: '#ffffff',
  boxShadow: '0 16px 34px rgba(41, 57, 79, 0.08)',
}

const leisureButtonStyle: CSSProperties = {
  ...actionButtonBaseStyle,
  background: 'linear-gradient(180deg, #eff7f0 0%, #ebf8f6 100%)',
}

const mainButtonStyle: CSSProperties = {
  ...actionButtonBaseStyle,
  background: 'linear-gradient(180deg, #f7f8fc 0%, #edf1f7 100%)',
}

const actionTitleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.5rem, 2.2vw, 1.9rem)',
  fontWeight: 900,
  lineHeight: 1.3,
}

const actionDescriptionStyle: CSSProperties = {
  margin: 0,
  color: '#687b91',
  fontSize: '0.98rem',
  fontWeight: 700,
  lineHeight: 1.5,
}

const buttonCss = `
  .leisure-reply-return-button:hover,
  .leisure-reply-return-button:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 20px 42px rgba(53, 77, 103, 0.14);
    outline: none;
  }

  @media (max-width: 720px) {
    .leisure-reply-return-actions {
      grid-template-columns: 1fr !important;
    }
  }
`

export default function LeisureReplyReturnOverlay({
  visible,
  onReturnToLeisure,
  onReturnToMain,
}: LeisureReplyReturnOverlayProps) {
  usePatientGlobalMenuActionTarget({
    enabled: visible,
    priority: 340,
    onPositiveAction: onReturnToLeisure,
    onNegativeAction: onReturnToMain,
  })

  if (!visible) {
    return null
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="reply-return-title">
      <style>{buttonCss}</style>
      <div style={panelStyle}>
        <h2 id="reply-return-title" style={titleStyle}>
          답변을 보냈어요. 어디로 돌아갈까요?
        </h2>
        <p style={descriptionStyle}>
          지금 보고 있던 여가 화면으로 이어서 돌아가거나 메인 화면으로 이동할 수 있어요.
        </p>

        <div className="leisure-reply-return-actions" style={actionRowStyle}>
          <button
            type="button"
            className="leisure-reply-return-button"
            style={leisureButtonStyle}
            onClick={onReturnToLeisure}
          >
            <p style={actionTitleStyle}>여가로 돌아가기</p>
            <p style={actionDescriptionStyle}>현재 여가 화면과 재생 상태를 그대로 이어서 봅니다.</p>
          </button>

          <button
            type="button"
            className="leisure-reply-return-button"
            style={mainButtonStyle}
            onClick={onReturnToMain}
          >
            <p style={actionTitleStyle}>메인 화면으로 돌아가기</p>
            <p style={actionDescriptionStyle}>환자 메인 화면으로 이동합니다.</p>
          </button>
        </div>
      </div>
    </div>
  )
}
