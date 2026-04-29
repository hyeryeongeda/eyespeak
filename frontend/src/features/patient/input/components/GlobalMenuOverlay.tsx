import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { useAuth } from '../../../auth/hooks/useAuth'
import { useDwell } from '../hooks/useDwell'
import { useTracking } from '../hooks/useTracking'
import {
  emitPatientGlobalMenuAction,
  PATIENT_DOUBLE_BLINK_EVENT,
  type PatientGlobalMenuActionId,
  type PatientDoubleBlinkDetail,
} from '../services/patientModeBridge'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import {
  getRemainingPatientSosCooldownMs,
  requestMockPatientSos,
} from '../../../../services/patientSosService'
import { isPatientTrackingAvailable, usePatientModeStore } from '../stores/patientModeStore'

type GlobalMenuTargetId = PatientGlobalMenuActionId

const ACTION_FEEDBACK_DELAY_MS = 180
const SOS_COOLDOWN_SYNC_INTERVAL_MS = 250

const responsiveStyle = `
  @media (max-width: 768px) {
    .patient-global-menu-shell {
      padding: 20px;
    }

    .patient-global-menu-panel {
      padding: 22px;
      gap: 18px;
    }

    .patient-global-menu-grid {
      gap: 12px;
    }
  }
`

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1150,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'clamp(24px, 4vw, 40px)',
  backgroundColor: 'rgba(13, 22, 35, 0.52)',
  backdropFilter: 'blur(10px)',
}

const panelStyle: CSSProperties = {
  width: 'min(960px, 100%)',
  minHeight: 'min(76dvh, 720px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
  padding: 'clamp(24px, 3vw, 32px)',
  borderRadius: '32px',
  background:
    'linear-gradient(180deg, rgba(247, 250, 255, 0.96) 0%, rgba(239, 244, 253, 0.98) 100%)',
  boxShadow: '0 34px 70px rgba(9, 20, 35, 0.24)',
  boxSizing: 'border-box',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#5d7391',
  fontSize: '14px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const titleStyle: CSSProperties = {
  margin: '10px 0 0',
  color: '#21344f',
  fontSize: 'clamp(2rem, 3vw, 2.6rem)',
  fontWeight: 900,
  lineHeight: 1.05,
  letterSpacing: '-0.04em',
}

const subtitleStyle: CSSProperties = {
  margin: '10px 0 0',
  color: '#61748f',
  fontSize: '16px',
  fontWeight: 700,
  lineHeight: 1.5,
}

const statusChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'flex-start',
  minHeight: '42px',
  padding: '0 16px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.86)',
  border: '1px solid rgba(148, 165, 189, 0.28)',
  color: '#4a617d',
  fontSize: '14px',
  fontWeight: 800,
  boxShadow: '0 10px 24px rgba(84, 102, 131, 0.08)',
}

const gridStyle: CSSProperties = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
  minHeight: 0,
}

const buttonBaseStyle: CSSProperties = {
  position: 'relative',
  appearance: 'none',
  width: '100%',
  minHeight: 0,
  border: 'none',
  borderRadius: '28px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  textAlign: 'left',
  transition: 'transform 0.16s ease, opacity 0.16s ease, box-shadow 0.16s ease',
}

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
  fontWeight: 900,
  letterSpacing: '-0.05em',
  lineHeight: 1,
}

const helperTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)',
  fontWeight: 700,
  lineHeight: 1.45,
  opacity: 0.86,
}

const footerTextStyle: CSSProperties = {
  margin: 0,
  color: '#70829d',
  fontSize: '14px',
  fontWeight: 700,
}

function formatSeconds(seconds: number) {
  return `${Math.max(1, seconds)}초`
}

function getMenuButtonStyle(args: {
  targetId: GlobalMenuTargetId
  isPending: boolean
  disabled: boolean
}): CSSProperties {
  const { targetId, isPending, disabled } = args

  const toneByTargetId: Record<GlobalMenuTargetId, CSSProperties> = {
    yes: {
      background: 'linear-gradient(135deg, #eef9f1 0%, #dff2e5 100%)',
      color: '#1e5a39',
      boxShadow: '0 18px 34px rgba(67, 132, 98, 0.12)',
    },
    no: {
      background: 'linear-gradient(135deg, #edf2f8 0%, #e2eaf5 100%)',
      color: '#304764',
      boxShadow: '0 18px 34px rgba(77, 101, 138, 0.12)',
    },
    sos: {
      background: 'linear-gradient(135deg, #fff1eb 0%, #ffdacc 100%)',
      color: '#8c341d',
      boxShadow: '0 18px 34px rgba(177, 87, 54, 0.14)',
    },
    home: {
      background: 'linear-gradient(135deg, #edf4ff 0%, #dce9ff 100%)',
      color: '#214c86',
      boxShadow: '0 18px 34px rgba(66, 108, 170, 0.14)',
    },
  }

  return {
    ...buttonBaseStyle,
    ...toneByTargetId[targetId],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.54 : 1,
    transform: isPending ? 'scale(0.985)' : 'scale(1)',
  }
}

