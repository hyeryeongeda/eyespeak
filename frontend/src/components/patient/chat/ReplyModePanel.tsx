import type { CSSProperties } from 'react'
import type {
  PatientChatFallbackState,
  PatientChatManualInputMode,
  PatientChatMessage,
  PatientChatSessionStatus,
  PatientChatSuggestionState,
  PatientSuggestedResponse,
} from '../../../types/chat'
import FallbackInputPanel from './FallbackInputPanel'
import SuggestionList from './SuggestionList'

interface ReplyModePanelProps {
  message: PatientChatMessage | null
  status: PatientChatSessionStatus
  suggestionState: PatientChatSuggestionState
  fallbackState: PatientChatFallbackState
  suggestions: PatientSuggestedResponse[]
  selectedSuggestionId: string | null
  suggestionError: string | null
  sendError: string | null
  manualInputMode: PatientChatManualInputMode | null
  manualDraft: string
  manualWordBank: string[]
  unresolvedCount: number
  timeoutMs: number
  overlay?: boolean
  onSelectSuggestion: (suggestion: PatientSuggestedResponse) => void
  onRetrySuggestions: () => void
  onOpenManualInputSelect: () => void
  onSelectManualInputMode: (mode: PatientChatManualInputMode) => void
  onDraftChange: (draft: string) => void
  onAppendWord: (word: string) => void
  onClearDraft: () => void
  onSendManualReply: () => void
  onDefer: () => void
  onClose: () => void
  onOpenLatestPendingReply: () => void
}

const overlayWrapStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: '20px',
  backgroundColor: 'rgba(24, 38, 56, 0.22)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
}

const panelStyle: CSSProperties = {
  width: 'min(760px, 100%)',
  maxHeight: 'min(92dvh, 940px)',
  overflow: 'auto',
  padding: '24px',
  borderRadius: '28px',
  backgroundColor: 'rgba(255, 255, 255, 0.97)',
  border: '1px solid #d8e2ea',
  boxShadow: '0 30px 64px rgba(53, 71, 95, 0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#213247',
  fontSize: 'clamp(1.4rem, 2.4vw, 2rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  padding: '8px 14px',
  borderRadius: '999px',
  backgroundColor: '#eef5ff',
  color: '#6580a4',
  fontSize: '13px',
  fontWeight: 800,
}

const guardianBoxStyle: CSSProperties = {
  padding: '18px 20px',
  borderRadius: '22px',
  backgroundColor: '#f5f8fb',
  border: '1px solid #dae4eb',
}

const guardianLabelStyle: CSSProperties = {
  margin: '0 0 8px',
  color: '#7b8a9f',
  fontSize: '12px',
  fontWeight: 800,
}

const guardianTextStyle: CSSProperties = {
  margin: 0,
  color: '#23354b',
  fontSize: '20px',
  lineHeight: 1.5,
  fontWeight: 800,
}

const statusTextStyle: CSSProperties = {
  margin: 0,
  color: '#63748a',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1.55,
}

const sectionCardStyle: CSSProperties = {
  padding: '18px',
  borderRadius: '20px',
  backgroundColor: '#fbfdff',
  border: '1px solid #dbe4eb',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: '#243246',
  fontSize: '16px',
  fontWeight: 900,
}

const loadingBoxStyle: CSSProperties = {
  padding: '18px',
  borderRadius: '18px',
  backgroundColor: '#f6f9fc',
  border: '1px solid #dce5ed',
  color: '#677a90',
  fontSize: '14px',
  fontWeight: 700,
}

const errorTextStyle: CSSProperties = {
  margin: 0,
  color: '#c04d4d',
  fontSize: '14px',
  fontWeight: 800,
}

const actionRowStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const buttonBaseStyle: CSSProperties = {
  minWidth: '120px',
  height: '48px',
  padding: '0 18px',
  borderRadius: '999px',
  border: '1px solid #ccd8e2',
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

function getStatusCopy(
  status: PatientChatSessionStatus,
  timeoutMs: number,
  unresolvedCount: number,
) {
  switch (status) {
    case 'suggestion_loading':
      return `보호자 메시지를 바탕으로 추천 응답을 생성 중입니다. dev 기준 ${Math.round(timeoutMs / 1000)}초 안에 입력이 없으면 복귀합니다.`
    case 'suggestion_failed':
      return '추천 응답 생성에 실패했습니다. 직접 입력이나 단어 조합으로 바로 전환할 수 있습니다.'
    case 'manual_input_select':
      return '추천 응답이 맞지 않으면 대체 입력 방식을 선택하세요.'
    case 'manual_input_typing':
      return '직접 입력 또는 단어 조합으로 응답을 작성 중입니다.'
    case 'sending':
      return '중복 전송을 막기 위해 현재 응답을 잠금 상태로 전송 중입니다.'
    case 'sent':
      return '응답 전송이 완료되었습니다. 대화 세션은 계속 유지됩니다.'
    case 'send_failed':
      return '응답 전송에 실패했습니다. 재전송하거나 대체 입력으로 다시 보낼 수 있습니다.'
    case 'conversation_active':
      return unresolvedCount > 0
        ? `대화 세션이 유지 중입니다. 아직 미응답 메시지 ${unresolvedCount}건이 남아 있습니다.`
        : '대화 세션이 유지 중입니다. 다음 보호자 메시지를 계속 받을 수 있습니다.'
    default:
      return '추천 응답을 선택하거나 직접 입력으로 응답할 수 있습니다.'
  }
}

export default function ReplyModePanel({
  message,
  status,
  suggestionState,
  fallbackState,
  suggestions,
  selectedSuggestionId,
  suggestionError,
  sendError,
  manualInputMode,
  manualDraft,
  manualWordBank,
  unresolvedCount,
  timeoutMs,
  overlay = false,
  onSelectSuggestion,
  onRetrySuggestions,
  onOpenManualInputSelect,
  onSelectManualInputMode,
  onDraftChange,
  onAppendWord,
  onClearDraft,
  onSendManualReply,
  onDefer,
  onClose,
  onOpenLatestPendingReply,
}: ReplyModePanelProps) {
  if (!message) {
    return null
  }

  const isSending = status === 'sending'
  const content = (
    <section style={panelStyle}>
      <div style={headerRowStyle}>
        <div>
          <span style={badgeStyle}>응답 모드 · 미응답 {unresolvedCount}건</span>
          <h2 style={titleStyle}>보호자 메시지에 응답합니다.</h2>
        </div>
        <div style={actionRowStyle}>
          <button type="button" style={buttonBaseStyle} onClick={onDefer}>
            나중에 보기
          </button>
          <button type="button" style={buttonBaseStyle} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      <div style={guardianBoxStyle}>
        <p style={guardianLabelStyle}>보호자 원문</p>
        <p style={guardianTextStyle}>{message.content || '내용 없음'}</p>
      </div>

      <p style={statusTextStyle}>{getStatusCopy(status, timeoutMs, unresolvedCount)}</p>

      <section style={sectionCardStyle}>
        <h3 style={sectionTitleStyle}>추천 응답</h3>
        {suggestionState === 'loading' ? (
          <div style={loadingBoxStyle}>추천 응답을 생성 중입니다...</div>
        ) : null}
        {suggestionState === 'ready' && suggestions.length > 0 ? (
          <SuggestionList
            suggestions={suggestions}
            selectedSuggestionId={selectedSuggestionId}
            disabled={isSending}
            onSelect={onSelectSuggestion}
          />
        ) : null}
        {suggestionState === 'failed' ? (
          <>
            <p style={errorTextStyle}>{suggestionError}</p>
            <div style={actionRowStyle}>
              <button type="button" style={buttonBaseStyle} onClick={onRetrySuggestions}>
                추천 다시 시도
              </button>
              <button type="button" style={primaryButtonStyle} onClick={onOpenManualInputSelect}>
                직접 입력으로 전환
              </button>
            </div>
          </>
        ) : null}
        {sendError && fallbackState !== 'manual_input_typing' ? (
          <p style={errorTextStyle}>{sendError}</p>
        ) : null}
      </section>

      <section style={sectionCardStyle}>
        <h3 style={sectionTitleStyle}>대체 입력</h3>
        <FallbackInputPanel
          manualInputMode={manualInputMode}
          manualDraft={manualDraft}
          wordBank={manualWordBank}
          disabled={isSending}
          error={fallbackState === 'send_failed' ? sendError : null}
          onSelectMode={onSelectManualInputMode}
          onDraftChange={onDraftChange}
          onAppendWord={onAppendWord}
          onClearDraft={onClearDraft}
          onSend={onSendManualReply}
        />
        {(fallbackState === 'manual_input_select' || fallbackState === 'manual_input_typing') &&
        suggestionState !== 'loading' ? (
          <button type="button" style={buttonBaseStyle} onClick={onRetrySuggestions}>
            추천 응답으로 복귀
          </button>
        ) : (
          <button type="button" style={buttonBaseStyle} onClick={onOpenManualInputSelect}>
            단어 조합 / 직접 입력 열기
          </button>
        )}
      </section>

      {unresolvedCount > 1 ? (
        <div style={actionRowStyle}>
          <button type="button" style={primaryButtonStyle} onClick={onOpenLatestPendingReply}>
            다음 미응답 보기
          </button>
        </div>
      ) : null}
    </section>
  )

  if (!overlay) {
    return content
  }

  return <div style={overlayWrapStyle}>{content}</div>
}
