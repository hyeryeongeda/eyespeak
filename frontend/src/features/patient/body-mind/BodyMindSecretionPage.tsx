import { useState } from 'react'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../auth/hooks/useAuth'
import usePatientNavigateWithFeedback from '../input/hooks/usePatientNavigateWithFeedback'
import useReturnToTalkMainAfterDelay from '../../../hooks/useReturnToTalkMainAfterDelay'
import type { BodyMindUiStatus } from './types/bodyMind'
import { secretionOptionPages } from './bodyMindMock'
import { submitBodyMindSelection } from './bodyMindSubmission'
import BodyMindPagedMenuPage from './components/BodyMindPagedMenuPage'

export default function BodyMindSecretionPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  useReturnToTalkMainAfterDelay(status === 'completed')
  const [feedbackText, setFeedbackText] = useState(
    '가래와 침 관련 요청을 선택해 전달합니다.',
  )

  const handleSelectOption = async ({
    key,
    label,
  }: (typeof secretionOptionPages)[number]['options'][number]) => {
    setStatus('selecting')

    const result = await submitBodyMindSelection({
      patientId,
      text: label,
      type: 'secretion',
      optionKey: key,
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
    navigateWithFeedback(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindPagedMenuPage
      code="PAT-BM-002"
      title="가래 / 침 빼줘"
      description="가래와 침 관련 불편이나 추가 요청을 전달합니다."
      status={status}
      pages={secretionOptionPages}
      pageIndex={pageIndex}
      feedbackText={feedbackText}
      selectedKey={selectedKey}
      rootBackDescription="몸과 마음 메인으로 이동"
      previousPageDescription="이전 페이지로 이동"
      confirmOptionSelectionUntilTts
      onSelectOption={handleSelectOption}
      onPageChange={handlePageChange}
      onRootBack={handleBack}
    />
  )
}
