import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../auth/hooks/useAuth'
import usePatientNavigateWithFeedback from '../input/hooks/usePatientNavigateWithFeedback'
import useReturnToTalkMainAfterDelay from '../shared/hooks/useReturnToTalkMainAfterDelay'
import type {
  BodyMindUiStatus,
  PainAreaKey,
  PainAreaRouteState,
  PainDetailKey,
} from './types/bodyMind'
import { getStoredPainAreaSelection } from '../../../services/bodyMindService'
import { getPainAreaGroupByAreaKey, getPainAreaOptionByKey, painDetailOptionPages } from './bodyMindMock'
import { submitBodyMindSelection } from './bodyMindSubmission'
import BodyMindPagedMenuPage from './components/BodyMindPagedMenuPage'

export default function BodyMindPainDetailPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
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
  useReturnToTalkMainAfterDelay(status === 'completed')
  const [feedbackText, setFeedbackText] = useState(
    '통증의 느낌이나 필요한 도움을 선택해 전달합니다.',
  )

  if (!selectedAreaKey || !selectedArea) {
    return <Navigate to={ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA} replace />
  }

  const handleSelectOption = async ({
    key,
    label,
  }: (typeof painDetailOptionPages)[number]['options'][number]) => {
    const utteranceText = `${selectedArea.label} ${label}`.trim()

    setStatus('selecting')

    const result = await submitBodyMindSelection({
      patientId,
      text: utteranceText,
      type: 'pain_detail',
      optionKey: key,
      areaKey: selectedAreaKey,
    })

    if (!result.success) {
      setStatus('visible')
      setFeedbackText(result.feedbackText)
      return
    }

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(result.feedbackText)
  }

  const handlePageChange = (nextPageIndex: number) => {
    setStatus('transitioning')
    setPageIndex(nextPageIndex)
    setStatus('visible')
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigateWithFeedback(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_PART, {
      state: { selectedGroupKey, selectedAreaKey },
    })
  }

  return (
    <BodyMindPagedMenuPage
      code="PAT-BM-005"
      title="통증 상세"
      description={`${selectedArea.label} 부위의 통증 상태와 필요한 도움을 전달합니다.`}
      status={status}
      pages={painDetailOptionPages}
      pageIndex={pageIndex}
      feedbackText={feedbackText}
      contextLabel={`선택 부위: ${selectedArea.label} · 페이지 ${pageIndex + 1} / ${painDetailOptionPages.length}`}
      selectedKey={selectedKey}
      rootBackDescription="통증 부위 선택으로 이동"
      previousPageDescription="이전 페이지로 이동"
      confirmOptionSelectionUntilTts
      onSelectOption={handleSelectOption}
      onPageChange={handlePageChange}
      onRootBack={handleBack}
    />
  )
}
