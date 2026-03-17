import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import type { BodyMindUiStatus } from '../../types/communication'
import {
  bodyMindCategoryOptionPages,
  getBodyMindCategoryPath,
} from './bodyMindMock'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

export default function BodyMindCategoryListPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [pageIndex, setPageIndex] = useState(0)
  const currentOptions = bodyMindCategoryOptionPages[pageIndex] ?? []
  const hasNextPage = pageIndex < bodyMindCategoryOptionPages.length - 1

  const handleSelectCategory = (categoryKey: (typeof currentOptions)[number]['key']) => {
    setStatus('transitioning')
    navigate(getBodyMindCategoryPath(categoryKey))
  }

  const handleNext = () => {
    if (!hasNextPage) {
      return
    }

    setStatus('transitioning')
    setPageIndex(currentPage => currentPage + 1)
    setStatus('visible')
  }

  const handleBack = () => {
    if (pageIndex > 0) {
      setStatus('transitioning')
      setPageIndex(currentPage => currentPage - 1)
      setStatus('visible')
      return
    }

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
      contextLabel={`페이지 ${pageIndex + 1} / ${bodyMindCategoryOptionPages.length}`}
    >
      <BodyMindFixedGrid
        primaryCards={currentOptions.map(option => (
          <BodyMindOptionCard
            key={option.key}
            title={option.label}
            description={option.description}
            tone={option.tone}
            onSelect={() => handleSelectCategory(option.key)}
          />
        ))}
        topRightCard={
          <BodyMindOptionCard
            title="다음"
            description={hasNextPage ? '다음 항목 보기' : '마지막 항목입니다'}
            tone="mint"
            disabled={!hasNextPage}
            onSelect={handleNext}
          />
        }
        bottomRightCard={
          <BodyMindOptionCard
            title="뒤로가기"
            description={pageIndex > 0 ? '이전 항목으로' : '몸과마음 메인으로'}
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
