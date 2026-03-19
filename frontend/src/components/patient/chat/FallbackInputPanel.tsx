import type { CSSProperties } from 'react'
import type { PatientChatManualInputMode } from '../../../types/chat'

interface FallbackInputPanelProps {
  manualInputMode: PatientChatManualInputMode | null
  manualDraft: string
  wordBank: string[]
  disabled?: boolean
  error?: string | null
  onSelectMode: (mode: PatientChatManualInputMode) => void
  onDraftChange: (draft: string) => void
  onAppendWord: (word: string) => void
  onClearDraft: () => void
  onSend: () => void
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const modeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px',
}

const modeButtonStyle: CSSProperties = {
  minHeight: '64px',
  padding: '14px',
  borderRadius: '16px',
  border: '1px solid #d8e1ea',
  backgroundColor: '#ffffff',
  color: '#243246',
  fontSize: '15px',
  fontWeight: 800,
  textAlign: 'left',
  cursor: 'pointer',
}

const helperTextStyle: CSSProperties = {
  margin: 0,
  color: '#6f7f94',
  fontSize: '13px',
  lineHeight: 1.5,
  fontWeight: 600,
}

const draftStyle: CSSProperties = {
  minHeight: '112px',
  padding: '12px 14px',
  borderRadius: '16px',
  border: '1px solid #d5dfe8',
  backgroundColor: '#ffffff',
  color: '#243246',
  fontSize: '15px',
  fontWeight: 600,
  resize: 'vertical',
}

const wordGridStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
}

const wordButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: '999px',
  border: '1px solid #d5dfe8',
  backgroundColor: '#ffffff',
  color: '#34465d',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
}

const actionRowStyle: CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
}

const actionButtonStyle: CSSProperties = {
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

const primaryActionStyle: CSSProperties = {
  ...actionButtonStyle,
  border: '1px solid #5f8cc9',
  background: 'linear-gradient(135deg, #e8f2ff 0%, #dbe9ff 100%)',
}

const errorTextStyle: CSSProperties = {
  margin: 0,
  color: '#c04d4d',
  fontSize: '13px',
  fontWeight: 700,
}

export default function FallbackInputPanel({
  manualInputMode,
  manualDraft,
  wordBank,
  disabled = false,
  error = null,
  onSelectMode,
  onDraftChange,
  onAppendWord,
  onClearDraft,
  onSend,
}: FallbackInputPanelProps) {
  return (
    <section style={sectionStyle}>
      {!manualInputMode ? (
        <>
          <div style={modeGridStyle}>
            <button
              type="button"
              style={modeButtonStyle}
              disabled={disabled}
              onClick={() => onSelectMode('word_combination')}
            >
              단어 조합
              <div style={helperTextStyle}>자주 쓰는 단어를 이어서 빠르게 응답</div>
            </button>
            <button
              type="button"
              style={modeButtonStyle}
              disabled={disabled}
              onClick={() => onSelectMode('keyboard')}
            >
              직접 입력
              <div style={helperTextStyle}>textarea 기반으로 자유 문장 입력</div>
            </button>
          </div>
          {error ? <p style={errorTextStyle}>{error}</p> : null}
        </>
      ) : (
        <>
          {manualInputMode === 'word_combination' ? (
            <div style={wordGridStyle}>
              {wordBank.map(word => (
                <button
                  key={word}
                  type="button"
                  style={wordButtonStyle}
                  disabled={disabled}
                  onClick={() => onAppendWord(word)}
                >
                  {word}
                </button>
              ))}
            </div>
          ) : null}

          <textarea
            value={manualDraft}
            disabled={disabled}
            style={draftStyle}
            onChange={event => onDraftChange(event.target.value)}
            placeholder={
              manualInputMode === 'keyboard'
                ? '직접 입력으로 응답을 작성하세요.'
                : '선택한 단어가 여기에 쌓입니다.'
            }
          />

          {error ? <p style={errorTextStyle}>{error}</p> : null}

          <div style={actionRowStyle}>
            <button type="button" style={actionButtonStyle} disabled={disabled} onClick={onClearDraft}>
              입력 지우기
            </button>
            <button
              type="button"
              style={primaryActionStyle}
              disabled={disabled || !manualDraft.trim()}
              onClick={onSend}
            >
              입력 응답 전송
            </button>
          </div>
        </>
      )}
    </section>
  )
}
