import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PatientTrackingGuardOverlay from '../../features/patient/input/components/PatientTrackingGuardOverlay'
import { useAuth } from '../../features/auth/hooks/useAuth'
import usePatientGlobalMenuActionListener from '../../features/patient/input/hooks/usePatientGlobalMenuActionListener'
import usePatientGazeClick from '../../features/patient/input/hooks/usePatientGazeClick'
import usePatientModeDwellSync from '../../features/patient/input/hooks/usePatientModeDwellSync'
import usePatientRuntimeTracking from '../../features/patient/input/hooks/usePatientRuntimeTracking'
import usePatientTrackingBridge from '../../features/patient/input/hooks/usePatientTrackingBridge'
import { getPatientEyeTrackingProfileId } from '../../features/patient/input/services/calibration/patientCalibrationService'
import {
  isPatientTrackingAvailable,
  isPatientTrackingBlocked,
  usePatientModeStore,
} from '../../features/patient/input/stores/patientModeStore'
import { PatientIncomingChatProvider } from '../../hooks/usePatientIncomingChat'
import { usePatientIncomingChat } from '../../hooks/patientIncomingChatContext'
import { usePatientLeisureResumeStore } from '../../stores/patientLeisureResumeStore'
import { ROUTE_PATHS } from '../router/routePaths'

const GlobalMenuOverlay = lazy(() => import('../../features/patient/input/components/GlobalMenuOverlay'))
const IncomingInterruptOverlay = lazy(() => import('../../components/patient/chat/IncomingInterruptOverlay'))
const ReturnToLeisureOverlay = lazy(
  () => import('../../components/patient/chat/ReturnToLeisureOverlay'),
)
const CallStatusOverlay = lazy(() => import('../../components/patient/CallStatusOverlay'))

const patientLogoutButtonStyle = {
  position: 'fixed',
  top: '12px',
  right: '12px',
  zIndex: 1100,
  minHeight: '40px',
  padding: '0 14px',
  borderRadius: '999px',
  border: '1px solid rgba(142, 162, 196, 0.4)',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  color: '#4a5d7d',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
} as const

type PatientLayoutRouteKind = 'talk' | 'custom_talk' | 'leisure' | 'leisure_player' | 'other'

function getPatientLayoutRouteKind(pathname: string): PatientLayoutRouteKind {
  if (pathname.includes('/leisure/player/')) {
    return 'leisure_player'
  }

  if (pathname.includes('/leisure')) {
    return 'leisure'
  }

  if (pathname.includes('/talk/custom') || pathname.endsWith('/custom-talk')) {
    return 'custom_talk'
  }

  if (pathname.endsWith('/talk')) {
    return 'talk'
  }

  return 'other'
}

function isLeisureRouteKind(kind: string | null | undefined) {
  return kind === 'leisure' || kind === 'leisure_player'
}

function isChatRouteKind(kind: string | null | undefined) {
  return kind === 'talk' || kind === 'custom_talk'
}

