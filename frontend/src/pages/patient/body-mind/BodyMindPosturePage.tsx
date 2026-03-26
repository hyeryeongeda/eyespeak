import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type { BodyMindUiStatus } from '../../../features/patient/body-mind/types/bodyMind'
import { postureOptionPages } from './bodyMindMock'
import { submitBodyMindSelection } from './bodyMindSubmission'
import BodyMindPagedMenuPage from './components/BodyMindPagedMenuPage'

export default function BodyMindPosturePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [feedbackText, setFeedbackText] = useState(
    '원하는 자세 조절 요청을 선택해 전달합니다.',
  )

  const handleSelectOption = async ({
    key,
    label,
  }: (typeof postureOptionPages)[number]['options'][number]) => {
    setStatus('selecting')

    const result = await submitBodyMindSelection({
      patientId,
      text: label,
      type: 'posture',
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
      code="PAT-BM-003A"
      title="자세 바꿔줘"
      description="머리, 등, 팔, 다리 자세 조절 요청을 전달합니다."
      status={status}
      pages={postureOptionPages}
      pageIndex={pageIndex}
      feedbackText={feedbackText}
      selectedKey={selectedKey}
      rootBackDescription="몸과 마음 메인으로 이동"
      previousPageDescription="이전 페이지로 이동"
      onSelectOption={handleSelectOption}
      onPageChange={handlePageChange}
      onRootBack={handleBack}
    />
  )
}
