import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ROUTE_PATHS, getPatientLeisureCategoryPath } from '../../../app/router/routePaths'
import {
  fetchLeisureContentDetail,
  getLeisureCategoryById,
} from '../../../services/leisureService'
import type { LeisureContent, LeisurePlayerRouteState, LeisurePlayerStatus } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureEmptyState from './components/LeisureEmptyState'
import LeisureErrorState from './components/LeisureErrorState'
import LeisureLayout from './components/LeisureLayout'
import LeisureLoadingState from './components/LeisureLoadingState'
import { leisurePanelSurfaceStyle } from './components/leisureTheme'
import { usePatientIncomingChat } from '../../../hooks/patientIncomingChatContext'

function getPlayerStatusText(status: LeisurePlayerStatus) {
  switch (status) {
    case 'loading':
      return '콘텐츠를 불러오는 중'
    case 'empty':
      return '재생 가능한 콘텐츠 없음'
    case 'error':
      return '콘텐츠를 불러오지 못함'
    case 'transitioning':
      return '이전 화면으로 이동 중'
    default:
      return 'YouTube 플레이어 준비 완료'
  }
}

const playerPanelStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 2.45fr) minmax(220px, 0.95fr)',
  gap: '16px',
}

const playerVisualPanelStyle: CSSProperties = {
  ...leisurePanelSurfaceStyle,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
}

const videoOuterWrapStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  minHeight: 0,
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'stretch',
}

const videoInnerWrapStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 0,
  borderRadius: '26px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #e9f1ff 0%, #dfeafa 100%)',
  boxShadow: 'inset 0 0 0 1px rgba(196, 210, 229, 0.92)',
}

const playOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '54px',
  height: '54px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.94)',
  boxShadow: '0 18px 34px rgba(81, 104, 136, 0.16)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
}

const playTriangleStyle: CSSProperties = {
  width: 0,
  height: 0,
  borderTop: '8px solid transparent',
  borderBottom: '8px solid transparent',
  borderLeft: '12px solid #5d92de',
  marginLeft: '4px',
}

const pausedBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: '16px',
  left: '16px',
  padding: '8px 12px',
  borderRadius: '999px',
  backgroundColor: 'rgba(18, 29, 46, 0.78)',
  color: '#eef6ff',
  fontSize: '12px',
  fontWeight: 800,
  zIndex: 2,
}

const sideActionWrapStyle: CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
  minHeight: 0,
}

const stateCardWrapStyle: CSSProperties = {
  display: 'flex',
  minHeight: 0,
}

const iframeWrapStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  backgroundColor: '#dde8f8',
}

