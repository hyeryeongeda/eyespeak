import type { CSSProperties } from 'react'
import type { PatientChatPresetKey } from '../../../services/mockPatientChatService'
import type { PatientChatSendOutcome } from '../../../types/chat'

interface DevChatTriggerPanelProps {
  availablePresets: Array<{ key: PatientChatPresetKey; label: string }>
  nextSendOutcome: PatientChatSendOutcome
  timeoutMs: number
  unreadCount: number
  lastEventLabel: string
  onTriggerPreset: (presetKey: PatientChatPresetKey) => void
  onTriggerDuplicate: () => void
  onSetNextSendOutcome: (outcome: PatientChatSendOutcome) => void
}

const wrapStyle: CSSProperties = {
  position: 'fixed',
  right: '16px',
  bottom: '16px',
  width: 'min(320px, calc(100vw - 32px))',
  padding: '14px',
  borderRadius: '20px',
  backgroundColor: 'rgba(20, 32, 48, 0.9)',
  border: '1px solid rgba(116, 145, 180, 0.36)',
  boxShadow: '0 20px 42px rgba(13, 24, 38, 0.3)',
  color: '#eff6ff',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  zIndex: 1200,
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '14px',
  fontWeight: 900,
}

const helperTextStyle: CSSProperties = {
  margin: 0,
  color: '#c9d7e7',
  fontSize: '12px',
  lineHeight: 1.45,
  fontWeight: 600,
}

const buttonGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '8px',
}

const buttonStyle: CSSProperties = {
  minHeight: '40px',
  padding: '8px 10px',
  borderRadius: '12px',
  border: '1px solid rgba(182, 205, 229, 0.3)',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: '#eff6ff',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
}

const statusBadgeStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: '#d8e5f5',
  fontSize: '12px',
  fontWeight: 700,
  width: 'fit-content',
}

export default function DevChatTriggerPanel({
  availablePresets,
  nextSendOutcome,
  timeoutMs,
  unreadCount,
  lastEventLabel,
  onTriggerPreset,
  onTriggerDuplicate,
  onSetNextSendOutcome,
}: DevChatTriggerPanelProps) {
  return (
    <aside style={wrapStyle} aria-label="환자 채팅 dev panel">
      <h2 style={titleStyle}>PAT chat dev panel</h2>
      <p style={helperTextStyle}>
        현재 미응답 {unreadCount}건 · 무응답 타임아웃 {Math.round(timeoutMs / 1000)}초
      </p>
      <p style={statusBadgeStyle}>최근 이벤트: {lastEventLabel}</p>

      <div style={buttonGridStyle}>
        {availablePresets
          .filter(preset =>
            ['water', 'pain', 'suggestion_failure', 'empty_suggestion'].includes(preset.key),
          )
          .map(preset => (
            <button
              key={preset.key}
              type="button"
              style={buttonStyle}
              onClick={() => onTriggerPreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
        <button type="button" style={buttonStyle} onClick={() => onTriggerPreset('okay')}>
          STT 수신
        </button>
        <button type="button" style={buttonStyle} onClick={() => onTriggerPreset('breathing')}>
          인터럽트 테스트
        </button>
        <button type="button" style={buttonStyle} onClick={() => onTriggerPreset('invalid_content')}>
          빈 메시지
        </button>
        <button type="button" style={buttonStyle} onClick={onTriggerDuplicate}>
          중복 수신
        </button>
      </div>

      <div style={buttonGridStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => onSetNextSendOutcome('success')}
        >
          다음 전송 성공
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => onSetNextSendOutcome('failure')}
        >
          다음 전송 실패
        </button>
      </div>

      <p style={helperTextStyle}>
        다음 전송 결과: {nextSendOutcome === 'auto' ? '기본 성공' : nextSendOutcome}
      </p>
    </aside>
  )
}
