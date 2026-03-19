import { Outlet, useLocation } from 'react-router-dom'
import IncomingInterruptOverlay from '../../components/patient/chat/IncomingInterruptOverlay'
import ReplyModePanel from '../../components/patient/chat/ReplyModePanel'
import DevChatTriggerPanel from '../../components/patient/chat/DevChatTriggerPanel'
import { usePatientIncomingChat, PatientIncomingChatProvider } from '../../hooks/usePatientIncomingChat'
import { PATIENT_CHAT_DEV_PANEL_ENABLED } from '../../services/mockPatientChatService'
import { ROUTE_PATHS } from '../router/routePaths'

function PatientLayoutShell() {
  const chat = usePatientIncomingChat()
  const location = useLocation()
  const isCalibrationRoute = location.pathname === ROUTE_PATHS.PATIENT_CALIBRATION

  return (
    <>
      <Outlet />

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
