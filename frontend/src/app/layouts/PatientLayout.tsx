import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import PatientTrackingGuardOverlay from '../../features/patient/input/components/PatientTrackingGuardOverlay'
import EyeTrackingRuntimeHost from '../../features/patient/input/components/EyeTrackingRuntimeHost'
import GazeDebugOverlay from '../../features/patient/input/components/GazeDebugOverlay'
import { useAuth } from '../../features/auth/hooks/useAuth'
import usePatientGlobalMenuActionListener from '../../features/patient/input/hooks/usePatientGlobalMenuActionListener'
import usePatientGazeClick from '../../features/patient/input/hooks/usePatientGazeClick'
import usePatientModeDwellSync from '../../features/patient/input/hooks/usePatientModeDwellSync'
import usePatientTrackingBridge from '../../features/patient/input/hooks/usePatientTrackingBridge'
import { getPatientEyeTrackingProfileId } from '../../features/patient/input/services/calibration/patientCalibrationService'
import {
  isPatientTrackingAvailable,
  isPatientTrackingBlocked,
  usePatientModeStore,
} from '../../features/patient/input/stores/patientModeStore'
import PatientDailyMoodOverlay from '../../features/patient/daily-mood/components/PatientDailyMoodOverlay'
import { PatientIncomingChatProvider } from '../../hooks/usePatientIncomingChat'
import { usePatientIncomingChat } from '../../hooks/patientIncomingChatContext'
import { createDailyMood, getTodayDailyMood } from '../../services/dailyMoodService'
import { usePatientLeisureResumeStore } from '../../stores/patientLeisureResumeStore'
import type { DailyMoodCreateRequestDto } from '../../types/dailyMood'
import { ROUTE_PATHS } from '../router/routePaths'

