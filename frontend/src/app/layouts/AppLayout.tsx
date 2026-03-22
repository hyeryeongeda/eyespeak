import { Outlet } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { initFcm } from '../../services/fcmService'
import InAppNotification from '../../components/notification/InAppNotification'
import SosAlertOverlay from '../../components/notification/SosAlertOverlay'

const GuardianSessionManager = lazy(() => import('../../features/auth/components/GuardianSessionManager'))

export default function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const isGuardian = isAuthenticated && user?.role === 'guardian'
  const fcmInitialized = useRef(false)

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
          <Suspense fallback={null}>
            <GuardianSessionManager />
          </Suspense>
          <InAppNotification />
          <SosAlertOverlay />
        </>
      )}
      <Outlet />
    </>
  )
}
