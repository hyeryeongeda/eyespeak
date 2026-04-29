import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import useReturnToTalkMainAfterDelay from '../../../hooks/useReturnToTalkMainAfterDelay'
import type { BodyMindUiStatus } from '../../../features/patient/body-mind/types/bodyMind'
import { breathingOptionPages } from './bodyMindMock'
import { submitBodyMindSelection } from './bodyMindSubmission'
import BodyMindPagedMenuPage from './components/BodyMindPagedMenuPage'

export default function BodyMindBreathingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  useReturnToTalkMainAfterDelay(status === 'completed')
  const [feedbackText, setFeedbackText] = useState(
    '호흡과 기기 관련 불편을 선택해 전달합니다.',
  )

  const handleSelectOption = async ({
    key,
    label,
  }: (typeof breathingOptionPages)[number]['options'][number]) => {
    setStatus('selecting')

    const result = await submitBodyMindSelection({
      patientId,
      text: label,
      type: 'breathing',
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
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindPagedMenuPage
      code="PAT-BM-003"
      title="숨 답답해"
      description="호흡 상태와 호흡기 관련 요청을 전달합니다."
      status={status}
      pages={breathingOptionPages}
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
