import type { CSSProperties } from 'react'
import usePatientGlobalMenuActionTarget from '../../../features/patient/input/hooks/usePatientGlobalMenuActionTarget'
import type { PatientChatMessage, PatientChatRouteContext } from '../../../types/chat'

interface IncomingInterruptOverlayProps {
  visible: boolean
  message: PatientChatMessage | null
  unreadCount: number
  currentRoute: PatientChatRouteContext | null
  pausedByInterrupt: boolean
  onReplyNow: () => void
  onLater: () => void
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

const messageBoxStyle: CSSProperties = {
  padding: '18px 20px',
  borderRadius: '22px',
  backgroundColor: '#f5f8fb',
  border: '1px solid #dbe4eb',
}

const messageTextStyle: CSSProperties = {
  margin: 0,
  color: '#2a3b51',
  fontSize: '20px',
  lineHeight: 1.5,
  fontWeight: 800,
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

export default function IncomingInterruptOverlay({
  visible,
  message,
  unreadCount,
  currentRoute,
  pausedByInterrupt,
  onReplyNow,
  onLater,
}: IncomingInterruptOverlayProps) {
  usePatientGlobalMenuActionTarget({
    enabled: visible && Boolean(message),
    priority: 300,
    onPositiveAction: onReplyNow,
    onNegativeAction: onLater,
  })

  if (!visible || !message) {
    return null
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="incoming-chat-title">
      <div style={panelStyle}>
        <span style={badgeStyle}>
          보호자 선발화 수신 · {currentRoute?.label ?? '현재 화면'}
          {unreadCount > 1 ? ` · 미응답 ${unreadCount}건` : ''}
        </span>
        <h2 id="incoming-chat-title" style={titleStyle}>
          지금 응답할 수 있습니다.
        </h2>
        <div style={messageBoxStyle}>
          <p style={messageTextStyle}>{message.content || '내용 없음'}</p>
        </div>
        <p style={descriptionStyle}>
          {pausedByInterrupt
            ? '재생 중 화면은 mock 기준으로 일시정지 상태로 두고 응답 인터럽트를 표시합니다.'
            : '현재 화면을 유지한 채 응답 모드로 진입하거나, 나중에 보기를 선택할 수 있습니다.'}
        </p>
        <div style={buttonRowStyle}>
          <button type="button" style={primaryButtonStyle} onClick={onReplyNow}>
            지금 응답하기
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={onLater}>
            나중에 보기
          </button>
        </div>
      </div>
    </div>
  )
}
