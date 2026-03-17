import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import type { BodyMindUiStatus } from '../../types/communication'
import {
  bodyMindCategoryOptions,
  getBodyMindCategoryPath,
} from './bodyMindMock'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

export default function BodyMindCategoryListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')

  const handleSelectCategory = (categoryKey: (typeof bodyMindCategoryOptions)[number]['key']) => {
    setStatus('transitioning')
    navigate(getBodyMindCategoryPath(categoryKey))
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-006"
      title="카테고리 목록"
      description="생활·돌봄 관련 세부 카테고리로 진입할 수 있습니다."
      status={status}
      feedbackText="하위 상세가 없는 항목은 placeholder 화면으로 연결됩니다."
    >
      <div style={gridStyle}>
        {bodyMindCategoryOptions.map(option => (
          <BodyMindOptionCard
            key={option.key}
            title={option.label}
            description={option.description}
            tone={option.tone}
            onSelect={() => handleSelectCategory(option.key)}
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
