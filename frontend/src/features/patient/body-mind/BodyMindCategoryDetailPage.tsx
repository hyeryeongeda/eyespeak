import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../auth/hooks/useAuth'
import usePatientNavigateWithFeedback from '../input/hooks/usePatientNavigateWithFeedback'
import useReturnToTalkMainAfterDelay from '../../../hooks/useReturnToTalkMainAfterDelay'
import type { BodyMindUiStatus } from './types/bodyMind'
import { getBodyMindCategoryDefinitionByKey } from './bodyMindMock'
import { submitBodyMindSelection } from './bodyMindSubmission'
import BodyMindPagedMenuPage from './components/BodyMindPagedMenuPage'

interface BodyMindCategoryDetailRouteState {
  returnPageIndex?: number
}

export default function BodyMindCategoryDetailPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
  const location = useLocation()
  const { categoryKey } = useParams()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as BodyMindCategoryDetailRouteState | null
  const category = getBodyMindCategoryDefinitionByKey(categoryKey)
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  useReturnToTalkMainAfterDelay(status === 'completed')
  const [feedbackText, setFeedbackText] = useState(
    category?.description ?? '카테고리 상세 문구를 선택해 전달합니다.',
  )

  if (!category) {
    return null
  }

  const handleSelectOption = async ({
    key,
    label,
  }: (typeof category.pages)[number]['options'][number]) => {
    setStatus('selecting')

    const result = await submitBodyMindSelection({
      patientId,
      text: label,
      type: 'category',
      optionKey: key,
      categoryKey: category.key,
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
    navigateWithFeedback(ROUTE_PATHS.PATIENT_BODY_MIND, {
      state: {
        initialPageIndex: routeState?.returnPageIndex ?? category.returnPageIndex,
      },
    })
  }

  return (
    <BodyMindPagedMenuPage
      code="PAT-BM-006-DETAIL"
      title={category.label}
      description={category.description}
      status={status}
      pages={category.pages}
      pageIndex={pageIndex}
      feedbackText={feedbackText}
      selectedKey={selectedKey}
      rootBackDescription="몸과 마음 카테고리로 이동"
      previousPageDescription="이전 페이지로 이동"
      confirmOptionSelectionUntilTts
      onSelectOption={handleSelectOption}
      onPageChange={handlePageChange}
      onRootBack={handleBack}
    />
  )
}
