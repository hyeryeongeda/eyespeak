import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type {
  BodyMindUiStatus,
  PainAreaKey,
  PainAreaRouteState,
  PainDetailKey,
} from '../../../features/patient/body-mind/types/bodyMind'
import {
  getStoredPainAreaSelection,
  submitBodyMindExpression,
} from '../../../services/bodyMindService'
import {
  playPatientUtteranceTts,
  submitPatientUtterance,
} from '../../../services/recommendationService'
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
    '?듭쬆???깃꺽?대굹 ?꾩슂???뚮큵 ?붿껌???좏깮?섏꽭??',
  )
  const currentOptions = painDetailOptionPages[pageIndex] ?? []
  const hasNextPage = pageIndex < painDetailOptionPages.length - 1

  if (!selectedAreaKey || !selectedArea) {
    return <Navigate to={ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA} replace />
  }

  const handleSelectOption = async (key: PainDetailKey, label: string) => {
    const utteranceText = `${selectedArea.label} ${label}`.trim()

    setStatus('selecting')

    try {
      await submitPatientUtterance({
        text: utteranceText,
        source: 'manual',
      })
    } catch (error) {
      console.warn('Body-mind pain-detail chat send failed.', error)
      setStatus('visible')
      setFeedbackText('?꾩넚???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?좏깮??二쇱꽭??')
      return
    }

    let completionSourceLabel = '梨꾪똿 ?꾩넚 ?꾨즺'

    try {
      const result = await submitBodyMindExpression({
        patientId,
        type: 'pain_detail',
        optionKey: key,
        areaKey: selectedAreaKey,
      })

      completionSourceLabel =
        result.source === 'mock' ? 'mock ????꾨즺' : 'API ?꾩넚 ?꾨즺'
    } catch (error) {
      console.warn('Body-mind pain-detail persistence failed after chat send.', error)
    }

    try {
      await playPatientUtteranceTts({
        text: utteranceText,
      })
    } catch (error) {
      console.warn('Body-mind pain-detail utterance TTS playback failed.', error)
    }

    setSelectedKey(key)
    setStatus('completed')
    setFeedbackText(
      `${selectedArea.label} 쨌 ${label} ?좏깮 ?꾨즺 쨌 ${completionSourceLabel}`,
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
      title="?듭쬆 ?곸꽭"
      description="?좏깮??遺?꾩뿉 ????듭쬆???깃꺽?대굹 ?꾩슂???뚮큵??援ъ껜?곸쑝濡??꾨떖?⑸땲??"
      status={status}
      contextLabel={`?좏깮??遺?? ${selectedArea.label}`}
      feedbackText={`${feedbackText} 쨌 ?섏씠吏 ${pageIndex + 1} / ${painDetailOptionPages.length}`}
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
            description={pageIndex > 0 ? '?댁쟾 ??ぉ?쇰줈' : '?몃? 遺?꾨줈 ?뚯븘媛湲?'}
            tone="slate"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
