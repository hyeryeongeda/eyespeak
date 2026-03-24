import type { CSSProperties } from 'react'
import usePatientGlobalMenuActionTarget from '../../../features/patient/input/hooks/usePatientGlobalMenuActionTarget'
import type {
  PatientChatFallbackState,
  PatientChatManualInputMode,
  PatientChatMessage,
  PatientChatSessionStatus,
  PatientChatSuggestionState,
  PatientSuggestedResponse,
} from '../../../types/chat'

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

type SuggestionCard = {
  id: string
  label: string
  suggestion: PatientSuggestedResponse
  disabled?: boolean
}

const overlayWrapStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: 'clamp(12px, 2vw, 24px)',
  background:
    'linear-gradient(180deg, rgba(245, 247, 252, 0.9) 0%, rgba(232, 236, 244, 0.92) 100%)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'center',
  zIndex: 1120,
}

const panelStyle: CSSProperties = {
  width: 'min(1100px, 100%)',
  minHeight: '100%',
  padding: 'clamp(18px, 2.8vw, 32px)',
  borderRadius: '34px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  boxShadow: '0 28px 60px rgba(53, 71, 95, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
  boxSizing: 'border-box',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px',
  flexWrap: 'wrap',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#b6b8bf',
  fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
  fontWeight: 700,
}

const metaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 14px',
  borderRadius: '999px',
  backgroundColor: '#eef3fb',
  color: '#6b7e9d',
  fontSize: '14px',
  fontWeight: 800,
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'minmax(160px, 1fr) auto minmax(160px, 1fr)',
  gap: '14px',
}

const cardBaseStyle: CSSProperties = {
  borderRadius: '22px',
  border: '1px solid #d6dee8',
  backgroundColor: '#ffffff',
  boxShadow: '0 10px 28px rgba(41, 57, 79, 0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  textAlign: 'center',
  boxSizing: 'border-box',
}

function getSuggestionCardStyle(selected: boolean, disabled: boolean): CSSProperties {
  return {
    ...cardBaseStyle,
    appearance: 'none',
    cursor: disabled ? 'default' : 'pointer',
    color: '#131313',
    fontSize: 'clamp(2rem, 4vw, 3.2rem)',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    opacity: disabled ? 0.58 : 1,
    border: selected ? '2px solid #7e9dcc' : cardBaseStyle.border,
    background: selected ? 'linear-gradient(180deg, #f6faff 0%, #ebf3ff 100%)' : '#ffffff',
    transform: selected ? 'translateY(-2px)' : 'none',
  }
}

const guardianMessageWrapStyle: CSSProperties = {
  ...cardBaseStyle,
  gridColumn: '1 / -1',
  minHeight: '96px',
  alignItems: 'stretch',
  justifyContent: 'center',
  padding: '0 20px',
  backgroundColor: '#fbfcff',
}

const guardianMessageStyle: CSSProperties = {
  margin: 0,
  color: '#39445b',
  fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
  fontWeight: 800,
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
  minHeight: '100%',
}

