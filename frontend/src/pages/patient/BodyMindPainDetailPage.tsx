import { useState, type CSSProperties } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'
import {
  getStoredPainAreaSelection,
  submitBodyMindExpression,
} from '../../services/bodyMindService'
import type {
  BodyMindUiStatus,
  PainAreaKey,
  PainAreaRouteState,
  PainDetailKey,
} from '../../types/communication'
import { getPainAreaOptionByKey, painDetailOptions } from './bodyMindMock'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

export default function BodyMindPainDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as PainAreaRouteState | null
  const selectedAreaKey = (routeState?.selectedAreaKey ??
    getStoredPainAreaSelection(patientId)) as PainAreaKey | null
  const selectedArea = getPainAreaOptionByKey(selectedAreaKey)
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<PainDetailKey | null>(null)
  const [feedbackText, setFeedbackText] = useState(
    '통증의 성격이나 필요한 돌봄 요청을 선택하세요.',
  )

  if (!selectedAreaKey || !selectedArea) {
    return <Navigate to={ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA} replace />
  }

  const handleSelectOption = async (key: PainDetailKey, label: string) => {
    setStatus('selecting')

    const result = await submitBodyMindExpression({
      patientId,
      type: 'pain_detail',
      optionKey: key,
      areaKey: selectedAreaKey,
    })

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(
      `${selectedArea.label} · ${label} 선택 완료 · ${
        result.source === 'mock' ? 'mock 저장 완료' : 'API 전송 완료'
      }`,
    )
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA, {
      state: { selectedAreaKey },
    })
  }

  return (
    <BodyMindLayout
      code="PAT-BM-005"
      title="통증 상세"
      description="선택한 부위에 대해 통증의 성격이나 필요한 돌봄을 구체적으로 전달합니다."
      status={status}
      contextLabel={`선택한 부위: ${selectedArea.label}`}
      feedbackText={feedbackText}
    >
      <div style={gridStyle}>
        {painDetailOptions.map(option => (
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
          description="부위 선택으로 돌아가기"
          tone="slate"
          style={{ gridColumn: '1 / -1' }}
          onSelect={handleBack}
        />
      </div>
    </BodyMindLayout>
  )
}
