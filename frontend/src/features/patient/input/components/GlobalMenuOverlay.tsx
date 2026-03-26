import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { useDwell } from '../hooks/useDwell'
import { useTracking } from '../hooks/useTracking'
import {
  emitPatientGlobalMenuAction,
} from '../services/patientModeBridge'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import { isPatientTrackingAvailable, usePatientModeStore } from '../stores/patientModeStore'

type GlobalMenuTargetId = 'yes' | 'no' | 'home'

const ACTION_FEEDBACK_DELAY_MS = 180

const responsiveStyle = `
  @media (max-width: 768px) {
    .patient-global-menu-shell {
      padding: 0;
    }

    .patient-global-menu-panel {
      padding: 8px;
    }

    .patient-global-menu-grid {
      gap: 8px;
    }
  }
`

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1150,
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'stretch',
  padding: 0,
  backgroundColor: 'rgba(13, 22, 35, 0.52)',
  backdropFilter: 'blur(10px)',
}

const panelStyle: CSSProperties = {
  width: '100vw',
  height: '100dvh',
  display: 'flex',
  padding: 'clamp(8px, 1vw, 12px)',
  borderRadius: 0,
  background:
    'linear-gradient(180deg, rgba(247, 250, 255, 0.96) 0%, rgba(239, 244, 253, 0.98) 100%)',
  boxShadow: '0 34px 70px rgba(9, 20, 35, 0.24)',
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const gridStyle: CSSProperties = {
  flex: 1,
  width: '100%',
  height: '100%',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '12px',
  minHeight: 0,
}

const buttonBaseStyle: CSSProperties = {
  position: 'relative',
  appearance: 'none',
  width: '100%',
  minHeight: 0,
  border: '1px solid transparent',
  borderRadius: '28px',
  padding: 'clamp(24px, 2.4vw, 30px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  textAlign: 'left',
  transition:
    'transform 0.16s ease, opacity 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease, background 0.16s ease, border-color 0.16s ease',
}

const labelStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(3.75rem, 5vw, 5rem)',
  fontWeight: 900,
  letterSpacing: '-0.05em',
  lineHeight: 1,
}

const helperTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.2rem, 1.6vw, 1.6rem)',
  fontWeight: 700,
  lineHeight: 1.45,
  opacity: 0.86,
}

function getMenuButtonStyle(args: {
  targetId: GlobalMenuTargetId
  isHovered: boolean
  isPending: boolean
  disabled: boolean
}): CSSProperties {
  const { targetId, isHovered, isPending, disabled } = args

  const toneByTargetId: Record<
    GlobalMenuTargetId,
    {
      background: string
      hoverBackground: string
      pendingBackground: string
      color: string
      borderColor: string
      hoverBorderColor: string
      pendingBorderColor: string
      boxShadow: string
      hoverBoxShadow: string
      pendingBoxShadow: string
    }
  > = {
    yes: {
      background: 'linear-gradient(135deg, #eef9f1 0%, #dff2e5 100%)',
      hoverBackground: 'linear-gradient(135deg, #e2f5e8 0%, #caead7 100%)',
      pendingBackground: 'linear-gradient(135deg, #cfeeda 0%, #b7e2c8 100%)',
      color: '#1e5a39',
      borderColor: 'rgba(81, 146, 112, 0.18)',
      hoverBorderColor: 'rgba(81, 146, 112, 0.42)',
      pendingBorderColor: 'rgba(55, 122, 88, 0.68)',
      boxShadow: '0 18px 34px rgba(67, 132, 98, 0.12)',
      hoverBoxShadow:
        '0 0 0 7px rgba(81, 146, 112, 0.16), 0 22px 38px rgba(67, 132, 98, 0.18)',
      pendingBoxShadow:
        '0 0 0 10px rgba(55, 122, 88, 0.2), 0 24px 42px rgba(48, 112, 81, 0.24)',
    },
    no: {
      background: 'linear-gradient(135deg, #edf2f8 0%, #e2eaf5 100%)',
      hoverBackground: 'linear-gradient(135deg, #e3ebf6 0%, #d1ddec 100%)',
      pendingBackground: 'linear-gradient(135deg, #d5e2f2 0%, #c0d1e6 100%)',
      color: '#304764',
      borderColor: 'rgba(91, 118, 156, 0.18)',
      hoverBorderColor: 'rgba(91, 118, 156, 0.42)',
      pendingBorderColor: 'rgba(63, 93, 136, 0.68)',
      boxShadow: '0 18px 34px rgba(77, 101, 138, 0.12)',
      hoverBoxShadow:
        '0 0 0 7px rgba(91, 118, 156, 0.16), 0 22px 38px rgba(77, 101, 138, 0.18)',
      pendingBoxShadow:
        '0 0 0 10px rgba(63, 93, 136, 0.2), 0 24px 42px rgba(63, 93, 136, 0.24)',
    },
    home: {
      background: 'linear-gradient(135deg, #edf4ff 0%, #dce9ff 100%)',
      hoverBackground: 'linear-gradient(135deg, #e2ecff 0%, #c9dcff 100%)',
      pendingBackground: 'linear-gradient(135deg, #d6e5ff 0%, #b4ccff 100%)',
      color: '#214c86',
      borderColor: 'rgba(79, 122, 191, 0.18)',
      hoverBorderColor: 'rgba(79, 122, 191, 0.42)',
      pendingBorderColor: 'rgba(50, 93, 163, 0.68)',
      boxShadow: '0 18px 34px rgba(66, 108, 170, 0.14)',
      hoverBoxShadow:
        '0 0 0 7px rgba(79, 122, 191, 0.16), 0 22px 38px rgba(66, 108, 170, 0.2)',
      pendingBoxShadow:
        '0 0 0 10px rgba(50, 93, 163, 0.2), 0 24px 42px rgba(50, 93, 163, 0.26)',
    },
  }

  const tone = toneByTargetId[targetId]
  const isEmphasized = isHovered || isPending

  return {
    ...buttonBaseStyle,
    background: isPending
      ? tone.pendingBackground
      : isHovered
        ? tone.hoverBackground
        : tone.background,
    color: tone.color,
    borderColor: isPending
      ? tone.pendingBorderColor
      : isHovered
        ? tone.hoverBorderColor
        : tone.borderColor,
    boxShadow: isPending
      ? tone.pendingBoxShadow
      : isHovered
        ? tone.hoverBoxShadow
        : tone.boxShadow,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.54 : 1,
    transform: isPending ? 'scale(0.985)' : isHovered ? 'scale(1.01)' : 'scale(1)',
    filter: isEmphasized ? 'saturate(1.04)' : 'none',
  }
}