const infoTextStyle: CSSProperties = {
  margin: 0,
  color: '#6d788c',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

const helperButtonStyle: CSSProperties = {
  ...cardBaseStyle,
  appearance: 'none',
  cursor: 'pointer',
  color: '#151515',
  fontSize: 'clamp(1.9rem, 3.6vw, 3rem)',
  fontWeight: 900,
  letterSpacing: '-0.04em',
}

const refreshButtonStyle: CSSProperties = {
  ...helperButtonStyle,
  backgroundColor: '#ffffff',
}

const backButtonStyle: CSSProperties = {
  ...helperButtonStyle,
  backgroundColor: '#ffffff',
}

const fallbackButtonStyle: CSSProperties = {
  ...helperButtonStyle,
  backgroundColor: '#ffffff',
}

const inlineWrapStyle: CSSProperties = {
  width: '100%',
}

const defaultQuickReplyLabels = ['왜?', '응', '아니', '모르겠어']

function buildSuggestionCards(
  message: PatientChatMessage,
  suggestions: PatientSuggestedResponse[],
): SuggestionCard[] {
  const cards: SuggestionCard[] = suggestions.slice(0, 4).map(suggestion => ({
    id: suggestion.id,
    label: suggestion.label,
    suggestion,
    disabled: false,
  }))

  if (cards.length >= 4) {
    return cards
  }

  const usedLabels = new Set(cards.map(card => card.label))

  while (cards.length < 4) {
    const fallbackLabel =
      defaultQuickReplyLabels.find(label => !usedLabels.has(label)) ??
      defaultQuickReplyLabels[cards.length] ??
      '모르겠어'

    usedLabels.add(fallbackLabel)

    cards.push({
      id: `${message.id}-fallback-${cards.length + 1}`,
      label: fallbackLabel,
      disabled: false,
      suggestion: {
        id: `${message.id}-fallback-${cards.length + 1}`,
        label: fallbackLabel,
        intentKey: 'fallback',
        source: 'fallback',
        rank: cards.length + 1,
      },
    })
  }

  return cards
}

function getStatusCopy(
  suggestionState: PatientChatSuggestionState,
  suggestionError: string | null,
  sendError: string | null,
  timeoutMs: number,
) {
  if (sendError) {
    return sendError
  }

  if (suggestionState === 'failed') {
    return suggestionError ?? '추천 응답을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요.'
  }

  if (suggestionState === 'loading') {
    return `추천 응답을 준비 중입니다. ${Math.round(timeoutMs / 1000)}초 동안 입력이 없으면 이전 상태로 복귀합니다.`
  }

  return '추천 응답을 바로 선택하거나 새로고침으로 다시 받을 수 있습니다.'
}

export default function ReplyModePanel(props: ReplyModePanelProps) {
  const {
    message,
    status,
    suggestionState,
    suggestions,
    selectedSuggestionId,
    suggestionError,
    sendError,
    unresolvedCount,
    timeoutMs,
    overlay = false,
    onSelectSuggestion,
    onRetrySuggestions,
    onClose,
  } = props

  const isSending = status === 'sending'
  const suggestionCards = message
    ? buildSuggestionCards(message, suggestions)
    : []
  const topCards = suggestionCards.slice(0, 3)
  const bottomSuggestionCard = suggestionCards[3] ?? null
  const statusCopy = getStatusCopy(suggestionState, suggestionError, sendError, timeoutMs)

  usePatientGlobalMenuActionTarget({
    enabled: overlay,
    priority: 320,
    onPositiveAction:
      !isSending && topCards[0] && suggestionState !== 'loading'
        ? () => onSelectSuggestion(topCards[0].suggestion)
        : suggestionState === 'failed'
          ? onRetrySuggestions
          : undefined,
    onNegativeAction: onClose,
  })

  if (!message) {
    return null
  }

  const content = (
    <section style={panelStyle} aria-label="보호자 선발화 응답">
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>보호자 선발화</p>
          <p style={infoTextStyle}>{statusCopy}</p>
        </div>
        <span style={metaStyle}>미응답 {unresolvedCount}건</span>
      </div>

      <div style={gridStyle}>
        {topCards.map(card => (
          <button
            key={card.id}
            type="button"
            style={getSuggestionCardStyle(selectedSuggestionId === card.id, isSending || suggestionState === 'loading')}
            disabled={isSending || suggestionState === 'loading'}
            onClick={() => onSelectSuggestion(card.suggestion)}
          >
            {suggestionState === 'loading' ? '...' : card.label}
          </button>
        ))}

        <div style={guardianMessageWrapStyle}>
          <p style={guardianMessageStyle}>{message.content || '내용 없음'}</p>
        </div>

        <button
          type="button"
          style={fallbackButtonStyle}
          disabled={!bottomSuggestionCard || isSending || suggestionState === 'loading'}
          onClick={() => {
            if (bottomSuggestionCard) {
              onSelectSuggestion(bottomSuggestionCard.suggestion)
            }
          }}
        >
          {suggestionState === 'loading'
            ? '...'
            : bottomSuggestionCard?.label ?? '모르겠어'}
        </button>

        <button
          type="button"
          style={refreshButtonStyle}
          disabled={isSending}
          onClick={onRetrySuggestions}
        >
          새로고침
        </button>

        <button
          type="button"
          style={backButtonStyle}
          disabled={isSending}
          onClick={onClose}
        >
          뒤로가기
        </button>
      </div>
    </section>
  )

  if (!overlay) {
    return <div style={inlineWrapStyle}>{content}</div>
  }

  return (
    <div style={overlayWrapStyle} role="dialog" aria-modal="true" aria-labelledby="guardian-reply-title">
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} id="guardian-reply-title">
        보호자 선발화 응답
      </div>
      {content}
    </div>
  )
}
