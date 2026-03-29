import type { CSSProperties } from 'react'
import type { PatientSuggestedResponse } from '../../../types/chat'

interface SuggestionListProps {
  suggestions: PatientSuggestedResponse[]
  disabled?: boolean
  selectedSuggestionId?: string | null
  onSelect: (suggestion: PatientSuggestedResponse) => void
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '10px',
}

function getButtonStyle(selected: boolean): CSSProperties {
  return {
    minHeight: '76px',
    padding: '14px 16px',
    borderRadius: '18px',
    border: selected ? '2px solid #5f8cc9' : '1px solid #d7e2ea',
    background: selected ? 'linear-gradient(135deg, #eaf3ff 0%, #dbeaff 100%)' : '#ffffff',
    color: '#243246',
    fontSize: '18px',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: selected ? '0 12px 24px rgba(95, 140, 201, 0.18)' : 'none',
  }
}

const sourceTextStyle: CSSProperties = {
  display: 'block',
  marginTop: '6px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#7b8a9f',
}

export default function SuggestionList({
  suggestions,
  disabled = false,
  selectedSuggestionId = null,
  onSelect,
}: SuggestionListProps) {
  return (
    <div style={gridStyle}>
      {suggestions.map(suggestion => (
        <button
          key={suggestion.id}
          type="button"
          disabled={disabled}
          style={getButtonStyle(selectedSuggestionId === suggestion.id)}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion.label}
          <span style={sourceTextStyle}>
            {suggestion.source === 'rule'
              ? '규칙 기반'
              : suggestion.source === 'context'
                ? '문맥 반영'
                : '기본 fallback'}
          </span>
        </button>
      ))}
    </div>
  )
}
