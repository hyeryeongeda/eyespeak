import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { useAuth } from '../../auth/hooks/useAuth'
import type {
  BodyMindUiStatus,
  PainAreaGroupKey,
  PainAreaRouteState,
} from './types/bodyMind'
import usePatientNavigateWithFeedback from '../input/hooks/usePatientNavigateWithFeedback'
import usePatientPageCellMapping from '../input/hooks/usePatientPageCellMapping'
import { useGazeInputStore } from '../input/stores/gazeInputStore'
import { getStoredPainAreaSelection } from './services/bodyMindService'
import { getPainAreaGroupByAreaKey, getPainAreaGroupByKey } from './bodyMindMock'
import { getFullBodyModelUrl, getPainAreaGroupModelByKey } from './bodyMindPainModels'
import BodyMindLayout from './components/BodyMindLayout'
import BodyMindOptionCard from './components/BodyMindOptionCard'
import BodyMindPainGuideCard from './components/BodyMindPainGuideCard'
import BodyMindPainOverviewGrid from './components/BodyMindPainOverviewGrid'

const PREVIEW_DELAY_MS = 220

export default function BodyMindPainAreaPage() {
  const navigate = useNavigate()
  const navigateWithFeedback = usePatientNavigateWithFeedback()
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

  usePatientPageCellMapping([
    'upper_body',
    null,
    'lower_body',
    'middle_body',
    null,
    'body-mind-pain-area-back',
  ])

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
    navigateWithFeedback(ROUTE_PATHS.PATIENT_BODY_MIND)
  }

  return (
    <BodyMindLayout
      code="PAT-BM-004"
      title="아파"
      description="상체, 몸통, 하체 중 아픈 범위를 먼저 고른 뒤 세부 부위를 선택합니다."
      status={status}
      contextLabel={selectedGroup ? `현재 선택: ${selectedGroup.label}` : '통증 범위 선택'}
      feedbackText="아픈 범위를 먼저 선택하면 다음 화면에서 세부 부위를 고를 수 있습니다."
    >
      <BodyMindPainOverviewGrid
        upperCard={
          <BodyMindOptionCard
            title="상체"
            description="머리, 목, 어깨, 가슴"
            tone="sky"
            badge="부위 선택"
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
            description="배, 팔, 손, 허리"
            tone="sand"
            badge="부위 선택"
            trackingId="middle_body"
            selected={selectedGroupKey === 'middle_body'}
            onSelect={() => handleSelectGroup('middle_body')}
            onGazeEnter={() => handleGazeEnter('middle_body')}
            onGazeLeave={handleGazeLeave}
          />
        }
        guideCard={
          <BodyMindPainGuideCard
            modelUrl={guideModelUrl}
            highlightModelUrl={highlightModelUrl}
          />
        }
        lowerCard={
          <BodyMindOptionCard
            title="하체"
            description="다리, 발, 엉덩이, 전신"
            tone="mint"
            badge="부위 선택"
            trackingId="lower_body"
            selected={selectedGroupKey === 'lower_body'}
            onSelect={() => handleSelectGroup('lower_body')}
            onGazeEnter={() => handleGazeEnter('lower_body')}
            onGazeLeave={handleGazeLeave}
          />
        }
        backCard={
          <BodyMindOptionCard
            title="← 뒤로가기"
            description="몸과 마음 메인으로 이동"
            tone="slate"
            badge="고정 위치"
            trackingId="body-mind-pain-area-back"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