export default function GlobalMenuOverlay() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const gridRef = useRef<HTMLDivElement | null>(null)
  const actionTimerRef = useRef<number | null>(null)
  const isOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)
  const dwellDurationMs = usePatientModeStore(state => state.globalMenuDwellDurationMs)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const [pendingTargetId, setPendingTargetId] = useState<GlobalMenuTargetId | null>(null)
  const [sosRemainingMs, setSosRemainingMs] = useState(0)

  const patientId = user?.id ?? 'patient-guest'
  const isTrackingReady = isPatientTrackingAvailable(trackingStatus)
  const isSosDisabled = sosRemainingMs > 0
  const sosCooldownSeconds = Math.ceil(sosRemainingMs / 1000)

  const { hoveredTargetId, inputSource } = useTracking<GlobalMenuTargetId>({
    containerRef: gridRef,
    enabled: isOpen && isTrackingReady && pendingTargetId === null,
  })
  const isGazeSelectionActive = inputSource === 'gaze'

  useDwell<GlobalMenuTargetId>({
    hoveredTargetId: isGazeSelectionActive ? hoveredTargetId : null,
    dwellDurationMs,
    disabled: !isOpen || !isTrackingReady || pendingTargetId !== null,
    onCommit: targetId => {
      queueAction(targetId, 'gaze')
    },
  })

  useEffect(() => {
    const syncSosCooldown = () => {
      setSosRemainingMs(getRemainingPatientSosCooldownMs(patientId))
    }

    syncSosCooldown()

    if (!isOpen) {
      return
    }

    const timerId = window.setInterval(syncSosCooldown, SOS_COOLDOWN_SYNC_INTERVAL_MS)

    return () => {
      window.clearInterval(timerId)
    }
  }, [isOpen, patientId])

  useEffect(() => {
    return () => {
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      return
    }

    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current)
      actionTimerRef.current = null
    }

    setPendingTargetId(null)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return
    }

    const handleDoubleBlink = (event: Event) => {
      const doubleBlinkEvent = event as CustomEvent<PatientDoubleBlinkDetail>
      const targetId = inputSource === 'gaze' ? hoveredTargetId : null

      if (import.meta.env.DEV) {
        console.info('[patient-input] global menu double blink received', {
          targetId,
          inputSource,
          pendingTargetId,
          isTrackingReady,
          isSosDisabled,
        })
      }

      if (!isTrackingReady) {
        return
      }

      if (!targetId) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu double blink skipped because no active target is resolved')
        }

        return
      }

      if (pendingTargetId !== null) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu double blink skipped because an action is already pending', {
            targetId,
            pendingTargetId,
          })
        }

        return
      }

      if (targetId === 'sos' && isSosDisabled) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu double blink skipped because SOS is cooling down', {
            targetId,
            sosRemainingMs,
          })
        }

        return
      }

      doubleBlinkEvent.preventDefault()

      if (import.meta.env.DEV) {
        console.info('[patient-input] global menu double blink confirmed', {
          targetId,
        })
      }

      queueAction(targetId, 'gaze-blink')
    }

    window.addEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink as EventListener)

    return () => {
      window.removeEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink as EventListener)
    }
  }, [hoveredTargetId, inputSource, isOpen, isSosDisabled, isTrackingReady, pendingTargetId, sosRemainingMs])

  function queueAction(
    targetId: GlobalMenuTargetId,
    source: 'pointer' | 'gaze' | 'gaze-blink' = 'pointer',
  ) {
    if (!isOpen || !isTrackingReady || pendingTargetId !== null) {
      if (import.meta.env.DEV) {
        console.info('[patient-input] global menu action blocked', {
          targetId,
          source,
          reason: !isOpen ? 'menu-closed' : !isTrackingReady ? 'tracking-not-ready' : 'pending-action',
          pendingTargetId,
        })
      }

      return
    }

    if (targetId === 'sos' && isSosDisabled) {
      if (import.meta.env.DEV) {
        console.info('[patient-input] global menu action blocked', {
          targetId,
          source,
          reason: 'sos-cooldown',
          sosRemainingMs,
        })
      }

      return
    }

    if (source === 'gaze' || source === 'gaze-blink') {
      submitActiveEyeTrackingSelectionFeedback()
    }

    if (import.meta.env.DEV) {
      console.info('[patient-input] global menu action queued', {
        targetId,
        source,
      })
    }

    setPendingTargetId(targetId)

    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current)
    }

    actionTimerRef.current = window.setTimeout(() => {
      actionTimerRef.current = null
      void commitAction(targetId)
    }, ACTION_FEEDBACK_DELAY_MS)
  }

  async function commitAction(targetId: GlobalMenuTargetId) {
    if (!isTrackingReady) {
      setPendingTargetId(null)
      return
    }

    try {
      if (targetId === 'yes') {
        const handled = emitPatientGlobalMenuAction('yes')

        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu action committed', {
            targetId,
            handled,
          })
        }

        closeGlobalMenu()
        return
      }

      if (targetId === 'no') {
        const handled = emitPatientGlobalMenuAction('no')

        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu action committed', {
            targetId,
            handled,
          })
        }

        closeGlobalMenu()
        return
      }

      if (targetId === 'home') {
        const handled = emitPatientGlobalMenuAction('home')

        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu action committed', {
            targetId,
            handled,
          })
        }

        closeGlobalMenu()
        navigate(ROUTE_PATHS.PATIENT_MAIN)
        return
      }

      const result = await requestMockPatientSos(patientId, user)
      setSosRemainingMs(getRemainingPatientSosCooldownMs(patientId))

      if (!result.success) {
        if (import.meta.env.DEV) {
          console.info('[patient-input] global menu SOS request failed', {
            targetId,
            message: result.message,
          })
        }

        return
      }

      const handled = emitPatientGlobalMenuAction('sos')

      if (import.meta.env.DEV) {
        console.info('[patient-input] global menu action committed', {
          targetId,
          handled,
        })
      }

      closeGlobalMenu()
    } finally {
      setPendingTargetId(null)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <style>{responsiveStyle}</style>
      <div style={overlayStyle} className="patient-global-menu-shell" role="presentation">
        <section
          className="patient-global-menu-panel"
          style={panelStyle}
          aria-modal="true"
          role="dialog"
          aria-label="환자 글로벌 메뉴"
        >
          <div style={headerRowStyle}>
            <div>
              <p style={eyebrowStyle}>Patient Global Menu</p>
              <h2 style={titleStyle}>더블블링크로 열고 닫는 공통 메뉴</h2>
              <p style={subtitleStyle}>
                메뉴가 열린 뒤에는 각 영역을 {formatSeconds(dwellDurationMs / 1000)} 동안
                유지하면 선택됩니다.
              </p>
            </div>
            <div style={statusChipStyle}>더블블링크로 즉시 닫기</div>
          </div>

          <div ref={gridRef} className="patient-global-menu-grid" style={gridStyle}>
            <button
              type="button"
              data-tracking-id={pendingTargetId === null ? 'yes' : undefined}
              data-gaze-selection="local"
              disabled={pendingTargetId !== null}
              onClick={() => queueAction('yes')}
              style={getMenuButtonStyle({
                targetId: 'yes',
                isPending: pendingTargetId === 'yes',
                disabled: pendingTargetId !== null,
              })}
            >
              <p style={labelStyle}>네</p>
              <p style={helperTextStyle}>공통 positive action 진입점</p>
            </button>

            <button
              type="button"
              data-tracking-id={pendingTargetId === null ? 'no' : undefined}
              data-gaze-selection="local"
              disabled={pendingTargetId !== null}
              onClick={() => queueAction('no')}
              style={getMenuButtonStyle({
                targetId: 'no',
                isPending: pendingTargetId === 'no',
                disabled: pendingTargetId !== null,
              })}
            >
              <p style={labelStyle}>아니오</p>
              <p style={helperTextStyle}>공통 negative action 진입점</p>
            </button>

            <button
              type="button"
              data-tracking-id={isSosDisabled || pendingTargetId !== null ? undefined : 'sos'}
              data-gaze-selection="local"
              disabled={isSosDisabled || pendingTargetId !== null}
              onClick={() => queueAction('sos')}
              style={getMenuButtonStyle({
                targetId: 'sos',
                isPending: pendingTargetId === 'sos',
                disabled: isSosDisabled || pendingTargetId !== null,
              })}
            >
              <p style={labelStyle}>SOS</p>
              <p style={helperTextStyle}>
                {isSosDisabled
                  ? `${formatSeconds(sosCooldownSeconds)} 후 다시 선택 가능`
                  : '사이렌 재생 후 30초 쿨다운'}
              </p>
            </button>

            <button
              type="button"
              data-tracking-id={pendingTargetId === null ? 'home' : undefined}
              data-gaze-selection="local"
              disabled={pendingTargetId !== null}
              onClick={() => queueAction('home')}
              style={getMenuButtonStyle({
                targetId: 'home',
                isPending: pendingTargetId === 'home',
                disabled: pendingTargetId !== null,
              })}
            >
              <p style={labelStyle}>홈</p>
              <p style={helperTextStyle}>환자 메인 화면으로 이동</p>
            </button>
          </div>

          <p style={footerTextStyle}>
            진행 바와 dwell 하이라이트는 표시하지 않습니다.
          </p>
        </section>
      </div>
    </>
  )
}
