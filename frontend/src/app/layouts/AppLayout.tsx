import { Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { initFcm } from '../../services/fcmService'
import InAppNotification from '../../components/notification/InAppNotification'
import SosAlertOverlay from '../../components/notification/SosAlertOverlay'

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
          <InAppNotification />
          <SosAlertOverlay />
        </>
      )}
      <Outlet />
    </>
  )
}
