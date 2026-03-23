import type { CSSProperties } from 'react'
import usePatientGlobalMenuActionTarget from '../../../features/patient/input/hooks/usePatientGlobalMenuActionTarget'

interface ReturnToLeisureOverlayProps {
  visible: boolean
  onReturnToLeisure: () => void
  onStayInChat: () => void
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: '24px',
  backgroundColor: 'rgba(24, 38, 56, 0.3)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
}

const panelStyle: CSSProperties = {
  width: 'min(680px, 100%)',
  padding: '28px',
  borderRadius: '28px',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  border: '1px solid #d9e3eb',
  boxShadow: '0 30px 64px rgba(53, 71, 95, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  padding: '8px 14px',
  borderRadius: '999px',
  backgroundColor: '#eef5ff',
  color: '#5f7fae',
  fontSize: '13px',
  fontWeight: 800,
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#223247',
  fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#66778d',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: 1.55,
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

const buttonBaseStyle: CSSProperties = {
  minWidth: '148px',
  height: '54px',
  padding: '0 20px',
  borderRadius: '999px',
  fontSize: '16px',
  fontWeight: 800,
  cursor: 'pointer',
}

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid #5f8cc9',
  background: 'linear-gradient(135deg, #e8f2ff 0%, #dbe9ff 100%)',
  color: '#23364c',
}

const secondaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid #d3dde7',
  backgroundColor: '#ffffff',
  color: '#3a4d66',
}

export default function ReturnToLeisureOverlay({
  visible,
  onReturnToLeisure,
  onStayInChat,
}: ReturnToLeisureOverlayProps) {
  usePatientGlobalMenuActionTarget({
    enabled: visible,
    priority: 310,
    onPositiveAction: onReturnToLeisure,
    onNegativeAction: onStayInChat,
  })

  if (!visible) {
    return null
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="return-to-leisure-title">
      <div style={panelStyle}>
        <span style={badgeStyle}>채팅 응답 완료</span>
        <h2 id="return-to-leisure-title" style={titleStyle}>
          다시 여가를 즐기러 가시겠습니까?
        </h2>
        <p style={descriptionStyle}>
          보던 영상은 저장된 위치부터 다시 재생됩니다. 채팅을 이어가려면 계속 채팅을 선택하세요.
        </p>
        <div style={buttonRowStyle}>
          <button type="button" style={primaryButtonStyle} onClick={onReturnToLeisure}>
            다시 여가 즐기기
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={onStayInChat}>
            계속 채팅하기
          </button>
        </div>
      </div>
    </div>
  )
}