function PatientLayoutShell() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isReturnToLeisureOverlayVisible, setIsReturnToLeisureOverlayVisible] = useState(false)
  const previousPathnameRef = useRef(location.pathname)
  const promptedResumeAtRef = useRef<number | null>(null)
  const isResumeNavigationInFlightRef = useRef(false)
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const resumeContext = usePatientLeisureResumeStore(state => state.resumeContext)
  const setResumeContext = usePatientLeisureResumeStore(state => state.setResumeContext)
  const clearResumeContext = usePatientLeisureResumeStore(state => state.clearResumeContext)
  const isCalibrationRoute = location.pathname === ROUTE_PATHS.PATIENT_CALIBRATION
  const isTrackingBlocked = isPatientTrackingBlocked(trackingStatus)
  const eyeTrackingProfileId = getPatientEyeTrackingProfileId(user)
  const currentRouteKind = chat.state.currentRoute?.kind ?? getPatientLayoutRouteKind(location.pathname)
  usePatientTrackingBridge({
    enabled: !isCalibrationRoute,
  })
  usePatientRuntimeTracking({
    enabled: !isCalibrationRoute,
    eyeTrackingProfileId,
  })
  usePatientGlobalMenuActionListener({
    enabled: !isCalibrationRoute,
  })
  usePatientGazeClick({
    enabled:
      !isCalibrationRoute &&
      !isGlobalMenuOpen &&
      isPatientTrackingAvailable(trackingStatus),
  })
  usePatientModeDwellSync({
    enabled: !isCalibrationRoute,
  })

  useEffect(() => {
    closeGlobalMenu()
  }, [closeGlobalMenu, location.pathname])

  useEffect(() => {
    if (!isTrackingBlocked) {
      return
    }

    closeGlobalMenu()
  }, [closeGlobalMenu, isTrackingBlocked])

  useEffect(() => {
    const previousPathname = previousPathnameRef.current
    previousPathnameRef.current = location.pathname

    const previousRouteKind = getPatientLayoutRouteKind(previousPathname)
    const nextRouteKind = getPatientLayoutRouteKind(location.pathname)
    const isEnteringChat = isChatRouteKind(nextRouteKind) && !isChatRouteKind(previousRouteKind)
    const isLeavingChat = isChatRouteKind(previousRouteKind) && !isChatRouteKind(nextRouteKind)

    if (isEnteringChat && !isLeisureRouteKind(previousRouteKind)) {
      setIsReturnToLeisureOverlayVisible(false)
      clearResumeContext()
      promptedResumeAtRef.current = null
    }

    if (!isLeavingChat) {
      return
    }

    if (isResumeNavigationInFlightRef.current) {
      isResumeNavigationInFlightRef.current = false
      return
    }

    if (!resumeContext?.fromLeisure) {
      return
    }

    setIsReturnToLeisureOverlayVisible(false)
    clearResumeContext()
    promptedResumeAtRef.current = null
  }, [clearResumeContext, location.pathname, resumeContext?.fromLeisure])

  useEffect(() => {
    if (resumeContext?.fromLeisure) {
      return
    }

    setIsReturnToLeisureOverlayVisible(false)
    promptedResumeAtRef.current = null
  }, [resumeContext?.fromLeisure])

  useEffect(() => {
    if (!resumeContext?.fromLeisure) {
      return
    }

    if (!isChatRouteKind(currentRouteKind)) {
      return
    }

    if (chat.state.status !== 'sent') {
      return
    }

    if (promptedResumeAtRef.current === resumeContext.savedAt) {
      return
    }

    promptedResumeAtRef.current = resumeContext.savedAt
    setIsReturnToLeisureOverlayVisible(true)
  }, [chat.state.status, currentRouteKind, resumeContext])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  const handleReplyNow = () => {
    const interruptedMessageId = chat.activeMessage?.id ?? chat.latestUnresolvedMessage?.id ?? null

    if (isLeisureRouteKind(currentRouteKind)) {
      const isPlayerRoute = currentRouteKind === 'leisure_player'

      setResumeContext({
        routeKind: isPlayerRoute ? 'player' : 'browse',
        resumePath: `${location.pathname}${location.search}`,
        fallbackPath: resumeContext?.fallbackPath ?? ROUTE_PATHS.PATIENT_LEISURE,
        contentId: isPlayerRoute ? resumeContext?.contentId ?? null : null,
        categoryId: isPlayerRoute ? resumeContext?.categoryId ?? null : null,
        routeState: isPlayerRoute ? resumeContext?.routeState ?? null : null,
        playbackPositionSec: isPlayerRoute ? resumeContext?.playbackPositionSec ?? null : null,
        wasPlaying: isPlayerRoute ? resumeContext?.wasPlaying ?? false : false,
        canResumePlayback: isPlayerRoute ? resumeContext?.canResumePlayback ?? false : false,
        fromLeisure: true,
        interruptedMessageId,
        savedAt: Date.now(),
      })
    }

    chat.focusLatestPendingMessage()
    navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)
  }

  const handleInterruptLater = () => {
    if (isLeisureRouteKind(currentRouteKind)) {
      clearResumeContext()
      promptedResumeAtRef.current = null
    }

    chat.deferActiveMessage()
  }

  const handleReturnToLeisure = () => {
    if (!resumeContext) {
      setIsReturnToLeisureOverlayVisible(false)
      return
    }

    setIsReturnToLeisureOverlayVisible(false)
    promptedResumeAtRef.current = resumeContext.savedAt
    isResumeNavigationInFlightRef.current = true

    const targetPath = resumeContext.resumePath || resumeContext.fallbackPath || ROUTE_PATHS.PATIENT_LEISURE

    if (resumeContext.routeKind !== 'player') {
      clearResumeContext()
    }

    navigate(targetPath, { replace: true })
  }

  const handleStayInChat = () => {
    setIsReturnToLeisureOverlayVisible(false)
    clearResumeContext()
    promptedResumeAtRef.current = null
  }

  return (
    <>
      <Outlet />
      {!isCalibrationRoute ? (
        <button
          type="button"
          onClick={() => void handleLogout()}
          style={patientLogoutButtonStyle}
          aria-label="Log out"
        >
          Log out
        </button>
      ) : null}

      {!isCalibrationRoute && isGlobalMenuOpen ? (
        <Suspense fallback={null}>
          <GlobalMenuOverlay />
        </Suspense>
      ) : null}
      {!isCalibrationRoute ? <PatientTrackingGuardOverlay /> : null}

      {!isCalibrationRoute && chat.shouldShowInterruptOverlay ? (
        <Suspense fallback={null}>
          <IncomingInterruptOverlay
            visible={chat.shouldShowInterruptOverlay}
            message={chat.activeMessage}
            unreadCount={chat.unreadCount}
            currentRoute={chat.state.currentRoute}
            pausedByInterrupt={chat.state.isMediaPausedByInterrupt}
            onReplyNow={handleReplyNow}
            onLater={handleInterruptLater}
          />
        </Suspense>
      ) : null}

      {!isCalibrationRoute ? (
        <Suspense fallback={null}>
          <CallStatusOverlay />
        </Suspense>
      ) : null}

      {!isCalibrationRoute && isReturnToLeisureOverlayVisible ? (
        <Suspense fallback={null}>
          <ReturnToLeisureOverlay
            visible={isReturnToLeisureOverlayVisible}
            onReturnToLeisure={handleReturnToLeisure}
            onStayInChat={handleStayInChat}
          />
        </Suspense>
      ) : null}
    </>
  )
}

export default function PatientLayout() {
  const location = useLocation()

  return (
    <PatientIncomingChatProvider pathname={location.pathname}>
      <PatientLayoutShell />
    </PatientIncomingChatProvider>
  )
}
