import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import type {
  BodyMindUiStatus,
  PainAreaGroupKey,
  PainAreaRouteState,
} from '../../../features/patient/body-mind/types/bodyMind'
import { useGazeInputStore } from '../../../features/patient/input/stores/gazeInputStore'
import { getStoredPainAreaSelection } from '../../../services/bodyMindService'
import { getPainAreaGroupByAreaKey, getPainAreaGroupByKey } from './bodyMindMock'
import { getFullBodyModelUrl, getPainAreaGroupModelByKey } from './bodyMindPainModels'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'
import BodyMindPainGuideCard from './components/BodyMindPainGuideCard'
import BodyMindPainOverviewGrid from './components/BodyMindPainOverviewGrid'

const PREVIEW_DELAY_MS = 220

export default function BodyMindPainAreaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const patientId = user?.id ?? 'patient-guest'
  const routeState = location.state as PainAreaRouteState | null
  const storedAreaKey = routeState?.selectedAreaKey ?? getStoredPainAreaSelection(patientId)
  const storedGroupKey = getPainAreaGroupByAreaKey(storedAreaKey)?.key ?? null
  const initialGroupKey = routeState?.selectedGroupKey ?? storedGroupKey ?? null
  const navigationTimeoutRef = useRef<number | null>(null)
  const [status, setStatus] = useState<BodyMindUiStatus>('visible')
  const [selectedGroupKey, setSelectedGroupKey] = useState<PainAreaGroupKey | null>(initialGroupKey)

  const [hoveredGroupKey, setHoveredGroupKey] = useState<PainAreaGroupKey | null>(null)
  const selectedGroup = getPainAreaGroupByKey(selectedGroupKey)
  const guideModelUrl = getFullBodyModelUrl()
  const highlightGroupModel = getPainAreaGroupModelByKey(hoveredGroupKey)
  const highlightModelUrl = highlightGroupModel?.modelUrl ?? null

  const gazePoint = useGazeInputStore(state => state.point)

  useEffect(() => {
    if (!gazePoint) {
      setHoveredGroupKey(null)
      return
    }

    const elements = document.elementsFromPoint(gazePoint.clientX, gazePoint.clientY)

    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue
      const tracked = el.closest<HTMLElement>('[data-tracking-id]')
      if (!tracked) continue
      const id = tracked.dataset.trackingId as PainAreaGroupKey | undefined
      if (id === 'upper_body' || id === 'middle_body' || id === 'lower_body') {
        setHoveredGroupKey(id)
        return
      }
    }

    setHoveredGroupKey(null)
  }, [gazePoint])

  const handleGazeEnter = useCallback((groupKey: PainAreaGroupKey) => {
    setHoveredGroupKey(groupKey)
  }, [])

  const handleGazeLeave = useCallback(() => {
    setHoveredGroupKey(null)
  }, [])

  const clearPendingNavigation = () => {
    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }
  }

  useEffect(() => () => clearPendingNavigation(), [])

  const handleSelectGroup = (groupKey: PainAreaGroupKey) => {
    clearPendingNavigation()
    setSelectedGroupKey(groupKey)
    setStatus('area_selected')

    navigationTimeoutRef.current = window.setTimeout(() => {
      setStatus('transitioning')
      navigate(ROUTE_PATHS.PATIENT_BODY_MIND_PAIN_PART, {
        state: { selectedGroupKey: groupKey },
      })
    }, PREVIEW_DELAY_MS)
  }

  const handleBack = () => {
    clearPendingNavigation()
    setStatus('transitioning')
    navigate(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-004"
      title="통증 메인"
      description="통증이 있는 큰 부위를 먼저 고른 뒤 세부 부위로 이동합니다."
      status={status}
      contextLabel={selectedGroup ? `현재 선택: ${selectedGroup.label}` : '대분류 선택'}
      feedbackText="상체, 몸통, 하체 중 통증이 있는 범위를 먼저 선택하세요."
    >
      <BodyMindPainOverviewGrid
        upperCard={
          <BodyMindOptionCard
            title="상체"
            description="머리 · 목 · 어깨 · 팔 · 손"
            tone="sky"
            badge="대분류"
            trackingId="upper_body"
            selected={selectedGroupKey === 'upper_body'}
            onSelect={() => handleSelectGroup('upper_body')}
            onGazeEnter={() => handleGazeEnter('upper_body')}
            onGazeLeave={handleGazeLeave}
          />
        }
        middleCard={
          <BodyMindOptionCard
            title="몸통"
            description="가슴 · 배 · 허리 · 엉덩이"
            tone="sky"
            badge="대분류"
            trackingId="middle_body"
            selected={selectedGroupKey === 'middle_body'}
            onSelect={() => handleSelectGroup('middle_body')}
            onGazeEnter={() => handleGazeEnter('middle_body')}
            onGazeLeave={handleGazeLeave}
          />
        }
        guideCard={
          <BodyMindPainGuideCard
            badge="전신 가이드"
            modelUrl={guideModelUrl}
            highlightModelUrl={highlightModelUrl}
            headerText={
              selectedGroup
                ? `${selectedGroup.label} 선택 후 세부 부위를 이어서 고릅니다.`
                : '가운데 가이드에서 전체 신체를 확인한 뒤 대분류를 선택하세요.'
            }
          />
        }
        lowerCard={
          <BodyMindOptionCard
            title="하체"
            description="허벅지 · 무릎 · 종아리 · 발"
            tone="sky"
            badge="대분류"
            trackingId="lower_body"
            selected={selectedGroupKey === 'lower_body'}
            onSelect={() => handleSelectGroup('lower_body')}
            onGazeEnter={() => handleGazeEnter('lower_body')}
            onGazeLeave={handleGazeLeave}
          />
        }
        backCard={
          <BodyMindOptionCard
            title="뒤로가기"
            description="몸과마음 메인으로"
            tone="slate"
            badge="고정 위치"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
