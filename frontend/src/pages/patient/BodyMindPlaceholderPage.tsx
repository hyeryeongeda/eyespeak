import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BodyMindUiStatus } from '../../types/communication'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
}

interface BodyMindPlaceholderPageProps {
  code: string
  title: string
  description: string
  note: string
  backPath: string
  backDescription?: string
  contextLabel?: string
}

export default function BodyMindPlaceholderPage({
  code,
  title,
  description,
  note,
  backPath,
  backDescription = '이전 화면으로 이동',
  contextLabel,
}: BodyMindPlaceholderPageProps) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')

  const handleBack = () => {
    setStatus('transitioning')
    navigate(backPath)
  }

  return (
    <BodyMindLayout
      code={code}
      title={title}
      description={description}
      status={status}
      contextLabel={contextLabel}
      feedbackText={note}
    >
      <div style={gridStyle}>
        <BodyMindOptionCard
          title="상세 화면 준비 중"
          description="세부 항목과 API 연결 전까지 스텁 라우트로 유지합니다."
          tone="slate"
          style={{ minHeight: '180px' }}
        />

        <BodyMindOptionCard
          title="뒤로가기"
          description={backDescription}
          tone="slate"
          onSelect={handleBack}
        />
      </div>
    </BodyMindLayout>
  )
}