export default function LeisurePlayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const chat = usePatientIncomingChat()
  const params = useParams()
  const routeState = (location.state as LeisurePlayerRouteState | null) ?? null

  const [status, setStatus] = useState<LeisurePlayerStatus>('idle')
  const [content, setContent] = useState<LeisureContent | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPlayerContent = async () => {
      if (!params.contentId) {
        setContent(null)
        setStatus('empty')
        return
      }

      setStatus('loading')

      try {
        const nextContent = await fetchLeisureContentDetail(params.contentId)

        if (!isMounted) {
          return
        }

        setContent(nextContent)
        setStatus(nextContent ? 'playing' : 'empty')
      } catch (error) {
        console.error('Failed to load leisure player content.', error)

        if (!isMounted) {
          return
        }

        setContent(null)
        setStatus('error')
      }
    }

    void loadPlayerContent()

    return () => {
      isMounted = false
    }
  }, [params.contentId])

  const currentCategory = getLeisureCategoryById(content?.categoryId ?? routeState?.categoryId)
  const fallbackBackPath =
    content?.categoryId ? getPatientLeisureCategoryPath(content.categoryId) : ROUTE_PATHS.PATIENT_LEISURE
  const relatedContentsPath =
    content?.categoryId || routeState?.categoryId
      ? getPatientLeisureCategoryPath(content?.categoryId ?? routeState?.categoryId ?? '')
      : ROUTE_PATHS.PATIENT_LEISURE

  const handleBack = () => {
    setStatus('transitioning')
    navigate({
      pathname: routeState?.fromPath ?? fallbackBackPath,
      search: location.search,
    })
  }

  const handleOpenRelatedContents = () => {
    setStatus('transitioning')
    navigate({
      pathname: relatedContentsPath,
      search: location.search,
    })
  }

  if (status === 'loading') {
    return (
      <LeisureLayout
        code="PAT-LEISURE-003"
        title="여가 플레이어"
        description="선택한 YouTube 콘텐츠를 실제 API 기준으로 불러오고 있습니다."
        statusText={getPlayerStatusText(status)}
        contextLabel="iframe 플레이어"
        hideHeader
      >
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={{ ...stateCardWrapStyle, gridColumn: '1 / span 2' }}>
            <LeisureLoadingState
              title="플레이어를 준비하는 중입니다"
              description="영상 URL과 임베드 정보를 확인하고 있습니다."
            />
          </div>
        </section>
      </LeisureLayout>
    )
  }

  if (status === 'empty') {
    return (
      <LeisureLayout
        code="PAT-LEISURE-003"
        title="여가 플레이어"
        description="재생 가능한 콘텐츠를 찾지 못했습니다."
        statusText={getPlayerStatusText(status)}
        contextLabel="재생 불가 콘텐츠"
        hideHeader
      >
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={stateCardWrapStyle}>
            <LeisureEmptyState
              title="재생 가능한 콘텐츠가 없습니다"
              description="유효한 YouTube URL이 없는 항목은 플레이어에서 제외됩니다."
            />
          </div>
          <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
            <LeisureActionCard
              title="뒤로가기"
              description="이전 화면으로 돌아갑니다."
              badge="메인 이동"
              variant="hero"
              tone="slate"
              slotId="player-empty-back"
              onSelect={handleBack}
            />
          </div>
        </section>
      </LeisureLayout>
    )
  }

  if (status === 'error' || !content) {
    return (
      <LeisureLayout
        code="PAT-LEISURE-003"
        title="여가 플레이어"
        description="콘텐츠를 불러오는 중 오류가 발생했습니다."
        statusText={getPlayerStatusText('error')}
        contextLabel="API 오류"
        hideHeader
      >
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={stateCardWrapStyle}>
            <LeisureErrorState
              title="콘텐츠를 불러오지 못했습니다"
              description="잠시 후 다시 시도하거나 이전 화면으로 돌아가 주세요."
            />
          </div>
          <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
            <LeisureActionCard
              title="뒤로가기"
              description="이전 화면으로 돌아갑니다."
              badge="메인 이동"
              variant="hero"
              tone="slate"
              slotId="player-error-back"
              onSelect={handleBack}
            />
          </div>
        </section>
      </LeisureLayout>
    )
  }

  return (
    <LeisureLayout
      code="PAT-LEISURE-003"
      title="여가 플레이어"
      description={`${content.channelName} · ${content.categoryLabel ?? currentCategory?.label ?? '분류 없음'}`}
      statusText={getPlayerStatusText(status)}
      contextLabel="YouTube 재생"
      hideHeader
    >
      <section className="leisure-player-grid" style={playerPanelStyle}>
        <div style={playerVisualPanelStyle}>
          <div style={videoOuterWrapStyle}>
            <div style={videoInnerWrapStyle}>
              {chat.state.isMediaPausedByInterrupt ? (
                <div style={pausedBadgeStyle}>채팅 인터럽트로 일시정지</div>
              ) : null}
              <iframe
                title={content.title}
                src={content.embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                style={iframeWrapStyle}
              />
              <div aria-hidden style={playOverlayStyle}>
                <div style={playTriangleStyle} />
              </div>
            </div>
          </div>
        </div>

        <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
          <LeisureActionCard
            title="카테고리 목록"
            description="같은 카테고리의 다른 콘텐츠를 확인합니다."
            badge="추천 이동"
            variant="hero"
            tone="mint"
            slotId="player-related"
            onSelect={handleOpenRelatedContents}
          />
          <LeisureActionCard
            title="뒤로가기"
            description="이전 화면으로 돌아갑니다."
            badge="메인 이동"
            variant="hero"
            tone="slate"
            slotId="player-back"
            onSelect={handleBack}
          />
        </div>
      </section>
    </LeisureLayout>
  )
}
