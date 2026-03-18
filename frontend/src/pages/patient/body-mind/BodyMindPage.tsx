import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BodyMindUiStatus } from '../../../types/communication'
import { getBodyMindMainCardByKey } from './bodyMindMock'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

function getMainFeedbackText(status: BodyMindUiStatus) {
  return status === 'transitioning'
    ? '선택한 화면으로 이동합니다.'
    : '클릭 기반으로 우선 동작하며, dwell 입력 연결이 가능하도록 버튼 구조를 유지합니다.'
}

export default function BodyMindPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const secretionCard = getBodyMindMainCardByKey('secretion')
  const breathingCard = getBodyMindMainCardByKey('breathing')
  const postureCard = getBodyMindMainCardByKey('posture')
  const painCard = getBodyMindMainCardByKey('pain')
  const categoriesCard = getBodyMindMainCardByKey('categories')
  const backCard = getBodyMindMainCardByKey('back')

  const handleSelectCard = (route: string) => {
    setStatus('transitioning')
    navigate(route)
  }

  if (
    !secretionCard ||
    !breathingCard ||
    !postureCard ||
    !painCard ||
    !categoriesCard ||
    !backCard
  ) {
    return null
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
      <BodyMindFixedGrid
        primaryCards={[
          <BodyMindOptionCard
            key={secretionCard.key}
            title={secretionCard.label}
            description={secretionCard.description}
            tone={secretionCard.tone}
            onSelect={() => handleSelectCard(secretionCard.route)}
          />,
          <BodyMindOptionCard
            key={breathingCard.key}
            title={breathingCard.label}
            description={breathingCard.description}
            tone={breathingCard.tone}
            onSelect={() => handleSelectCard(breathingCard.route)}
          />,
          <BodyMindOptionCard
            key={postureCard.key}
            title={postureCard.label}
            description={postureCard.description}
            tone={postureCard.tone}
            onSelect={() => handleSelectCard(postureCard.route)}
          />,
          <BodyMindOptionCard
            key={painCard.key}
            title={painCard.label}
            description={painCard.description}
            tone={painCard.tone}
            onSelect={() => handleSelectCard(painCard.route)}
          />,
        ]}
        topRightCard={
          <BodyMindOptionCard
            title="다음"
            description={categoriesCard.label}
            tone={categoriesCard.tone}
            onSelect={() => handleSelectCard(categoriesCard.route)}
          />
        }
        bottomRightCard={
          <BodyMindOptionCard
            title={backCard.label}
            description={backCard.description}
            tone={backCard.tone}
            onSelect={() => handleSelectCard(backCard.route)}
          />
        }
      />
    </BodyMindLayout>
  )
}