const GlobalMenuOverlay = lazy(() => import('../../features/patient/input/components/GlobalMenuOverlay'))
const IncomingInterruptOverlay = lazy(() => import('../../components/patient/chat/IncomingInterruptOverlay'))
const ReplyModePanel = lazy(() => import('../../components/patient/chat/ReplyModePanel'))
const ReturnToLeisureOverlay = lazy(
  () => import('../../components/patient/chat/ReturnToLeisureOverlay'),
)
const CallStatusOverlay = lazy(() => import('../../components/patient/CallStatusOverlay'))

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
  const { user } = useAuth()
  const location = useLocation()
  const [isDailyMoodOverlayVisible, setIsDailyMoodOverlayVisible] = useState(false)
  const [isDailyMoodSubmitting, setIsDailyMoodSubmitting] = useState(false)
  const [dailyMoodErrorMessage, setDailyMoodErrorMessage] = useState<string | null>(null)
  const [isReturnToLeisureOverlayVisible, setIsReturnToLeisureOverlayVisible] = useState(false)
  const previousPathnameRef = useRef(location.pathname)
  const promptedResumeAtRef = useRef<number | null>(null)
  const isResumeNavigationInFlightRef = useRef(false)
  const pendingReplyAfterTalkNavigationRef = useRef(false)
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const resumeContext = usePatientLeisureResumeStore(state => state.resumeContext)
  const setResumeContext = usePatientLeisureResumeStore(state => state.setResumeContext)
  const patchResumeContext = usePatientLeisureResumeStore(state => state.patchResumeContext)
  const clearResumeContext = usePatientLeisureResumeStore(state => state.clearResumeContext)
  const isCalibrationRoute = location.pathname === ROUTE_PATHS.PATIENT_CALIBRATION
  const isPatientMainRoute = location.pathname === ROUTE_PATHS.PATIENT_MAIN
  const isTrackingBlocked = isPatientTrackingBlocked(trackingStatus)
  const eyeTrackingProfileId = getPatientEyeTrackingProfileId(user)
  const currentRouteKind = chat.state.currentRoute?.kind ?? getPatientLayoutRouteKind(location.pathname)
  usePatientTrackingBridge({
    enabled: !isCalibrationRoute,
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
    if (!user || user.role !== 'patient') {
      setIsDailyMoodOverlayVisible(false)
      setIsDailyMoodSubmitting(false)
      setDailyMoodErrorMessage(null)
      return
    }

    if (isCalibrationRoute || !isPatientMainRoute) {
      setIsDailyMoodOverlayVisible(false)
      setIsDailyMoodSubmitting(false)
      setDailyMoodErrorMessage(null)
      return
    }

    let isMounted = true

    setIsDailyMoodSubmitting(false)
    setDailyMoodErrorMessage(null)

    void getTodayDailyMood(user.accessToken).then(result => {
      if (!isMounted) {
        return
      }

      if (!result.success) {
        console.warn('Daily mood overlay initialization failed.', result)
        setIsDailyMoodOverlayVisible(false)
        return
      }

      setIsDailyMoodOverlayVisible(result.data === null)
    })

    return () => {
      isMounted = false
    }
  }, [isCalibrationRoute, isPatientMainRoute, user?.accessToken, user?.id, user?.role])

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
    if (!pendingReplyAfterTalkNavigationRef.current) {
      return
    }

    if (location.pathname !== ROUTE_PATHS.PATIENT_TALK_MAIN) {
      return
    }

    pendingReplyAfterTalkNavigationRef.current = false
    chat.enterReplyMode()
  }, [chat, location.pathname])

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

  const handleReplyNow = () => {
    setIsReturnToLeisureOverlayVisible(false)
    promptedResumeAtRef.current = null

    if (isLeisureRouteKind(currentRouteKind)) {
      const interruptedMessageId = chat.activeMessage?.id ?? chat.latestUnresolvedMessage?.id ?? null

      if (resumeContext) {
        patchResumeContext({
          fromLeisure: true,
          interruptedMessageId,
        })
      } else {
        setResumeContext({
          routeKind: 'browse',
          resumePath: `${location.pathname}${location.search}`,
          fallbackPath: ROUTE_PATHS.PATIENT_LEISURE,
          contentId: null,
          categoryId: null,
          routeState: null,
          playbackPositionSec: null,
          wasPlaying: false,
          canResumePlayback: false,
          fromLeisure: true,
          interruptedMessageId,
          savedAt: Date.now(),
        })
      }
    }

    if (currentRouteKind === 'talk') {
      chat.enterReplyMode()
      return
    }

    pendingReplyAfterTalkNavigationRef.current = true
    navigate(
      {
        pathname: ROUTE_PATHS.PATIENT_TALK_MAIN,
        search: location.search,
      },
      {
        replace: false,
      },
    )
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

  const handleDailyMoodSubmit = async (request: DailyMoodCreateRequestDto) => {
    if (!user || user.role !== 'patient') {
      return
    }

    setIsDailyMoodSubmitting(true)
    setDailyMoodErrorMessage(null)

    const result = await createDailyMood(request, user.accessToken)

    if (!result.success) {
      if (result.code === 'MOOD-1201' || result.statusCode === 409) {
        setIsDailyMoodOverlayVisible(false)
        setIsDailyMoodSubmitting(false)
        setDailyMoodErrorMessage(null)
        return
      }

      setIsDailyMoodSubmitting(false)
      setDailyMoodErrorMessage(result.message)
      return
    }

    setIsDailyMoodOverlayVisible(false)
    setIsDailyMoodSubmitting(false)
    setDailyMoodErrorMessage(null)
  }

  return (
    <>
      <Outlet />
      {!isCalibrationRoute ? (
        <EyeTrackingRuntimeHost enabled={true} eyeTrackingProfileId={eyeTrackingProfileId} />
      ) : null}

      {!isCalibrationRoute && isGlobalMenuOpen ? (
        <Suspense fallback={null}>
          <GlobalMenuOverlay />
        </Suspense>
      ) : null}
      {!isCalibrationRoute ? <PatientTrackingGuardOverlay /> : null}
      {import.meta.env.DEV && !isCalibrationRoute ? <GazeDebugOverlay /> : null}

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

      {!isCalibrationRoute && chat.shouldShowReplyOverlay ? (
        <Suspense fallback={null}>
          <ReplyModePanel
            overlay
            message={chat.activeReplyMessage}
            status={chat.state.status}
            suggestionState={chat.state.suggestionState}
            fallbackState={chat.state.fallbackState}
            suggestions={chat.state.suggestions}
            selectedSuggestionId={chat.state.selectedSuggestionId}
            suggestionError={chat.state.suggestionError}
            sendError={chat.state.sendError}
            manualInputMode={chat.state.manualInputMode}
            manualDraft={chat.state.manualDraft}
            manualWordBank={chat.manualWordBank}
            unresolvedCount={chat.unresolvedCount}
            timeoutMs={chat.timeoutMs}
            onSelectSuggestion={chat.sendSuggestedReply}
            onRetrySuggestions={chat.retrySuggestions}
            onOpenManualInputSelect={chat.openManualInputSelect}
            onSelectManualInputMode={chat.setManualInputMode}
            onDraftChange={chat.updateManualDraft}
            onAppendWord={chat.appendManualWord}
            onClearDraft={chat.clearManualDraft}
            onSendManualReply={chat.sendManualReply}
            onDefer={chat.deferActiveMessage}
            onClose={chat.closeReplyMode}
            onOpenLatestPendingReply={chat.openLatestPendingReply}
          />
        </Suspense>
      ) : null}

      {isPatientMainRoute && isDailyMoodOverlayVisible ? (
        <PatientDailyMoodOverlay
          visible={isDailyMoodOverlayVisible}
          submitting={isDailyMoodSubmitting}
          errorMessage={dailyMoodErrorMessage}
          onSubmit={handleDailyMoodSubmit}
        />
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
