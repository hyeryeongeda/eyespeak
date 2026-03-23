import { lazy, Suspense, useEffect } from 'react'
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
import { ROUTE_PATHS } from '../router/routePaths'

const GlobalMenuOverlay = lazy(() => import('../../features/patient/input/components/GlobalMenuOverlay'))
const IncomingInterruptOverlay = lazy(() => import('../../components/patient/chat/IncomingInterruptOverlay'))

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

function PatientLayoutShell() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const { user, logout } = useAuth()
  const location = useLocation()
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)
  const isGlobalMenuOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const isCalibrationRoute = location.pathname === ROUTE_PATHS.PATIENT_CALIBRATION
  const isTrackingBlocked = isPatientTrackingBlocked(trackingStatus)
  const eyeTrackingProfileId = getPatientEyeTrackingProfileId(user)
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

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
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
            onReplyNow={() => {
              chat.focusLatestPendingMessage()
              navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)
            }}
            onLater={chat.deferActiveMessage}
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
