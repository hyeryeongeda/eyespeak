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
    '??ぉ???좏깮?섎㈃ ?꾩옱 ?붾㈃?먯꽌 ?좏깮 ?곹깭瑜??좎??⑸땲??',
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
      setFeedbackText('?꾩넚???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?좏깮??二쇱꽭??')
      return
    }

    let completionSourceLabel = '梨꾪똿 ?꾩넚 ?꾨즺'

    try {
      const result = await submitBodyMindExpression({
        patientId,
        type: 'secretion',
        optionKey: key,
      })

      completionSourceLabel =
        result.source === 'mock' ? 'mock ????꾨즺' : 'API ?꾩넚 ?꾨즺'
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
    setFeedbackText(`${label} ?좏깮 ?꾨즺 쨌 ${completionSourceLabel}`)
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
      title="媛??移?鍮쇱쨾"
      description="媛?? 移? ?앹뀡 愿??遺덊렪怨??뚮큵 ?붿껌??援ъ껜?곸쑝濡??꾨떖?⑸땲??"
      status={status}
      feedbackText={feedbackText}
      contextLabel={`?섏씠吏 ${pageIndex + 1} / ${secretionOptionPages.length}`}
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
            title="?ㅼ쓬"
            description={hasNextPage ? '?ㅼ쓬 ??ぉ 蹂닿린' : '留덉?留???ぉ?낅땲??'}
            tone="mint"
            disabled={!hasNextPage}
            onSelect={handleNext}
          />
        }
        bottomRightCard={
          <BodyMindOptionCard
            title="?ㅻ줈媛湲?"
            description={pageIndex > 0 ? '?댁쟾 ??ぉ?쇰줈' : '紐멸낵留덉쓬 硫붿씤?쇰줈'}
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
