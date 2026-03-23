import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type {
  BodyMindUiStatus,
  PainAreaKey,
  PainAreaRouteState,
} from '../../../features/patient/body-mind/types/bodyMind'
import { useGazeInputStore } from '../../../features/patient/input/stores/gazeInputStore'
import {
  getStoredPainAreaSelection,
  storePainAreaSelection,
} from '../../../services/bodyMindService'
import {
  getPainAreaGroupByAreaKey,
  getPainAreaGroupByKey,
  getPainAreaOptionByKey,
} from './bodyMindMock'
import { getFullBodyModelUrl, getPainAreaModelByKey } from './bodyMindPainModels'
import type { BodyViewOffset } from './components/BodyMindPainGuideCard'
import BodyMindFixedGrid from './components/BodyMindFixedGrid'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'
import BodyMindPainGuideCard from './components/BodyMindPainGuideCard'

const PREVIEW_DELAY_MS = 220

const GROUP_VIEW_OFFSETS: Record<string, BodyViewOffset> = {
  upper_body: { y: 1.2, z: 2.6 },
  middle_body: { y: 0.45, z: 2.8 },
  lower_body: { y: -0.9, z: 3.4 },
}

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
  const [hoveredAreaKey, setHoveredAreaKey] = useState<PainAreaKey | null>(null)

  const gazePoint = useGazeInputStore(state => state.point)

  useEffect(() => {
    if (!gazePoint) {
      setHoveredAreaKey(null)
      return
    }

    const elements = document.elementsFromPoint(gazePoint.clientX, gazePoint.clientY)

    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue
      const tracked = el.closest<HTMLElement>('[data-tracking-id]')
      if (!tracked) continue
      const id = tracked.dataset.trackingId as PainAreaKey | undefined
      if (id && group?.options.some(opt => opt.key === id)) {
        setHoveredAreaKey(id)
        return
      }
    }

    setHoveredAreaKey(null)
  }, [gazePoint, group])

  const handleGazeEnter = useCallback((areaKey: PainAreaKey) => {
    setHoveredAreaKey(areaKey)
  }, [])

  const handleGazeLeave = useCallback(() => {
    setHoveredAreaKey(null)
  }, [])

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
  const fullBodyUrl = getFullBodyModelUrl()
  const viewOffset = GROUP_VIEW_OFFSETS[group.key] ?? null
  const hoveredModel = getPainAreaModelByKey(hoveredAreaKey)
  const highlightModelUrl = hoveredModel?.modelUrl ?? null
  const REAR_VIEW_PARTS: PainAreaKey[] = ['back', 'hip']
  const guideRotationY = hoveredAreaKey && REAR_VIEW_PARTS.includes(hoveredAreaKey) ? Math.PI : 0
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
            trackingId={primaryLeftTop.key}
            selected={selectedArea?.key === primaryLeftTop.key}
            onSelect={() => handleSelectArea(primaryLeftTop.key)}
            onGazeEnter={() => handleGazeEnter(primaryLeftTop.key)}
            onGazeLeave={handleGazeLeave}
          />,
          <BodyMindPainGuideCard
            key={`guide-${group.key}`}
            modelUrl={fullBodyUrl}
            highlightModelUrl={highlightModelUrl}
            rotationY={guideRotationY}
            viewOffset={viewOffset}
          />,
          <BodyMindOptionCard
            key={primaryLeftBottom.key}
            title={primaryLeftBottom.label}
            description={primaryLeftBottom.description}
            tone={primaryLeftBottom.tone}
            badge="세부 부위"
            trackingId={primaryLeftBottom.key}
            selected={selectedArea?.key === primaryLeftBottom.key}
            onSelect={() => handleSelectArea(primaryLeftBottom.key)}
            onGazeEnter={() => handleGazeEnter(primaryLeftBottom.key)}
            onGazeLeave={handleGazeLeave}
          />,
          <BodyMindOptionCard
            key={primaryBottomCenter.key}
            title={primaryBottomCenter.label}
            description={primaryBottomCenter.description}
            tone={primaryBottomCenter.tone}
            badge="세부 부위"
            trackingId={primaryBottomCenter.key}
            selected={selectedArea?.key === primaryBottomCenter.key}
            onSelect={() => handleSelectArea(primaryBottomCenter.key)}
            onGazeEnter={() => handleGazeEnter(primaryBottomCenter.key)}
            onGazeLeave={handleGazeLeave}
          />,
        ]}
        topRightCard={
          <BodyMindOptionCard
            title={primaryTopRight.label}
            description={primaryTopRight.description}
            tone={primaryTopRight.tone}
            badge="세부 부위"
            trackingId={primaryTopRight.key}
            selected={selectedArea?.key === primaryTopRight.key}
            onSelect={() => handleSelectArea(primaryTopRight.key)}
            onGazeEnter={() => handleGazeEnter(primaryTopRight.key)}
            onGazeLeave={handleGazeLeave}
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