export default function GlobalMenuOverlay() {
  const navigate = useNavigate()
  const gridRef = useRef<HTMLDivElement | null>(null)
  const actionTimerRef = useRef<number | null>(null)
  const isOpen = usePatientModeStore(state => state.isGlobalMenuOpen)
  const closeGlobalMenu = usePatientModeStore(state => state.closeGlobalMenu)
  const dwellDurationMs = usePatientModeStore(state => state.globalMenuDwellDurationMs)
  const trackingStatus = usePatientModeStore(state => state.trackingStatus)
  const [pendingTargetId, setPendingTargetId] = useState<GlobalMenuTargetId | null>(null)

  const isTrackingReady = isPatientTrackingAvailable(trackingStatus)
  const { hoveredTargetId, inputSource } = useTracking<GlobalMenuTargetId>({
    containerRef: gridRef,
    enabled: isOpen && isTrackingReady && pendingTargetId === null,
  })
  const isGazeSelectionActive = inputSource === 'gaze'
  const gazeHighlightedTargetId =
    isGazeSelectionActive && pendingTargetId === null ? hoveredTargetId : null

  useDwell<GlobalMenuTargetId>({
    hoveredTargetId: isGazeSelectionActive ? hoveredTargetId : null,
    dwellDurationMs,
    disabled: !isOpen || !isTrackingReady || pendingTargetId !== null,
    onCommit: targetId => {
      queueAction(targetId, 'gaze')
    },
  })

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

  function queueAction(
    targetId: GlobalMenuTargetId,
    source: 'pointer' | 'gaze' = 'pointer',
  ) {
    if (!isOpen || !isTrackingReady || pendingTargetId !== null) {
      return
    }

    if (source === 'gaze') {
      submitActiveEyeTrackingSelectionFeedback()
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
      if (targetId === 'home') {
        emitPatientGlobalMenuAction('home')
        closeGlobalMenu()
        navigate(ROUTE_PATHS.PATIENT_MAIN)
        return
      }

      emitPatientGlobalMenuAction(targetId)
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
          <div ref={gridRef} className="patient-global-menu-grid" style={gridStyle}>
            <button
              type="button"
              data-tracking-id={pendingTargetId === null ? 'yes' : undefined}
              data-gaze-selection="local"
              disabled={pendingTargetId !== null}
              onClick={() => queueAction('yes')}
              style={getMenuButtonStyle({
                targetId: 'yes',
                isHovered: gazeHighlightedTargetId === 'yes',
                isPending: pendingTargetId === 'yes',
                disabled: pendingTargetId !== null,
              })}
            >
              <p style={labelStyle}>예</p>
              <p style={helperTextStyle}>공통 positive action 진입</p>
            </button>

            <button
              type="button"
              data-tracking-id={pendingTargetId === null ? 'no' : undefined}
              data-gaze-selection="local"
              disabled={pendingTargetId !== null}
              onClick={() => queueAction('no')}
              style={getMenuButtonStyle({
                targetId: 'no',
                isHovered: gazeHighlightedTargetId === 'no',
                isPending: pendingTargetId === 'no',
                disabled: pendingTargetId !== null,
              })}
            >
              <p style={labelStyle}>아니오</p>
              <p style={helperTextStyle}>공통 negative action 진입</p>
            </button>

            <button
              type="button"
              data-tracking-id={pendingTargetId === null ? 'home' : undefined}
              data-gaze-selection="local"
              disabled={pendingTargetId !== null}
              onClick={() => queueAction('home')}
              style={{
                ...getMenuButtonStyle({
                  targetId: 'home',
                  isHovered: gazeHighlightedTargetId === 'home',
                  isPending: pendingTargetId === 'home',
                  disabled: pendingTargetId !== null,
                }),
                gridColumn: '1 / -1',
              }}
            >
              <p style={labelStyle}>홈</p>
              <p style={helperTextStyle}>환자 메인 화면으로 이동</p>
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
