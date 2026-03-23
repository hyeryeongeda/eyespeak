import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type { BodyMindUiStatus, SecretionOptionKey } from '../../../features/patient/body-mind/types/bodyMind'
import { submitBodyMindExpression } from '../../../services/bodyMindService'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../services/recommendationService'
import { secretionOptionPages } from './bodyMindMock'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

export default function BodyMindSecretionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<SecretionOptionKey | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [feedbackText, setFeedbackText] = useState(
    '항목을 선택하면 현재 화면에서 선택 상태를 유지합니다.',
  )
  const currentOptions = secretionOptionPages[pageIndex] ?? []
  const hasNextPage = pageIndex < secretionOptionPages.length - 1

  const handleSelectOption = async (key: SecretionOptionKey, label: string) => {
    setStatus('selecting')

    try {
      await submitPatientUtterance({
        text: label,
        source: 'manual',
      })
    } catch (error) {
      console.warn('Body-mind secretion chat send failed.', error)
      setStatus('visible')
      setFeedbackText('전송에 실패했습니다. 다시 선택해 주세요.')
      return
    }

    let completionSourceLabel = '채팅 전송 완료'

    try {
      const result = await submitBodyMindExpression({
        patientId,
        type: 'secretion',
        optionKey: key,
      })

      completionSourceLabel =
        result.source === 'mock' ? 'mock 저장 완료' : 'API 전송 완료'
    } catch (error) {
      console.warn('Body-mind secretion persistence failed after chat send.', error)
    }

    try {
      await playPatientUtteranceTts({
        text: label,
      })
    } catch (error) {
      console.warn('Body-mind secretion utterance TTS playback failed.', error)
    }

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(`${label} 선택 완료 · ${completionSourceLabel}`)
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
      code="PAT-BM-002"
      title="가래/침 빼줘"
      description="가래, 침, 석션 관련 불편과 돌봄 요청을 구체적으로 전달합니다."
      status={status}
      feedbackText={feedbackText}
      contextLabel={`페이지 ${pageIndex + 1} / ${secretionOptionPages.length}`}
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
            description={pageIndex > 0 ? '이전 항목으로' : '몸과마음 메인으로'}
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
