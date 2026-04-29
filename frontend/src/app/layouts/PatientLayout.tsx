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
import type { PatientSelectionSurface } from '../../features/patient/input/services/patientSelectionPolicy'
import {
  isPatientTrackingBlocked,
  usePatientModeStore,
} from '../../features/patient/input/stores/patientModeStore'
import PatientDailyMoodOverlay from '../../features/patient/daily-mood/components/PatientDailyMoodOverlay'
import { PatientIncomingChatProvider } from '../../hooks/usePatientIncomingChat'
import {
  usePatientIncomingChat,
  type PatientIncomingChatContextValue,
} from '../../hooks/patientIncomingChatContext'
import { createDailyMood, getTodayDailyMood } from '../../services/dailyMoodService'
import { usePatientLeisureResumeStore } from '../../stores/patientLeisureResumeStore'
import type { DailyMoodCreateRequestDto } from '../../types/dailyMood'
import { ROUTE_PATHS } from '../router/routePaths'

const GlobalMenuOverlay = lazy(() => import('../../features/patient/input/components/GlobalMenuOverlay'))
const IncomingInterruptOverlay = lazy(() => import('../../components/patient/chat/IncomingInterruptOverlay'))
const LeisureReplyReturnOverlay = lazy(() => import('../../components/patient/chat/LeisureReplyReturnOverlay'))
const ReplyModePanel = lazy(() => import('../../components/patient/chat/ReplyModePanel'))
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

function getPatientSelectionSurface(pathname: string): PatientSelectionSurface {
  if (pathname === ROUTE_PATHS.PATIENT_MAIN) {
    return 'main'
  }

  if (pathname === ROUTE_PATHS.PATIENT_TALK_MAIN) {
    return 'menu'
  }

  if (pathname === ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD) {
    return 'keyboard'
  }

  if (pathname.startsWith(ROUTE_PATHS.PATIENT_CUSTOM_TALK)) {
    return 'custom-talk'
  }

  if (
    pathname.startsWith(ROUTE_PATHS.PATIENT_BODY_MIND) ||
    pathname.startsWith(ROUTE_PATHS.PATIENT_FAVORITES)
  ) {
    return 'menu'
  }

  return 'common'
}

type PatientChatDebugWindow = Window & {
  __patientChatDebug?: {
    presets: string[]
    triggerIncomingPreset: PatientIncomingChatContextValue['triggerIncomingPreset']
    triggerDuplicateMessage: () => void
    openLatestPendingReply: () => void
  }
}

