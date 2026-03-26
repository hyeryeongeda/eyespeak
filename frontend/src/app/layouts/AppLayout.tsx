import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import TtsPlaybackOverlay from '../../components/tts/TtsPlaybackOverlay'
import { initFcm } from '../../services/fcmService'
import InAppNotification from '../../components/notification/InAppNotification'
import SosAlertOverlay from '../../components/notification/SosAlertOverlay'
import { stopActiveSynthesizeTtsPlayback } from '../../services/ttsService'

let hasAttemptedSessionBootstrap = false

export default function AppLayout() {
  const location = useLocation()
  const { isAuthenticated, user, refreshSession } = useAuth()
  const isGuardian = isAuthenticated && user?.role === 'guardian'
  const fcmInitialized = useRef(false)
  const previousLocationKeyRef = useRef(location.key)

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

  useEffect(() => {
    if (previousLocationKeyRef.current === location.key) {
      return
    }

    previousLocationKeyRef.current = location.key
    stopActiveSynthesizeTtsPlayback()
  }, [location.key])

  useEffect(() => () => {
    stopActiveSynthesizeTtsPlayback()
  }, [])

  return (
    <>
      <TtsPlaybackOverlay />
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
