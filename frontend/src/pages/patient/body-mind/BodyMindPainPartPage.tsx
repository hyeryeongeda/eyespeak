import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type {
  BodyMindUiStatus,
  PainAreaKey,
  PainAreaRouteState,
} from '../../../features/patient/body-mind/types/bodyMind'
import {
  getStoredPainAreaSelection,
  storePainAreaSelection,
} from '../../../services/bodyMindService'
import {
  getPainAreaGroupByAreaKey,
  getPainAreaGroupByKey,
  getPainAreaOptionByKey,
} from './bodyMindMock'
import { getPainAreaModelByKey } from './bodyMindPainModels'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'
import BodyMindPainGuideCard from './components/BodyMindPainGuideCard'

const PREVIEW_DELAY_MS = 220

export default function BodyMindPainPartPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as PainAreaRouteState | null
  const storedAreaKey = routeState?.selectedAreaKey ?? getStoredPainAreaSelection(patientId)
  const derivedGroupKey =
    routeState?.selectedGroupKey ?? getPainAreaGroupByAreaKey(storedAreaKey)?.key ?? null
  const group = getPainAreaGroupByKey(derivedGroupKey)
  const initialAreaKey =
    routeState?.selectedAreaKey &&
    group?.options.some(option => option.key === routeState.selectedAreaKey)
      ? routeState.selectedAreaKey
      : storedAreaKey && group?.options.some(option => option.key === storedAreaKey)
        ? storedAreaKey
        : group?.options[0]?.key ?? null
  const navigationTimeoutRef = useRef<number | null>(null)
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedAreaKey, setSelectedAreaKey] = useState<PainAreaKey | null>(initialAreaKey)

  useEffect(
    () => () => {
      if (navigationTimeoutRef.current !== null) {
        window.clearTimeout(navigationTimeoutRef.current)
      }
    },
    [],
  )

  if (!group) {
    return <Navigate to={ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA} replace />
  }

  const selectedArea =
    getPainAreaOptionByKey(selectedAreaKey) ?? getPainAreaOptionByKey(group.options[0]?.key ?? null)
  const selectedModel = getPainAreaModelByKey(selectedArea?.key)
  const [primaryLeftTop, primaryTopRight, primaryLeftBottom, primaryBottomCenter] = group.options

  const handleSelectArea = (areaKey: PainAreaKey) => {
    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(navigationTimeoutRef.current)
    }

    setSelectedAreaKey(areaKey)
    setStatus('area_selected')
    storePainAreaSelection(patientId, areaKey)

    navigationTimeoutRef.current = window.setTimeout(() => {
      setStatus('transitioning')
      navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_DETAIL, {
        state: { selectedGroupKey: group.key, selectedAreaKey: areaKey },
      })
    }, PREVIEW_DELAY_MS)
  }

  const handleBack = () => {
    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(navigationTimeoutRef.current)
    }

    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_AREA, {
      state: { selectedGroupKey: group.key, selectedAreaKey },
    })
  }

  return (
    <BodyMindLayout
      code="PAT-BM-004A"
      title="세부 부위 선택"
      description={`${group.label} 안에서 아픈 부위를 하나 더 구체적으로 고릅니다.`}
      status={status}
      contextLabel={selectedArea ? `현재 선택: ${selectedArea.label}` : group.label}
      feedbackText="세부 부위를 선택하면 중앙 가이드가 바뀌고 통증 상세 단계로 이동합니다."
    >
      <BodyMindFixedGrid
        primaryCards={[
          <BodyMindOptionCard
            key={primaryLeftTop.key}
            title={primaryLeftTop.label}
            description={primaryLeftTop.description}
            tone={primaryLeftTop.tone}
            badge="세부 부위"
            selected={selectedArea?.key === primaryLeftTop.key}
            onSelect={() => handleSelectArea(primaryLeftTop.key)}
          />,
          selectedModel ? (
            <BodyMindPainGuideCard
              key={selectedModel.key}
              badge="상세 가이드"
              modelUrl={selectedModel.modelUrl}
              fallbackModelUrl={selectedModel.fallbackModelUrl}
              headerText={`${selectedArea?.label ?? group.options[0]?.label} 부위를 중앙에서 확인할 수 있습니다.`}
            />
          ) : (
            <BodyMindOptionCard key="pain-guide-fallback" title="상세 가이드" tone="slate" />
          ),
          <BodyMindOptionCard
            key={primaryLeftBottom.key}
            title={primaryLeftBottom.label}
            description={primaryLeftBottom.description}
            tone={primaryLeftBottom.tone}
            badge="세부 부위"
            selected={selectedArea?.key === primaryLeftBottom.key}
            onSelect={() => handleSelectArea(primaryLeftBottom.key)}
          />,
          <BodyMindOptionCard
            key={primaryBottomCenter.key}
            title={primaryBottomCenter.label}
            description={primaryBottomCenter.description}
            tone={primaryBottomCenter.tone}
            badge="세부 부위"
            selected={selectedArea?.key === primaryBottomCenter.key}
            onSelect={() => handleSelectArea(primaryBottomCenter.key)}
          />,
        ]}
        topRightCard={
          <BodyMindOptionCard
            title={primaryTopRight.label}
            description={primaryTopRight.description}
            tone={primaryTopRight.tone}
            badge="세부 부위"
            selected={selectedArea?.key === primaryTopRight.key}
            onSelect={() => handleSelectArea(primaryTopRight.key)}
          />
        }
        bottomRightCard={
          <BodyMindOptionCard
            title="뒤로가기"
            description="통증 메인으로"
            tone="slate"
            badge="고정 위치"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
