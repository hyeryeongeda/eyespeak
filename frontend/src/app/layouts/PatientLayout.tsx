import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import GlobalMenuOverlay from '../../components/patient/GlobalMenuOverlay'
import IncomingInterruptOverlay from '../../components/patient/chat/IncomingInterruptOverlay'
import ReplyModePanel from '../../components/patient/chat/ReplyModePanel'
import DevChatTriggerPanel from '../../components/patient/chat/DevChatTriggerPanel'
import PatientTrackingGuardOverlay from '../../components/patient/PatientTrackingGuardOverlay'
import { useAuth } from '../../features/auth/hooks/useAuth'
import usePatientGlobalMenuActionListener from '../../hooks/usePatientGlobalMenuActionListener'
import usePatientGazeClick from '../../hooks/usePatientGazeClick'
import usePatientModeDwellSync from '../../hooks/usePatientModeDwellSync'
import usePatientRuntimeTracking from '../../hooks/usePatientRuntimeTracking'
import usePatientTrackingBridge from '../../hooks/usePatientTrackingBridge'
import { usePatientIncomingChat, PatientIncomingChatProvider } from '../../hooks/usePatientIncomingChat'
import { PATIENT_CHAT_DEV_PANEL_ENABLED } from '../../services/mockPatientChatService'
import {
  isPatientTrackingAvailable,
  isPatientTrackingBlocked,
  usePatientModeStore,
} from '../../stores/patientModeStore'
import { ROUTE_PATHS } from '../router/routePaths'

function PatientLayoutShell() {
  const chat = usePatientIncomingChat()
  const { user } = useAuth()
  const location = useLocation()
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const isCalibrationRoute = location.pathname === ROUTE_PATHS.PATIENT_CALIBRATION
  const isTrackingBlocked = isPatientTrackingBlocked(trackingStatus)

  usePatientTrackingBridge({
    enabled: !isCalibrationRoute,
  })
  usePatientRuntimeTracking({
    enabled: !isCalibrationRoute,
    patientId: user?.id ?? null,
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

  return (
    <>
      <Outlet />

      {!isCalibrationRoute ? <GlobalMenuOverlay /> : null}
      {!isCalibrationRoute ? <PatientTrackingGuardOverlay /> : null}

      {!isCalibrationRoute ? (
        <IncomingInterruptOverlay
          visible={chat.shouldShowInterruptOverlay}
          message={chat.activeMessage}
          unreadCount={chat.unreadCount}
          currentRoute={chat.state.currentRoute}
          pausedByInterrupt={chat.state.isMediaPausedByInterrupt}
          onReplyNow={() => chat.enterReplyMode(chat.activeMessage?.id ?? undefined)}
          onLater={chat.deferActiveMessage}
        />
      ) : null}

      {!isCalibrationRoute && chat.shouldShowReplyOverlay ? (
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
      ) : null}

      {!isCalibrationRoute && PATIENT_CHAT_DEV_PANEL_ENABLED ? (
        <DevChatTriggerPanel
          availablePresets={chat.availablePresets}
          nextSendOutcome={chat.state.nextSendOutcome}
          timeoutMs={chat.timeoutMs}
          unreadCount={chat.unreadCount}
          lastEventLabel={chat.state.lastEventLabel}
          onTriggerPreset={chat.triggerIncomingPreset}
          onTriggerDuplicate={chat.triggerDuplicateMessage}
          onSetNextSendOutcome={chat.setNextSendOutcome}
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
