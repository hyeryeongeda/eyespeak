import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BodyMindUiStatus } from '../../types/communication'
import { bodyMindMainCards } from './bodyMindMock'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gridTemplateAreas: `
    "secretion breathing categories"
    "posture pain back"
  `,
  gap: '12px',
}

const mainGridResponsiveStyle = `
  @media (max-width: 720px) {
    .body-mind-main-grid {
      gap: 10px;
    }
  }
`

const getCardMinHeight = () => 'clamp(148px, 30vh, 280px)'

function getMainFeedbackText(status: BodyMindUiStatus) {
  return status === 'transitioning'
    ? '선택한 화면으로 이동합니다.'
    : '클릭 기반으로 우선 동작하며, dwell 입력 연결이 가능하도록 버튼 구조를 유지합니다.'
}

export default function BodyMindPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')

  const handleSelectCard = (route: string) => {
    setStatus('transitioning')
    navigate(route)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-001"
      title="몸과마음"
      description="몸 상태와 돌봄 요청을 빠르게 전달합니다."
      status={status}
      contextLabel="클릭 기반 · dwell 연동 준비"
      feedbackText={getMainFeedbackText(status)}
    >
      <style>{mainGridResponsiveStyle}</style>

      <div className="body-mind-main-grid" style={gridStyle}>
        {bodyMindMainCards.map(card => (
          <div key={card.key} style={{ gridArea: card.gridArea, minWidth: 0 }}>
            <BodyMindOptionCard
              title={card.label}
              description={card.description}
              tone={card.tone}
              style={{ height: '100%', minHeight: getCardMinHeight() }}
              onSelect={() => handleSelectCard(card.route)}
            />
          </div>
        ))}
      </div>
    </BodyMindLayout>
  )
}
