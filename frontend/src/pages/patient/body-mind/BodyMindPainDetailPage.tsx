import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import {
  getStoredPainAreaSelection,
  submitBodyMindExpression,
} from '../../../services/bodyMindService'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../services/recommendationService'
import type {
  BodyMindUiStatus,
  PainAreaKey,
  PainAreaRouteState,
  PainDetailKey,
} from '../../../features/patient/body-mind/types/bodyMind'
import {
  getPainAreaGroupByAreaKey,
  getPainAreaOptionByKey,
  painDetailOptionPages,
} from './bodyMindMock'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

export default function BodyMindPainDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as PainAreaRouteState | null
  const selectedAreaKey = (routeState?.selectedAreaKey ??
    getStoredPainAreaSelection(patientId)) as PainAreaKey | null
  const selectedGroupKey =
    routeState?.selectedGroupKey ?? getPainAreaGroupByAreaKey(selectedAreaKey)?.key ?? undefined
  const selectedArea = getPainAreaOptionByKey(selectedAreaKey)
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<PainDetailKey | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [feedbackText, setFeedbackText] = useState(
    '통증의 성격이나 필요한 돌봄 요청을 선택하세요.',
  )
  const currentOptions = painDetailOptionPages[pageIndex] ?? []
  const hasNextPage = pageIndex < painDetailOptionPages.length - 1

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
    const utteranceText = `${selectedArea.label} ${label}`.trim()
    try {
      await submitPatientUtterance({
        text: utteranceText,
        source: 'manual',
      })
      await playPatientUtteranceTts({
        text: utteranceText,
      })
    } catch (error) {
      console.warn('Body-mind pain-detail utterance TTS playback failed.', error)
    }

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(
      `${selectedArea.label} · ${label} 선택 완료 · ${
        result.source === 'mock' ? 'mock 저장 완료' : 'API 전송 완료'
      }`,
    )
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
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_PART, {
      state: { selectedGroupKey, selectedAreaKey },
    })
  }

  return (
    <BodyMindLayout
      code="PAT-BM-005"
      title="통증 상세"
      description="선택한 부위에 대해 통증의 성격이나 필요한 돌봄을 구체적으로 전달합니다."
      status={status}
      contextLabel={`선택한 부위: ${selectedArea.label}`}
      feedbackText={`${feedbackText} · 페이지 ${pageIndex + 1} / ${painDetailOptionPages.length}`}
    >
      <BodyMindFixedGrid
        primaryCards={currentOptions.map(option => (
          <BodyMindOptionCard
            key={option.key}
            title={option.label}
            description={option.description}
            tone={option.tone}
            selected={selectedKey === option.key}
            onSelect={() => handleSelectOption(option.key, option.label)}
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
            description={pageIndex > 0 ? '이전 항목으로' : '세부 부위로 돌아가기'}
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
