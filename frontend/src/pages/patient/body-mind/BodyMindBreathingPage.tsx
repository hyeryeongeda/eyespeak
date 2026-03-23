import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type { BodyMindUiStatus, BreathingOptionKey } from '../../../features/patient/body-mind/types/bodyMind'
import { submitBodyMindExpression } from '../../../services/bodyMindService'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../services/recommendationService'
import { breathingOptionPages } from './bodyMindMock'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'

export default function BodyMindBreathingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedKey, setSelectedKey] = useState<BreathingOptionKey | null>(null)
  const [feedbackText, setFeedbackText] = useState(
    '?명씉 ?곹깭瑜??좏깮?섎㈃ ?꾨즺 ?쇰뱶諛깆쓣 二쇨퀬 ?꾩옱 ?붾㈃???좎??⑸땲??',
  )
  const currentOptions = breathingOptionPages[0] ?? []

  const handleSelectOption = async (key: BreathingOptionKey, label: string) => {
    setStatus('selecting')

    try {
      await submitPatientUtterance({
        text: label,
        source: 'manual',
      })
    } catch (error) {
      console.warn('Body-mind breathing chat send failed.', error)
      setStatus('visible')
      setFeedbackText('?꾩넚???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?좏깮??二쇱꽭??')
      return
    }

    let completionSourceLabel = '梨꾪똿 ?꾩넚 ?꾨즺'

    try {
      const result = await submitBodyMindExpression({
        patientId,
        type: 'breathing',
        optionKey: key,
      })

      completionSourceLabel =
        result.source === 'mock' ? 'mock ????꾨즺' : 'API ?꾩넚 ?꾨즺'
    } catch (error) {
      console.warn('Body-mind breathing persistence failed after chat send.', error)
    }

    try {
      await playPatientUtteranceTts({
        text: label,
      })
    } catch (error) {
      console.warn('Body-mind breathing utterance TTS playback failed.', error)
    }

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(`${label} ?좏깮 ?꾨즺 쨌 ${completionSourceLabel}`)
  }

  const handleBack = () => {
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-003"
      title="???듬떟??"
      description="?명씉 愿??遺덊렪 ?뺣룄? ?곹깭 蹂?붾? 援ъ껜?곸쑝濡??꾨떖?⑸땲??"
      status={status}
      feedbackText={feedbackText}
      contextLabel="?섏씠吏 1 / 1"
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
            description="留덉?留???ぉ?낅땲??"
            tone="mint"
            disabled
            onSelect={() => undefined}
          />
        }
        bottomRightCard={
          <BodyMindOptionCard
            title="?ㅻ줈媛湲?"
            description="紐멸낵留덉쓬 硫붿씤?쇰줈"
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
