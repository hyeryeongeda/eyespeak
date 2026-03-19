import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import {
  setStoredEntryMode,
  setStoredRole,
  storeGuardianSessionExitReason,
} from '../../../services/authStorage'
import type { GuardianSessionExitReason } from '../../../types/auth'
import { useAuth } from '../hooks/useAuth'

const GUARDIAN_IDLE_TIMEOUT_MS = 20 * 60 * 1000
const GUARDIAN_SESSION_WARNING_MS = 60 * 1000
const GUARDIAN_REFRESH_INTERVAL_MS = 10 * 60 * 1000

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: '24px',
  backgroundColor: 'rgba(28, 41, 58, 0.42)',
  backdropFilter: 'blur(7px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1400,
}

const panelStyle: CSSProperties = {
  width: 'min(560px, 100%)',
  padding: '32px',
  borderRadius: '28px',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  border: '1px solid rgba(212, 222, 234, 0.92)',
  boxShadow: '0 34px 70px rgba(40, 53, 73, 0.22)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 14px',
  borderRadius: '999px',
  backgroundColor: '#eef4fb',
  color: '#5a779c',
  fontSize: '13px',
  fontWeight: 800,
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(1.9rem, 3vw, 2.45rem)',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#5f7186',
  fontSize: '15px',
  lineHeight: 1.6,
  fontWeight: 600,
}

const countdownStyle: CSSProperties = {
  margin: 0,
  color: '#2b4f7d',
  fontSize: '42px',
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: '-0.04em',
}

const detailBoxStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '20px',
  backgroundColor: '#f5f8fb',
  border: '1px solid #dbe4ec',
}

const detailTextStyle: CSSProperties = {
  margin: 0,
  color: '#53657c',
  fontSize: '14px',
  lineHeight: 1.6,
  fontWeight: 600,
}

const actionRowStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

const buttonBaseStyle: CSSProperties = {
  minWidth: '148px',
  height: '54px',
  padding: '0 22px',
  borderRadius: '999px',
  fontSize: '16px',
  fontWeight: 800,
  cursor: 'pointer',
}

const primaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid #6f95c7',
  background: 'linear-gradient(135deg, #e9f2ff 0%, #dce9ff 100%)',
  color: '#24364d',
}

const secondaryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  border: '1px solid #d6e0e9',
  backgroundColor: '#ffffff',
  color: '#41536c',
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function GuardianSessionManager() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout, refreshSession } = useAuth()
  const [remainingMs, setRemainingMs] = useState(GUARDIAN_IDLE_TIMEOUT_MS)
  const [isWarningVisible, setIsWarningVisible] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lastActivityAtRef = useRef(Date.now())
  const isRefreshingRef = useRef(false)
  const isLoggingOutRef = useRef(false)
  const expireGuardianSessionRef = useRef<(reason: GuardianSessionExitReason) => Promise<void>>(
    async () => {},
  )
  const performGuardianRefreshRef = useRef<() => Promise<boolean>>(async () => true)

  const isGuardianAuthenticated = isAuthenticated && user?.role === 'guardian'

  expireGuardianSessionRef.current = async (reason: GuardianSessionExitReason) => {
    if (isLoggingOutRef.current) {
      return
    }

    isLoggingOutRef.current = true
    setIsWarningVisible(false)
    setStoredRole('guardian')
    setStoredEntryMode('login')
    storeGuardianSessionExitReason(reason)

    try {
      await logout()
    } finally {
      navigate(ROUTE_PATHS.AUTH_LOGIN_CARE, { replace: true })
      isLoggingOutRef.current = false
    }
  }

  const handleManualLogout = async () => {
    if (isLoggingOutRef.current) {
      return
    }

    isLoggingOutRef.current = true
    setIsWarningVisible(false)
    setStoredRole('guardian')
    setStoredEntryMode('login')

    try {
      await logout()
    } finally {
      navigate(ROUTE_PATHS.AUTH_LOGIN_CARE, { replace: true })
      isLoggingOutRef.current = false
    }
  }

  performGuardianRefreshRef.current = async () => {
    if (!isGuardianAuthenticated || !user?.refreshToken || isRefreshingRef.current || isLoggingOutRef.current) {
      return true
    }

    isRefreshingRef.current = true
    setIsRefreshing(true)

    try {
      const result = await refreshSession()

      if (!result.success) {
        await expireGuardianSessionRef.current('refresh-failed')
        return false
      }

      return true
    } finally {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }
  }

  const keepGuardianSessionAlive = async () => {
    const now = Date.now()

    if (now - lastActivityAtRef.current >= GUARDIAN_IDLE_TIMEOUT_MS) {
      await expireGuardianSessionRef.current('idle-timeout')
      return
    }

    lastActivityAtRef.current = now
    setRemainingMs(GUARDIAN_IDLE_TIMEOUT_MS)
    setIsWarningVisible(false)

    if (user?.refreshToken) {
      await performGuardianRefreshRef.current()
    }
  }

  useEffect(() => {
    if (!isGuardianAuthenticated) {
      lastActivityAtRef.current = Date.now()
      setRemainingMs(GUARDIAN_IDLE_TIMEOUT_MS)
      setIsWarningVisible(false)
      return
    }

    lastActivityAtRef.current = Date.now()
    setRemainingMs(GUARDIAN_IDLE_TIMEOUT_MS)
    setIsWarningVisible(false)

    const handleActivity = () => {
      if (isLoggingOutRef.current) {
        return
      }

      const now = Date.now()

      if (now - lastActivityAtRef.current >= GUARDIAN_IDLE_TIMEOUT_MS) {
        void expireGuardianSessionRef.current('idle-timeout')
        return
      }

      lastActivityAtRef.current = now
      setRemainingMs(GUARDIAN_IDLE_TIMEOUT_MS)
      setIsWarningVisible(false)
    }

    window.addEventListener('pointerdown', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('wheel', handleActivity, { passive: true })
    window.addEventListener('touchstart', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('wheel', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [isGuardianAuthenticated])

  useEffect(() => {
    if (!isGuardianAuthenticated) {
      return
    }

    const syncSessionWindow = () => {
      const elapsedMs = Date.now() - lastActivityAtRef.current
      const nextRemainingMs = Math.max(0, GUARDIAN_IDLE_TIMEOUT_MS - elapsedMs)
      setRemainingMs(nextRemainingMs)
      setIsWarningVisible(
        nextRemainingMs > 0 && nextRemainingMs <= GUARDIAN_SESSION_WARNING_MS,
      )

      if (nextRemainingMs <= 0 && !isLoggingOutRef.current) {
        void expireGuardianSessionRef.current('idle-timeout')
      }
    }

    syncSessionWindow()

    const timerId = window.setInterval(syncSessionWindow, 1000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isGuardianAuthenticated])

  useEffect(() => {
    if (!isGuardianAuthenticated || !user?.refreshToken) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return
      }

      const idleMs = Date.now() - lastActivityAtRef.current

      if (idleMs >= GUARDIAN_IDLE_TIMEOUT_MS - GUARDIAN_SESSION_WARNING_MS) {
        return
      }

      void performGuardianRefreshRef.current()
    }, GUARDIAN_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isGuardianAuthenticated, user?.refreshToken])

  if (!isGuardianAuthenticated || !isWarningVisible) {
    return null
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="guardian-session-title">
      <div style={panelStyle}>
        <span style={badgeStyle}>보호자 세션 만료 안내</span>
        <h2 id="guardian-session-title" style={titleStyle}>
          보호자 세션이 곧 종료됩니다.
        </h2>
        <p style={descriptionStyle}>
          일정 시간 동안 활동이 없으면 보호자 화면은 자동 로그아웃됩니다. 계속 사용하려면
          아래에서 세션을 연장해주세요.
        </p>

        <div style={detailBoxStyle}>
          <p style={countdownStyle}>{formatRemainingTime(remainingMs)}</p>
          <p style={{ ...detailTextStyle, marginTop: '10px' }}>
            남은 시간 안에 연장하지 않으면 보호자 로그인 화면으로 이동합니다.
          </p>
        </div>

        <div style={actionRowStyle}>
          <button
            type="button"
            style={isRefreshing ? { ...primaryButtonStyle, opacity: 0.72 } : primaryButtonStyle}
            onClick={() => void keepGuardianSessionAlive()}
            disabled={isRefreshing}
          >
            {isRefreshing ? '세션 연장 중...' : '계속 사용하기'}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void handleManualLogout()}
          >
            지금 로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
