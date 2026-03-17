import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'
import { submitBodyMindExpression } from '../../services/bodyMindService'
import type { BodyMindUiStatus, BreathingOptionKey } from '../../types/communication'
import { breathingOptions } from './bodyMindMock'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

export default function BodyMindBreathingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<BreathingOptionKey | null>(null)
  const [feedbackText, setFeedbackText] = useState(
    '호흡 상태를 선택하면 완료 피드백을 주고 현재 화면을 유지합니다.',
  )

  const handleSelectOption = async (key: BreathingOptionKey, label: string) => {
    setStatus('selecting')

    const result = await submitBodyMindExpression({
      patientId,
      type: 'breathing',
      optionKey: key,
    })

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(
      `${label} 선택 완료 · ${result.source === 'mock' ? 'mock 저장 완료' : 'API 전송 완료'}`,
    )
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-003"
      title="숨 답답해"
      description="호흡 관련 불편 정도와 상태 변화를 구체적으로 전달합니다."
      status={status}
      feedbackText={feedbackText}
    >
      <div style={gridStyle}>
        {breathingOptions.map(option => (
          <BodyMindOptionCard
            key={option.key}
            title={option.label}
            description={option.description}
            tone={option.tone}
            selected={selectedKey === option.key}
            onSelect={() => handleSelectOption(option.key, option.label)}
          />
        ))}

        <BodyMindOptionCard
          title="뒤로가기"
          description="몸과마음 메인으로"
          tone="slate"
          style={{ gridColumn: '1 / -1' }}
          onSelect={handleBack}
        />
      </div>
    </BodyMindLayout>
  )
}
