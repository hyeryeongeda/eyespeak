import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import ChatMessageList from '../../../components/patient/chat/ChatMessageList'
import ReplyModePanel from '../../../components/patient/chat/ReplyModePanel'
import { usePatientIncomingChat } from '../../../hooks/patientIncomingChatContext'

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
  padding: '12px 16px',
  borderRadius: '16px',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid #dde7ed',
  fontSize: '14px',
  fontWeight: 700,
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
  fontWeight: 800,
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
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
}

const headerTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 800,
  color: '#203042',
}

const headerSubStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: '12px',
  fontWeight: 700,
  color: '#708191',
}

const inlinePanelWrapStyle: CSSProperties = {
  flexShrink: 0,
  padding: '0 18px 18px',
}

const pendingCardStyle: CSSProperties = {
  margin: '0 18px 18px',
  padding: '18px',
  borderRadius: '20px',
  border: '1px solid #dce6ed',
  backgroundColor: '#fbfdff',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const pendingTitleStyle: CSSProperties = {
  margin: 0,
  color: '#223247',
  fontSize: '17px',
  fontWeight: 900,
}

const pendingTextStyle: CSSProperties = {
  margin: 0,
  color: '#64748a',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.55,
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const buttonBaseStyle: CSSProperties = {
  minWidth: '120px',
  height: '48px',
  padding: '0 18px',
  borderRadius: '999px',
  border: '1px solid #cad7e2',
  backgroundColor: '#ffffff',
  color: '#31455e',
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
}

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid #5f8cc9',
  background: 'linear-gradient(135deg, #e8f2ff 0%, #dbe9ff 100%)',
}

const cardHoverStyle = `
  .talk-main-card:hover {
    transform: scale(1.02);
    box-shadow: 0 24px 56px rgba(40, 66, 90, 0.16);
  }

  .talk-main-card:focus-visible {
    outline: 2px solid #5d8ec7;
    outline-offset: 2px;
  }
`

const statusLabelMap = {
  idle: '대화 준비',
  waiting_message: '메시지 대기',
  receiving: '수신 중',
  received: '수신 완료',
  unread: '미응답 존재',
  incoming_interrupt: '인터럽트 표시 중',
  reply_mode: '응답 모드',
  suggestion_loading: '추천 생성 중',
  suggestion_ready: '추천 준비 완료',
  suggestion_failed: '추천 실패',
  manual_input_select: '대체 입력 선택',
  manual_input_typing: '대체 입력 작성 중',
  sending: '전송 중',
  sent: '전송 완료',
  send_failed: '전송 실패',
  conversation_active: '대화 유지 중',
  timeout: '무응답 타임아웃',
  deferred: '나중에 보기',
  restoring: '복귀 중',
  restored: '복귀 완료',
} as const

export default function TalkMainPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()

  const showInlineReplyPanel = Boolean(chat.activeReplyMessage)

  return (
    <div style={pageWrap}>
      <style>{cardHoverStyle}</style>
      <div style={statusBar}>
        {statusLabelMap[chat.state.status]} · 미응답 {chat.unreadCount}건 · {chat.state.lastEventLabel}
      </div>

      <div style={threeColLayout}>
        <button
          type="button"
          className="talk-main-card"
          style={cardLeftTop}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_BODY_MIND)}
        >
          <h2 style={cardTitle}>몸과 마음</h2>
          <p style={cardSub}>통증, 호흡, 분비물 표현으로 이동</p>
        </button>

        <button
          type="button"
          className="talk-main-card"
          style={cardLeftBottom}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_FAVORITES)}
        >
          <h2 style={cardTitle}>즐겨찾기</h2>
          <p style={cardSub}>자주 쓰는 표현 화면으로 이동</p>
        </button>

        <section style={centerArea} aria-label="환자 응답 세션">
          <div style={centerHeader}>
            <div>
              <h2 style={headerTitleStyle}>보호자 대화 세션</h2>
              <p style={headerSubStyle}>
                추천 응답, 직접 입력, 인터럽트 복귀를 이 화면에서 이어서 검증할 수 있습니다.
              </p>
            </div>
            {chat.latestUnresolvedMessage ? (
              <div style={buttonRowStyle}>
                <button type="button" style={primaryButtonStyle} onClick={chat.openLatestPendingReply}>
                  미응답 응답하기
                </button>
              </div>
            ) : null}
          </div>

          <ChatMessageList
            messages={chat.state.messages}
            activeMessageId={chat.activeReplyMessage?.id ?? chat.activeMessage?.id}
          />

          {showInlineReplyPanel ? (
            <div style={inlinePanelWrapStyle}>
              <ReplyModePanel
                message={chat.activeReplyMessage}
                status={chat.state.status}
                suggestionState={chat.state.suggestionState}
                fallbackState={chat.state.fallbackState}
                suggestions={chat.state.suggestions}
                selectedSuggestionId={chat.state.selectedSuggestionId}
                suggestionError={chat.state.suggestionError}
                sendError={chat.state.sendError}
                manualInputMode={chat.state.manualInputMode}
                manualDraft={chat.state.manualDraft}
                manualWordBank={chat.manualWordBank}
                unresolvedCount={chat.unresolvedCount}
                timeoutMs={chat.timeoutMs}
                onSelectSuggestion={chat.sendSuggestedReply}
                onRetrySuggestions={chat.retrySuggestions}
                onOpenManualInputSelect={chat.openManualInputSelect}
                onSelectManualInputMode={chat.setManualInputMode}
                onDraftChange={chat.updateManualDraft}
                onAppendWord={chat.appendManualWord}
                onClearDraft={chat.clearManualDraft}
                onSendManualReply={chat.sendManualReply}
                onDefer={chat.deferActiveMessage}
                onClose={chat.closeReplyMode}
                onOpenLatestPendingReply={chat.openLatestPendingReply}
              />
            </div>
          ) : (
            <section style={pendingCardStyle}>
              <h3 style={pendingTitleStyle}>세션 상태</h3>
              <p style={pendingTextStyle}>
                {chat.latestUnresolvedMessage
                  ? '미응답 보호자 메시지가 있습니다. 응답하기를 누르면 추천 응답과 대체 입력을 바로 사용할 수 있습니다.'
                  : '현재는 유지 중인 대화 세션만 있고, 새 보호자 메시지를 기다리는 상태입니다.'}
              </p>
              <div style={buttonRowStyle}>
                {chat.latestUnresolvedMessage ? (
                  <button type="button" style={primaryButtonStyle} onClick={chat.openLatestPendingReply}>
                    응답 패널 열기
                  </button>
                ) : null}
                <button
                  type="button"
                  style={buttonBaseStyle}
                  onClick={() => navigate(ROUTE_PATHS.PATIENT_MAIN)}
                >
                  환자 메인으로
                </button>
              </div>
            </section>
          )}
        </section>

        <button
          type="button"
          className="talk-main-card"
          style={cardRightTop}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK)}
        >
          <h2 style={cardTitle}>맞춤 문장</h2>
          <p style={cardSub}>추후 단어 조합/키보드 입력 확장 지점</p>
        </button>

        <button
          type="button"
          className="talk-main-card"
          style={cardRightBottom}
          onClick={() => navigate(ROUTE_PATHS.PATIENT_MAIN)}
        >
          <h2 style={cardTitle}>뒤로 가기</h2>
          <p style={cardSub}>환자 메인으로 복귀</p>
        </button>
      </div>
    </div>
  )
}