function PatientLayoutShell() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const { user } = useAuth()
  const location = useLocation()
  const [isDailyMoodOverlayVisible, setIsDailyMoodOverlayVisible] = useState(false)
  const [isDailyMoodSubmitting, setIsDailyMoodSubmitting] = useState(false)
  const [dailyMoodErrorMessage, setDailyMoodErrorMessage] = useState<string | null>(null)
  const previousPathnameRef = useRef(location.pathname)
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
  const currentSelectionSurface = getPatientSelectionSurface(location.pathname)
  const currentRoutePath = `${location.pathname}${location.search}`
  const shouldShowLeisureReturnOverlay =
    !isCalibrationRoute &&
    chat.state.status === 'reply_completion_pending' &&
    isLeisureRouteKind(currentRouteKind)
  usePatientTrackingBridge({
    enabled: !isCalibrationRoute,
  })
  usePatientModeDwellSync({
    enabled: !isCalibrationRoute,
  })
  usePatientGlobalMenuActionListener({
    enabled: !isCalibrationRoute,
  })
  usePatientGazeClick({
    enabled: false, // 블링크 클릭으로 대체 — dwell 비활성화
    selectionSurface: currentSelectionSurface,
  })

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-patient-mode', 'true')

    return () => {
      root.removeAttribute('data-patient-mode')
    }
  }, [])

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
      clearResumeContext()
    }

    if (!isLeavingChat) {
      return
    }

    if (!resumeContext?.fromLeisure) {
      return
    }

    clearResumeContext()
  }, [clearResumeContext, location.pathname, resumeContext?.fromLeisure])

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
    if (chat.state.status !== 'reply_completion_pending') {
      return
    }

    if (isLeisureRouteKind(currentRouteKind)) {
      return
    }

    clearResumeContext()
    chat.completeReplyCompletion()
  }, [chat, clearResumeContext, currentRouteKind])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    const debugWindow = window as PatientChatDebugWindow

    debugWindow.__patientChatDebug = {
      presets: chat.availablePresets.map(preset => preset.key),
      triggerIncomingPreset: presetKey => {
        chat.triggerIncomingPreset(presetKey as (typeof chat.availablePresets)[number]['key'])
      },
      triggerDuplicateMessage: chat.triggerDuplicateMessage,
      openLatestPendingReply: chat.openLatestPendingReply,
    }

    return () => {
      delete debugWindow.__patientChatDebug
    }
  }, [chat])

  const handleReplyNow = () => {
    if (isLeisureRouteKind(currentRouteKind)) {
      const interruptedMessageId = chat.activeMessage?.id ?? chat.latestUnresolvedMessage?.id ?? null

      if (resumeContext) {
        patchResumeContext(currentContext => ({
          routeKind: currentContext.routeKind,
          resumePath:
            currentContext.routeKind === 'player'
              ? currentContext.resumePath || currentRoutePath
              : currentRoutePath,
          fallbackPath:
            currentContext.routeKind === 'player'
              ? currentContext.fallbackPath || ROUTE_PATHS.PATIENT_LEISURE
              : ROUTE_PATHS.PATIENT_LEISURE,
          fromLeisure: true,
          interruptedMessageId,
          savedAt: Date.now(),
        }))
      } else {
        setResumeContext({
          routeKind: currentRouteKind === 'leisure_player' ? 'player' : 'browse',
          resumePath: currentRoutePath,
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

      chat.enterReplyMode()
      return
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

  const handleReturnToLeisure = () => {
    chat.completeReplyCompletion()

    if (
      resumeContext?.fromLeisure &&
      resumeContext.routeKind === 'player' &&
      resumeContext.resumePath &&
      resumeContext.resumePath !== currentRoutePath
    ) {
      navigate(resumeContext.resumePath, { replace: true })
      return
    }

    if (currentRouteKind !== 'leisure_player') {
      clearResumeContext()
    }
  }

  const handleReturnToMain = () => {
    clearResumeContext()
    chat.completeReplyCompletion()
    navigate({
      pathname: ROUTE_PATHS.PATIENT_MAIN,
      search: location.search,
    })
  }

  const handleInterruptLater = () => {
    if (isLeisureRouteKind(currentRouteKind)) {
      clearResumeContext()
    }

    chat.deferActiveMessage()
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
      {!isCalibrationRoute ? <GazeDebugOverlay /> : null}

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

      {!isCalibrationRoute && chat.shouldShowReplyOverlay ? (
        <Suspense fallback={null}>
          <ReplyModePanel
            overlay
            message={chat.activeReplyMessage}
            status={chat.state.status}
            recommendationMode={chat.state.recommendationMode}
            categoryState={chat.state.categoryState}
            categories={chat.state.categories}
            selectedCategoryKey={chat.state.selectedCategoryKey}
            categoryPage={chat.state.categoryPage}
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
            onSelectCategory={chat.selectRecommendationCategory}
            onChangeCategoryPage={chat.setRecommendationCategoryPage}
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

      {shouldShowLeisureReturnOverlay ? (
        <Suspense fallback={null}>
          <LeisureReplyReturnOverlay
            visible={shouldShowLeisureReturnOverlay}
            onReturnToLeisure={handleReturnToLeisure}
            onReturnToMain={handleReturnToMain}
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
