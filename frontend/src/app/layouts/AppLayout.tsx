import { Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { initFcm } from '../../services/fcmService'
import InAppNotification from '../../components/notification/InAppNotification'
import SosAlertOverlay from '../../components/notification/SosAlertOverlay'

let hasAttemptedSessionBootstrap = false

export default function AppLayout() {
  const { isAuthenticated, user, refreshSession } = useAuth()
  const isGuardian = isAuthenticated && user?.role === 'guardian'
  const fcmInitialized = useRef(false)

  useEffect(() => {
    if (hasAttemptedSessionBootstrap || !isAuthenticated || !user?.refreshToken) {
      return
    }

    hasAttemptedSessionBootstrap = true
    void refreshSession()
  }, [isAuthenticated, refreshSession, user?.refreshToken])

  useEffect(() => {
    if (isGuardian && !fcmInitialized.current) {
      fcmInitialized.current = true
      initFcm()
    }
  }, [isGuardian])

  return (
    <>
      {isGuardian && (
        <>
          <InAppNotification />
          <SosAlertOverlay />
        </>
      )}
      <Outlet />
    </>
  )
}
