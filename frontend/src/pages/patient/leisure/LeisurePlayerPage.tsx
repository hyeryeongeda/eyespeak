import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ROUTE_PATHS,
  getPatientLeisureCategoryPath,
  getPatientLeisurePlayerPath,
} from '../../../app/router/routePaths'
import {
  fetchLeisureContentDetail,
  fetchRelatedLeisureContents,
  getLeisureCategoryById,
} from '../../../services/leisureService'
import type {
  LeisureContent,
  LeisureOverlayStatus,
  LeisurePlayerRouteState,
  LeisurePlayerStatus,
} from '../../../types/leisure'
import LeisureActionCard from './components/LeisureActionCard'
import LeisureEmptyState from './components/LeisureEmptyState'
import LeisureErrorState from './components/LeisureErrorState'
import LeisureLayout from './components/LeisureLayout'
import LeisureLoadingState from './components/LeisureLoadingState'
import RelatedContentOverlay from './components/RelatedContentOverlay'
import { leisurePanelSurfaceStyle } from './components/leisureTheme'
import { usePatientIncomingChat } from '../../../hooks/patientIncomingChatContext'
import { usePatientLeisureResumeStore } from '../../../stores/patientLeisureResumeStore'
import { useCellMapping } from '../../../features/patient/input/hooks/useCellMapping'

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
  width: '100%',
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

const YOUTUBE_PLAYER_STATE_PLAYING = 1
const YOUTUBE_PLAYER_STATE_PAUSED = 2
const YOUTUBE_PLAYER_STATE_BUFFERING = 3
const YOUTUBE_IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'

interface YouTubePlayerInstance {
  destroy: () => void
  getCurrentTime: () => number
  getPlayerState: () => number
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLIFrameElement,
    config: {
      events?: {
        onReady?: () => void
        onStateChange?: (event: { data: number }) => void
      }
    },
  ) => YouTubePlayerInstance
}

type YouTubeWindow = Window & typeof globalThis & {
  YT?: YouTubeNamespace
  onYouTubeIframeAPIReady?: () => void
}

interface LeisurePlaybackSnapshot {
  currentTime: number | null
  wasPlaying: boolean
}

let youTubeIframeApiPromise: Promise<YouTubeNamespace> | null = null

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube iframe API is unavailable on the server.'))
  }

  const youTubeWindow = window as YouTubeWindow

  if (youTubeWindow.YT?.Player) {
    return Promise.resolve(youTubeWindow.YT)
  }

  if (youTubeIframeApiPromise) {
    return youTubeIframeApiPromise
  }

  youTubeIframeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_SRC}"]`,
    )

    const handleReady = () => {
      const namespace = (window as YouTubeWindow).YT

      if (namespace?.Player) {
        resolve(namespace)
        return
      }

      reject(new Error('YouTube iframe API failed to initialize.'))
    }

    const previousCallback = youTubeWindow.onYouTubeIframeAPIReady
    youTubeWindow.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      handleReady()
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load YouTube iframe API script.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = YOUTUBE_IFRAME_API_SRC
    script.async = true
    script.addEventListener('error', () => {
      reject(new Error('Failed to load YouTube iframe API script.'))
    })
    document.head.appendChild(script)
  })

  return youTubeIframeApiPromise
}

function buildYouTubePlayerUrl(embedUrl: string) {
  const url = new URL(embedUrl)
  url.searchParams.set('rel', '0')
  url.searchParams.set('modestbranding', '1')
  url.searchParams.set('playsinline', '1')
  url.searchParams.set('autoplay', '1')
  url.searchParams.set('enablejsapi', '1')

  if (typeof window !== 'undefined') {
    url.searchParams.set('origin', window.location.origin)
  }

  return url.toString()
}

