import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import {
  getStoredPainAreaSelection,
  storePainAreaSelection,
} from '../../../services/bodyMindService'
import type { BodyMindUiStatus, PainAreaKey, PainAreaRouteState } from '../../../features/patient/body-mind/types/bodyMind'
import { getPainAreaOptionByKey, painAreaOptionPages } from './bodyMindMock'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

export default function BodyMindPainAreaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as PainAreaRouteState | null
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAreaKey, setSelectedAreaKey] = useState<PainAreaKey | null>(
    routeState?.selectedAreaKey ?? getStoredPainAreaSelection(patientId),
  )

  const selectedArea = getPainAreaOptionByKey(selectedAreaKey)
  const currentOptions = painAreaOptionPages[pageIndex] ?? []
  const hasNextPage = pageIndex < painAreaOptionPages.length - 1

  const handleSelectArea = (areaKey: PainAreaKey) => {
    setSelectedAreaKey(areaKey)
    setStatus('area_selected')
    storePainAreaSelection(patientId, areaKey)
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_DETAIL, {
      state: { selectedAreaKey: areaKey },
    })
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
      code="PAT-BM-004"
      title="아파"
      description="통증이 있는 부위를 먼저 선택한 뒤 상세 표현으로 이동합니다."
      status={status}
      contextLabel={selectedArea ? `현재 선택: ${selectedArea.label}` : undefined}
      feedbackText={`부위를 선택하면 다음 단계에서 통증 상세를 고를 수 있습니다. · 페이지 ${
        pageIndex + 1
      } / ${painAreaOptionPages.length}`}
    >
      <BodyMindFixedGrid
        primaryCards={currentOptions.map(option => (
          <BodyMindOptionCard
            key={option.key}
            title={option.label}
            description={option.description}
            tone={option.tone}
            selected={selectedAreaKey === option.key}
            onSelect={() => handleSelectArea(option.key)}
          />
        ))}
        topRightCard={
          <BodyMindOptionCard
            title="다음"
            description={hasNextPage ? '다음 부위 보기' : '마지막 항목입니다'}
            tone="mint"
            disabled={!hasNextPage}
            onSelect={handleNext}
          />
        }
        bottomRightCard={
          <BodyMindOptionCard
            title="뒤로가기"
            description={pageIndex > 0 ? '이전 부위로' : '몸과마음 메인으로'}
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
