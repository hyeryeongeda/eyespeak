import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import {
  TALK_MAIN_MOCK_MESSAGES,
  TALK_MAIN_STATUS_LABEL,
  type MockMessage,
} from './talkMainMock'

const pageWrap: CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  padding: '16px',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const statusBar: CSSProperties = {
  flexShrink: 0,
  marginBottom: '12px',
  padding: '10px 16px',
  borderRadius: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid #dde7ed',
  fontSize: '14px',
  fontWeight: 600,
  color: '#203042',
}

const threeColLayout: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: '1fr 2fr 1fr',
  gridTemplateRows: '1fr 1fr',
  gap: '12px',
  gridTemplateAreas: `
    "left-top center right-top"
    "left-bottom center right-bottom"
  `,
}

const cardBase: CSSProperties = {
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  padding: '20px 18px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '#ffffff',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
}

const cardLeftTop: CSSProperties = {
  ...cardBase,
  gridArea: 'left-top',
  background: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
}

const cardLeftBottom: CSSProperties = {
  ...cardBase,
  gridArea: 'left-bottom',
  background: 'linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)',
}

const cardRightTop: CSSProperties = {
  ...cardBase,
  gridArea: 'right-top',
  background: 'linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)',
}

const cardRightBottom: CSSProperties = {
  ...cardBase,
  gridArea: 'right-bottom',
  background: 'linear-gradient(135deg, #f5f5f8 0%, #eef0f5 100%)',
  border: '1px solid #d4dfe7',
}

const cardTitle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1rem, 1.8vw, 1.35rem)',
  fontWeight: 700,
  color: '#203042',
  textAlign: 'center',
  lineHeight: 1.3,
}

const cardSub: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 'clamp(0.8rem, 1.2vw, 0.95rem)',
  fontWeight: 600,
  color: '#708191',
  textAlign: 'center',
}

const centerArea: CSSProperties = {
  gridArea: 'center',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  backgroundColor: '#ffffff',
  overflow: 'hidden',
}

const centerHeader: CSSProperties = {
  flexShrink: 0,
  padding: '14px 20px',
  borderBottom: '1px solid #e8eef4',
  fontSize: '15px',
  fontWeight: 700,
  color: '#203042',
}

const messageList: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const messageBubble = (role: MockMessage['role']): CSSProperties => ({
  alignSelf: role === 'caregiver' ? 'flex-start' : 'flex-end',
  maxWidth: '85%',
  padding: '12px 16px',
  borderRadius: role === 'caregiver' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.45,
  color: role === 'caregiver' ? '#203042' : '#203042',
  backgroundColor: role === 'caregiver' ? '#f2f6fa' : '#e8f0f8',
  border: '1px solid #dde7ed',
})

const messageLabel: CSSProperties = {
  marginBottom: '4px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#708191',
}

const cardHoverStyle = `
  .talk-main-card:hover { transform: scale(1.02); box-shadow: 0 24px 56px rgba(40, 66, 90, 0.16); }
  .talk-main-card:focus-visible { outline: 2px solid #5d8ec7; outline-offset: 2px; }
`

export default function TalkMainPage() {
  const navigate = useNavigate()

  return (
    <div style={pageWrap}>
      <style>{cardHoverStyle}</style>
      <div style={statusBar}>{TALK_MAIN_STATUS_LABEL.NONE}</div>

      <div className="talk-main-three-col" style={threeColLayout}>
        <button
          type="button"
          className="talk-main-card"
          style={cardLeftTop}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_BODY_MIND)}
          onKeyDown={e => e.key === 'Enter' && navigate(ROUTE_PATHS.PATIENT_BODY_MIND)}
          aria-label="몸과마음"
        >
          <h2 style={cardTitle}>몸과마음</h2>
          <p style={cardSub}>몸·마음 말하기</p>
        </button>

        <button
          type="button"
          className="talk-main-card"
          style={cardLeftBottom}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_FAVORITES)}
          onKeyDown={e => e.key === 'Enter' && navigate(ROUTE_PATHS.PATIENT_FAVORITES)}
          aria-label="즐겨찾기"
        >
          <h2 style={cardTitle}>즐겨찾기</h2>
          <p style={cardSub}>자주 쓰는 말</p>
        </button>

        <section style={centerArea} aria-label="대화 영역">
          <div style={centerHeader}>대화</div>
          <div style={messageList}>
            {TALK_MAIN_MOCK_MESSAGES.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'caregiver' ? 'flex-start' : 'flex-end' }}>
                <span style={messageLabel}>{msg.role === 'caregiver' ? '보호자' : '나의 응답'}</span>
                <div style={messageBubble(msg.role)}>{msg.text}</div>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="talk-main-card"
          style={cardRightTop}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK)}
          onKeyDown={e => e.key === 'Enter' && navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK)}
          aria-label="맞춤대화"
        >
          <h2 style={cardTitle}>맞춤대화</h2>
          <p style={cardSub}>맞춤 문장으로 말하기</p>
        </button>

        <button
          type="button"
          className="talk-main-card"
          style={cardRightBottom}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_MAIN)}
          onKeyDown={e => e.key === 'Enter' && navigate(ROUTE_PATHS.PATIENT_MAIN)}
          aria-label="뒤로가기"
        >
          <h2 style={cardTitle}>뒤로가기</h2>
          <p style={cardSub}>환자 메인으로</p>
        </button>
      </div>
    </div>
  )
}
