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

const leisureBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: 'clamp(12px, 2vw, 24px)',
  background:
    'linear-gradient(180deg, rgba(245, 248, 252, 0.94) 0%, rgba(232, 238, 247, 0.96) 100%)',
  backdropFilter: 'blur(8px)',
  zIndex: 1100,
}

const leisureLayoutStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'center',
  gap: 'clamp(12px, 2vw, 28px)',
}

const decisionPanelBaseStyle: CSSProperties = {
  flex: '1 1 0',
  minWidth: 'clamp(140px, 20vw, 220px)',
  minHeight: '100%',
  borderRadius: '18px',
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '18px',
  padding: '28px 16px',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
}

const yesPanelStyle: CSSProperties = {
  ...decisionPanelBaseStyle,
  border: '2px solid rgba(120, 181, 160, 0.9)',
  boxShadow: 'inset 0 0 0 1px rgba(205, 233, 223, 0.95)',
}

const noPanelStyle: CSSProperties = {
  ...decisionPanelBaseStyle,
  border: '2px solid rgba(205, 150, 145, 0.92)',
  boxShadow: 'inset 0 0 0 1px rgba(238, 213, 209, 0.95)',
}

const decisionLabelBaseStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.7rem, 2.4vw, 2.1rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const yesLabelStyle: CSSProperties = {
  ...decisionLabelBaseStyle,
  color: '#5d8f77',
}

const noLabelStyle: CSSProperties = {
  ...decisionLabelBaseStyle,
  color: '#9b5d58',
}

const centerPanelWrapStyle: CSSProperties = {
  flex: '0 1 370px',
  maxWidth: '370px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const centerPanelStyle: CSSProperties = {
  width: '100%',
  minHeight: '440px',
  borderRadius: '22px',
  border: '1px solid rgba(205, 217, 232, 0.96)',
  backgroundColor: 'rgba(255, 255, 255, 0.97)',
  boxShadow: '0 24px 52px rgba(77, 95, 122, 0.14)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const centerPanelHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 18px',
  borderBottom: '1px solid rgba(230, 235, 241, 0.96)',
}

const centerPanelTitleStyle: CSSProperties = {
  margin: 0,
  color: '#1d2733',
  fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)',
  fontWeight: 900,
}

const centerPanelBodyStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '32px 18px 22px',
  gap: '24px',
}

const leisureHeadlineStyle: CSSProperties = {
  margin: 0,
  color: '#111111',
  fontSize: 'clamp(1.45rem, 2.3vw, 2rem)',
  lineHeight: 1.45,
  textAlign: 'center',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const messagePreviewWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const senderLabelStyle: CSSProperties = {
  margin: 0,
  color: '#95a0b6',
  fontSize: '12px',
  fontWeight: 800,
  paddingLeft: '40px',
}

const previewBubbleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const avatarStyle: CSSProperties = {
  width: '34px',
  height: '34px',
  borderRadius: '999px',
  backgroundColor: '#eff3fa',
  color: '#9cabc2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const previewBubbleStyle: CSSProperties = {
  maxWidth: '100%',
  padding: '12px 16px',
  borderRadius: '16px',
  backgroundColor: '#f3f6fd',
  color: '#4c5970',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

const leisureFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
}

const unreadChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '32px',
  padding: '0 14px',
  borderRadius: '999px',
  backgroundColor: '#eff5ff',
  color: '#6684ad',
  fontSize: '13px',
  fontWeight: 800,
}

function MicrophoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 10.75A2.75 2.75 0 0 0 10.75 8V4.75a2.75 2.75 0 1 0-5.5 0V8A2.75 2.75 0 0 0 8 10.75Z"
        stroke="#6B87B2"
        strokeWidth="1.4"
      />
      <path
        d="M3.75 7.5a4.25 4.25 0 1 0 8.5 0"
        stroke="#6B87B2"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M8 11.75v2.5M5.5 14.25h5"
        stroke="#6B87B2"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AvatarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 9a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 9 9Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M4.5 14.25a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DecisionIcon({
  color,
  path,
}: {
  color: string
  path: string
}) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function renderIncomingInterrupt({
  message,
  unreadCount,
  pausedByInterrupt,
  onReplyNow,
  onLater,
}: Omit<IncomingInterruptOverlayProps, 'visible' | 'currentRoute'>) {
  return (
    <div
      style={leisureBackdropStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-chat-title"
    >
      <div style={leisureLayoutStyle}>
        <button
          type="button"
          style={yesPanelStyle}
          onClick={onReplyNow}
          aria-label="채팅으로 이동"
        >
          <DecisionIcon color="#5D8F77" path="M11 23.5 18.5 31 33 14" />
          <p style={yesLabelStyle}>네</p>
        </button>

        <div style={centerPanelWrapStyle}>
          <div style={centerPanelStyle}>
            <div style={centerPanelHeaderStyle}>
              <MicrophoneIcon />
              <h2 id="incoming-chat-title" style={centerPanelTitleStyle}>
                채팅알림
              </h2>
            </div>

            <div style={centerPanelBodyStyle}>
              <p style={leisureHeadlineStyle}>
                보호자에게서 문자가 왔습니다!
                <br />
                채팅으로 이동할까요?
              </p>

              <div style={messagePreviewWrapStyle}>
                <p style={senderLabelStyle}>보호자</p>
                <div style={previewBubbleRowStyle}>
                  <div style={avatarStyle}>
                    <AvatarIcon />
                  </div>
                  <div style={previewBubbleStyle}>{message?.content || '새 메시지가 도착했습니다.'}</div>
                </div>
              </div>

              <div style={leisureFooterStyle}>
                <span style={unreadChipStyle}>
                  {unreadCount > 1 ? `새 메시지 ${unreadCount}건` : '새 메시지 1건'}
                  {pausedByInterrupt ? ' · 영상 일시정지됨' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          style={noPanelStyle}
          onClick={onLater}
          aria-label="나중에 보기"
        >
          <DecisionIcon color="#9B5D58" path="M14 14 30 30M30 14 14 30" />
          <p style={noLabelStyle}>아니오</p>
        </button>
      </div>
    </div>
  )
}

export default function IncomingInterruptOverlay({
  visible,
  message,
  unreadCount,
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

  return renderIncomingInterrupt({
    message,
    unreadCount,
    pausedByInterrupt,
    onReplyNow,
    onLater,
  })
}
