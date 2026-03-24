import type { CSSProperties } from 'react'
import type { CustomTalkKeyboardOption } from '../types'

interface CustomTalkKeyboardGridProps {
  options: CustomTalkKeyboardOption[]
  canGoNext: boolean
  disabled?: boolean
  onSelectOption: (option: CustomTalkKeyboardOption) => void
  onNext: () => void
  onBack: () => void
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(148px, 1fr))',
  gap: '12px',
}

function getCellStyle(): CSSProperties {
  return {
    padding: '18px',
    borderRadius: '24px',
    border: '1px solid #dbe4eb',
    backgroundColor: '#ffffff',
    boxShadow: '0 16px 34px rgba(63, 86, 111, 0.08)',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    color: '#223247',
  }
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.4rem, 2.35vw, 1.95rem)',
  fontWeight: 900,
}

const descriptionStyle: CSSProperties = {
  margin: '10px 0 0',
  fontSize: '16px',
  fontWeight: 600,
  color: '#66788f',
  lineHeight: 1.45,
}

export default function CustomTalkKeyboardGrid({
  options,
  canGoNext,
  disabled = false,
  onSelectOption,
  onNext,
  onBack,
}: CustomTalkKeyboardGridProps) {
  const dynamicOptions = [...options]

  while (dynamicOptions.length < 4) {
    dynamicOptions.push({
      id: `empty-${dynamicOptions.length + 1}`,
      label: '대기',
      value: '',
      description: '현재 후보 없음',
      kind: 'char',
    })
  }

  const cells = [
    dynamicOptions[0],
    dynamicOptions[1],
    {
      id: 'fixed-next',
      label: '다음',
      value: 'next',
      description: canGoNext ? '다음 후보군 보기' : '다음 후보 없음',
      kind: 'char' as const,
    },
    dynamicOptions[2],
    dynamicOptions[3],
    {
      id: 'fixed-back',
      label: '뒤로',
      value: 'back',
      description: '이전 단계로 돌아가기',
      kind: 'char' as const,
    },
  ]

  return (
    <div style={gridStyle}>
      {cells.map(cell => {
        const isNext = cell.id === 'fixed-next'
        const isBack = cell.id === 'fixed-back'
        const isDisabled =
          disabled ||
          (isNext && !canGoNext) ||
          (!isNext && !isBack && cell.value === '')

        return (
          <button
            key={cell.id}
            type="button"
            disabled={isDisabled}
            style={{
              ...getCellStyle(),
              opacity: isDisabled ? 0.45 : 1,
              backgroundColor: isNext || isBack ? '#eef5ff' : '#ffffff',
            }}
            onClick={() => {
              if (isNext) {
                onNext()
                return
              }

              if (isBack) {
                onBack()
                return
              }

              onSelectOption(cell)
            }}
          >
            <div>
              <h3 style={titleStyle}>{cell.label}</h3>
              <p style={descriptionStyle}>{cell.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