export default function LeisurePlayerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const chat = usePatientIncomingChat()
  const params = useParams()
  const routeState = (location.state as LeisurePlayerRouteState | null) ?? null
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const playerRef = useRef<YouTubePlayerInstance | null>(null)
  const pausedSnapshotRef = useRef<LeisurePlaybackSnapshot | null>(null)
  const handledInterruptMessageIdRef = useRef<string | null>(null)
  const appliedResumeAtRef = useRef<number | null>(null)
  const resumeContext = usePatientLeisureResumeStore(state => state.resumeContext)
  const setResumeContext = usePatientLeisureResumeStore(state => state.setResumeContext)
  const patchResumeContext = usePatientLeisureResumeStore(state => state.patchResumeContext)
  const clearResumeContext = usePatientLeisureResumeStore(state => state.clearResumeContext)

  const [status, setStatus] = useState<LeisurePlayerStatus>('idle')
  const [content, setContent] = useState<LeisureContent | null>(null)
  const [isRelatedOverlayOpen, setIsRelatedOverlayOpen] = useState(false)
  const [relatedStatus, setRelatedStatus] = useState<LeisureOverlayStatus>('idle')
  const [relatedContents, setRelatedContents] = useState<LeisureContent[]>([])
  const [relatedNoticeMessage, setRelatedNoticeMessage] = useState<string | null>(null)

  const playerCellMapping = useMemo(
    () =>
      ({
        0: 'player-related',
        1: 'player-back',
        2: 'player-related',
        3: 'player-back',
        4: 'player-related',
        5: 'player-back',
      }) as Record<number, string | null>,
    [],
  )

  const relatedOverlayCellMapping = useMemo(
    () =>
      ({
        0: 'related-content-1',
        1: 'related-content-2',
        2: 'related-refresh',
        3: 'related-content-3',
        4: 'related-content-4',
        5: 'related-close',
      }) as Record<number, string | null>,
    [],
  )

  useCellMapping(isRelatedOverlayOpen ? relatedOverlayCellMapping : playerCellMapping)

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

  useEffect(() => {
    setIsRelatedOverlayOpen(false)
    setRelatedContents([])
    setRelatedStatus('idle')
    setRelatedNoticeMessage(null)
  }, [params.contentId])

  const currentCategory = getLeisureCategoryById(content?.categoryId ?? routeState?.categoryId)
  const fallbackBackPath =
    content?.categoryId ? getPatientLeisureCategoryPath(content.categoryId) : ROUTE_PATHS.PATIENT_LEISURE
  const currentPlayerPath = `${location.pathname}${location.search}`
  const playerSrc = useMemo(
    () => (content ? buildYouTubePlayerUrl(content.embedUrl) : ''),
    [content],
  )
  const relatedOverlayTone = currentCategory?.tone ?? 'mint'
  const relatedOverlayCategoryLabel = content?.categoryLabel ?? currentCategory?.label ?? '연관 영상'

  const capturePlaybackSnapshot = useCallback((): LeisurePlaybackSnapshot => {
    const player = playerRef.current

    if (!player) {
      return {
        currentTime: null,
        wasPlaying: status === 'playing',
      }
    }

    const playerState = player.getPlayerState()

    return {
      currentTime: Math.max(0, player.getCurrentTime()),
      wasPlaying:
        playerState === YOUTUBE_PLAYER_STATE_PLAYING ||
        playerState === YOUTUBE_PLAYER_STATE_BUFFERING,
    }
  }, [status])

  const applyPlaybackSnapshot = useCallback((snapshot: LeisurePlaybackSnapshot) => {
    const player = playerRef.current

    if (!player) {
      return false
    }

    if (snapshot.currentTime != null && snapshot.currentTime > 0) {
      player.seekTo(snapshot.currentTime, true)
    }

    if (snapshot.wasPlaying) {
      player.playVideo()
      setStatus('playing')
    } else {
      player.pauseVideo()
      setStatus('paused')
    }

    return true
  }, [])

  useEffect(() => {
    if (!content || !iframeRef.current) {
      return
    }

    let isMounted = true
    let nextPlayer: YouTubePlayerInstance | null = null

    void loadYouTubeIframeApi()
      .then(youTube => {
        if (!isMounted || !iframeRef.current) {
          return
        }

        nextPlayer = new youTube.Player(iframeRef.current, {
          events: {
            onReady: () => {
              if (!isMounted) {
                return
              }

              playerRef.current = nextPlayer
              nextPlayer?.playVideo()
              patchResumeContext(currentContext =>
                currentContext.resumePath === currentPlayerPath &&
                (currentContext.contentId == null || currentContext.contentId === content.id)
                  ? {
                      contentId: content.id,
                      categoryId: content.categoryId,
                      routeState,
                      canResumePlayback: true,
                    }
                  : {},
              )
            },
            onStateChange: event => {
              if (!isMounted) {
                return
              }

              if (event.data === YOUTUBE_PLAYER_STATE_PLAYING) {
                setStatus('playing')
                return
              }

              if (event.data === YOUTUBE_PLAYER_STATE_PAUSED) {
                setStatus('paused')
              }
            },
          },
        })
      })
      .catch(error => {
        console.warn('Failed to initialize leisure player controls.', error)
      })

    return () => {
      isMounted = false

      if (playerRef.current === nextPlayer) {
        playerRef.current = null
      }

      nextPlayer?.destroy()
    }
  }, [content, currentPlayerPath, patchResumeContext, routeState])

  useEffect(() => {
    if (!content || !chat.state.isMediaPausedByInterrupt) {
      return
    }

    const interruptMessageId =
      chat.activeMessage?.id ?? chat.latestUnresolvedMessage?.id ?? '__leisure_interrupt__'

    if (handledInterruptMessageIdRef.current === interruptMessageId) {
      return
    }

    const snapshot = capturePlaybackSnapshot()
    pausedSnapshotRef.current = snapshot
    handledInterruptMessageIdRef.current = interruptMessageId
    playerRef.current?.pauseVideo()
    setStatus('paused')
    setResumeContext({
      routeKind: 'player',
      resumePath: currentPlayerPath,
      fallbackPath: routeState?.fromPath ?? fallbackBackPath,
      contentId: content.id,
      categoryId: content.categoryId,
      routeState,
      playbackPositionSec: snapshot.currentTime,
      wasPlaying: snapshot.wasPlaying,
      canResumePlayback: Boolean(playerRef.current),
      fromLeisure: false,
      interruptedMessageId: interruptMessageId,
      savedAt: Date.now(),
    })
  }, [
    capturePlaybackSnapshot,
    chat.activeMessage?.id,
    chat.latestUnresolvedMessage?.id,
    chat.state.isMediaPausedByInterrupt,
    content,
    currentPlayerPath,
    fallbackBackPath,
    routeState,
    setResumeContext,
  ])

  useEffect(() => {
    if (chat.state.isMediaPausedByInterrupt) {
      return
    }

    const pausedSnapshot = pausedSnapshotRef.current
    const shouldHoldForReplyResume =
      resumeContext?.routeKind === 'player' &&
      resumeContext.fromLeisure &&
      resumeContext.resumePath === currentPlayerPath &&
      chat.shouldShowInterruptOverlay

    if (!pausedSnapshot || shouldHoldForReplyResume) {
      return
    }

    if (applyPlaybackSnapshot(pausedSnapshot)) {
      pausedSnapshotRef.current = null
      handledInterruptMessageIdRef.current = null
    }
  }, [
    applyPlaybackSnapshot,
    chat.shouldShowInterruptOverlay,
    chat.state.isMediaPausedByInterrupt,
    currentPlayerPath,
    resumeContext,
  ])

  useEffect(() => {
    if (!resumeContext) {
      return
    }

    if (
      resumeContext.routeKind !== 'player' ||
      !resumeContext.fromLeisure ||
      resumeContext.resumePath !== currentPlayerPath
    ) {
      return
    }

    if (appliedResumeAtRef.current === resumeContext.savedAt) {
      return
    }

    if (resumeContext.contentId != null && content && resumeContext.contentId !== content.id) {
      return
    }

    const restored = applyPlaybackSnapshot({
      currentTime: resumeContext.playbackPositionSec,
      wasPlaying: resumeContext.wasPlaying,
    })

    if (!restored) {
      return
    }

    appliedResumeAtRef.current = resumeContext.savedAt
    pausedSnapshotRef.current = null
    handledInterruptMessageIdRef.current = null
    clearResumeContext()
  }, [applyPlaybackSnapshot, clearResumeContext, content, currentPlayerPath, resumeContext])

  useEffect(() => {
    if (!resumeContext || !resumeContext.fromLeisure) {
      return
    }

    if (resumeContext.resumePath !== currentPlayerPath) {
      return
    }

    if (status !== 'empty' && status !== 'error') {
      return
    }

    clearResumeContext()
    navigate(resumeContext.fallbackPath || ROUTE_PATHS.PATIENT_MAIN, { replace: true })
  }, [clearResumeContext, currentPlayerPath, navigate, resumeContext, status])

  const handleBack = () => {
    setIsRelatedOverlayOpen(false)
    clearResumeContext()
    setStatus('transitioning')
    navigate({
      pathname: routeState?.fromPath ?? fallbackBackPath,
      search: location.search,
    })
  }

  const loadRelatedContents = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (!content?.id) {
        setRelatedContents([])
        setRelatedStatus('empty')
        return
      }

      setRelatedNoticeMessage(null)
      setRelatedStatus(options?.refresh ? 'refreshing' : 'loading')

      try {
        const nextContents = await fetchRelatedLeisureContents(content.id, options)
        setRelatedContents(nextContents)
        setRelatedStatus(nextContents.length > 0 ? 'visible' : 'empty')
      } catch (error) {
        console.error('Failed to load related leisure contents.', error)
        setRelatedContents([])
        setRelatedStatus('error')
        setRelatedNoticeMessage('관련 영상을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    },
    [content?.id],
  )

  const handleOpenRelatedContents = () => {
    setIsRelatedOverlayOpen(true)
    void loadRelatedContents()
  }

  const handleRefreshRelatedContents = () => {
    void loadRelatedContents({ refresh: true })
  }

  const handleCloseRelatedContents = () => {
    setRelatedStatus('closing')
    setIsRelatedOverlayOpen(false)
    setRelatedNoticeMessage(null)
  }

  const handleSelectRelatedContent = (nextContent: LeisureContent) => {
    setRelatedStatus('selecting')
    setIsRelatedOverlayOpen(false)
    clearResumeContext()
    setStatus('transitioning')
    navigate(
      {
        pathname: getPatientLeisurePlayerPath(nextContent.id),
        search: location.search,
      },
      {
        state: {
          fromPath: currentPlayerPath,
          fromLabel: content?.title ?? routeState?.fromLabel ?? '여가 콘텐츠',
          categoryId: nextContent.categoryId ?? content?.categoryId ?? routeState?.categoryId,
        },
      },
    )
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
      {isRelatedOverlayOpen ? (
        <RelatedContentOverlay
          title="연관 영상"
          categoryLabel={relatedOverlayCategoryLabel}
          tone={relatedOverlayTone}
          status={relatedStatus}
          contents={relatedContents}
          noticeMessage={relatedNoticeMessage}
          onSelectContent={handleSelectRelatedContent}
          onRefresh={handleRefreshRelatedContents}
          onClose={handleCloseRelatedContents}
        />
      ) : (
        <section className="leisure-player-grid" style={playerPanelStyle}>
          <div style={playerVisualPanelStyle}>
            <div style={videoOuterWrapStyle}>
              <div style={videoInnerWrapStyle}>
                {chat.state.isMediaPausedByInterrupt ? (
                  <div style={pausedBadgeStyle}>채팅 인터럽트로 일시정지</div>
                ) : null}
                <iframe
                  key={content.id}
                  ref={iframeRef}
                  title={content.title}
                  src={playerSrc}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={iframeWrapStyle}
                />
              </div>
            </div>
          </div>

          <div className="leisure-player-side-actions" style={sideActionWrapStyle}>
            <LeisureActionCard
              title="연관 영상"
              description="연관된 다른 영상을 확인합니다."
              badge="추천 이동"
              variant="hero"
              tone="mint"
              disabled={isRelatedOverlayOpen}
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
      )}
    </LeisureLayout>
  )
}
