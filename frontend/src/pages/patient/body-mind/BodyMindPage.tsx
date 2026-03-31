import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import type { BodyMindUiStatus } from '../../../features/patient/body-mind/types/bodyMind'
import usePatientNavigateWithFeedback from '../../../features/patient/input/hooks/usePatientNavigateWithFeedback'
import { bodyMindMainPages, type BodyMindRouteOption } from './bodyMindMock'
import BodyMindPagedMenuPage from './components/BodyMindPagedMenuPage'

interface BodyMindPageRouteState {
  initialPageIndex?: number
}

function getInitialPageIndex(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0
  }

  return Math.min(Math.max(value, 0), bodyMindMainPages.length - 1)
}

function getMainFeedbackText(status: BodyMindUiStatus, pageIndex: number) {
  if (status === 'transitioning') {
    return '선택한 화면으로 이동합니다.'
  }

  if (pageIndex === 0) {
    return '몸 상태와 돌봄 요청을 빠르게 전달합니다.'
  }

  return '상황에 맞는 카테고리를 선택해 상세 문구로 이동합니다.'
}

export default function BodyMindPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
  const location = useLocation()
  const routeState = location.state as BodyMindPageRouteState | null
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [pageIndex, setPageIndex] = useState(getInitialPageIndex(routeState?.initialPageIndex))

  const handleSelectOption = (option: BodyMindRouteOption) => {
    setStatus('transitioning')
    navigateWithFeedback(option.route)
  }

  const handlePageChange = (nextPageIndex: number) => {
    setStatus('transitioning')
    setPageIndex(nextPageIndex)
    setStatus('visible')
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigateWithFeedback(ROUTE_PATHS.PATIENT_TALK_MAIN)
  }

  return (
    <BodyMindPagedMenuPage
      code="PAT-BM-001"
      title="몸과 마음"
      description="몸 상태와 돌봄 요청을 빠르게 전달합니다."
      status={status}
      pages={bodyMindMainPages}
      pageIndex={pageIndex}
      feedbackText={getMainFeedbackText(status, pageIndex)}
      contextLabel={pageIndex === 0 ? '메인 요청' : `카테고리 페이지 ${pageIndex} / 2`}
      rootBackDescription="대화 메인으로 이동"
      previousPageDescription="이전 페이지로 이동"
      onSelectOption={handleSelectOption}
      onPageChange={handlePageChange}
      onRootBack={handleBack}
    />
  )
}
