import { type CSSProperties, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ROUTE_PATHS,
  getPatientLeisureCategoryPath,
} from '../../../app/router/routePaths'
import {
  fetchLeisureContentDetail,
  getLeisureCategoryById,
  parseLeisureMockScenario,
} from '../../../services/leisureService'
import type { LeisureContent, LeisurePlayerRouteState, LeisurePlayerStatus } from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureEmptyState from './components/LeisureEmptyState'
import LeisureErrorState from './components/LeisureErrorState'
import LeisureLayout from './components/LeisureLayout'
import LeisureLoadingState from './components/LeisureLoadingState'
import { leisurePanelSurfaceStyle, leisurePillStyle } from './components/leisureTheme'

function getPlayerStatusText(status: LeisurePlayerStatus) {
  switch (status) {
    case 'loading':
      return '콘텐츠를 준비하고 있습니다'
    case 'empty':
      return '선택한 영상이 없습니다'
    case 'error':
      return '영상을 불러올 수 없습니다'
    case 'transitioning':
      return '선택한 영상으로 이동합니다'
    default:
      return 'YouTube iframe으로 재생 중입니다'
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
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '18px',
  padding: '16px 20px 28px',
}

const categoryBadgeWrapStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
}

const videoOuterWrapStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const videoInnerWrapStyle: CSSProperties = {
  position: 'relative',
  width: 'min(100%, 740px)',
  aspectRatio: '16 / 9',
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

const contentCopyStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  textAlign: 'center',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.9rem, 2.8vw, 2.45rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
  lineHeight: 1.08,
}

const subtitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: '680px',
  color: '#647a90',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.5,
}

const tagWrapStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  justifyContent: 'center',
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
  const params = useParams()
  const routeState = (location.state as LeisurePlayerRouteState | null) ?? null
  const searchParams = new URLSearchParams(location.search)
  const playerScenario = parseLeisureMockScenario(searchParams.get('playerScenario'))

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
        const nextContent = await fetchLeisureContentDetail(params.contentId, playerScenario)

        if (!isMounted) {
          return
        }

        setContent(nextContent)
        setStatus(nextContent ? 'playing' : 'empty')
      } catch {
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
  }, [params.contentId, playerScenario])

  const currentCategory = getLeisureCategoryById(content?.categoryId ?? routeState?.categoryId)
  const fallbackBackPath = content
    ? getPatientLeisureCategoryPath(content.categoryId)
    : ROUTE_PATHS.PATIENT_LEISURE
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
        title="여가 재생"
        description="YouTube 콘텐츠를 전체 화면 기반으로 준비합니다."
        statusText={getPlayerStatusText(status)}
        contextLabel="iframe embed 준비 중"
        hideHeader
      >
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={{ ...stateCardWrapStyle, gridColumn: '1 / span 2' }}>
            <LeisureLoadingState
              title="선택한 영상을 불러오는 중입니다"
              description="iframe 재생 영역과 이동 액션을 함께 준비하고 있습니다."
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
        title="여가 재생"
        description="선택한 영상을 찾지 못했습니다."
        statusText={getPlayerStatusText(status)}
        contextLabel="mock content 확인 필요"
        hideHeader
      >
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={stateCardWrapStyle}>
            <LeisureEmptyState
              title="선택한 영상이 없습니다"
              description="다른 카테고리나 여가 메인에서 콘텐츠를 다시 선택해 주세요."
            />
          </div>
          <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
            <LeisureActionCard
              title="뒤로가기"
              description="직전 화면 또는 여가 메인으로 돌아갑니다"
              badge="고정 위치"
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
        title="여가 재생"
        description="YouTube mock 콘텐츠를 재생할 수 없습니다."
        statusText={getPlayerStatusText('error')}
        contextLabel="mock fetch 실패"
        hideHeader
      >
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={stateCardWrapStyle}>
            <LeisureErrorState
              title="영상을 불러올 수 없습니다"
              description="잠시 후 다시 시도하거나 이전 화면으로 돌아가 주세요."
            />
          </div>
          <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
            <LeisureActionCard
              title="뒤로가기"
              description="직전 화면 또는 여가 메인으로 돌아갑니다"
              badge="고정 위치"
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
      title="여가 재생"
      description={`${content.channelName} · ${routeState?.fromLabel ?? currentCategory?.label ?? '추천 콘텐츠'}`}
      statusText={getPlayerStatusText(status)}
      contextLabel="대표 영상 재생 화면"
      hideHeader
    >
      <section className="leisure-player-grid" style={playerPanelStyle}>
        <div style={playerVisualPanelStyle}>
          <div style={categoryBadgeWrapStyle}>
            <span style={leisurePillStyle}>{currentCategory?.label ?? '여가'}</span>
          </div>

          <div style={videoOuterWrapStyle}>
            <div style={videoInnerWrapStyle}>
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

          <div style={contentCopyStyle}>
            <h2 style={titleStyle}>{content.title}</h2>
            <p style={subtitleStyle}>{content.description}</p>
            <div style={tagWrapStyle}>
              <span style={leisurePillStyle}>{content.channelName}</span>
              {content.durationLabel ? <span style={leisurePillStyle}>{content.durationLabel}</span> : null}
            </div>
          </div>
        </div>

        <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
          <LeisureActionCard
            title="다른 콘텐츠"
            description="연관 콘텐츠 4개 추천 보기"
            badge="상단 고정"
            variant="hero"
            tone="mint"
            slotId="player-related"
            onSelect={handleOpenRelatedContents}
          />
          <LeisureActionCard
            title="뒤로가기"
            description="여가 카테고리 목록으로"
            badge="하단 고정"
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
