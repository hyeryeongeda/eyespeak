import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { waitForAbortableDelay } from '../../../../services/eyeTrackingCore'
import {
  CALIBRATION_POINT_CAPTURE_DELAY_MS,
  DEFAULT_CALIBRATION_POINTS,
} from '../../../../services/calibration/calibrationConstants'
import type {
  CalibrationTrackingStatus,
  PatientCalibrationLocationState,
} from '../../../../types/calibration'
import { useAuth } from '../../../auth/hooks/useAuth'
import {
  completePatientCalibration,
  getPatientEyeTrackingProfileId,
  getPatientPostAuthNotice,
} from '../services/calibration/patientCalibrationService'
import {
  createBrowserEyeTrackingSession,
  type BrowserEyeTrackingFrame,
} from '../services/browserEyeTracking/browserEyeTrackingRuntime'

type CalibrationStage = 'loading' | 'ready' | 'capturing' | 'saving' | 'error'

const READY_TIMEOUT_MS = 5000

function getTrackingLabel(status: CalibrationTrackingStatus | null | undefined) {
  if (status === 'ready') {
    return 'Face detected'
  }

  if (status === 'tracking-unstable') {
    return 'Adjust face position'
  }

  if (status === 'face-not-detected') {
    return 'Detecting face'
  }

  return 'Preparing camera'
}

function getStatusText({
  stage,
  frame,
  completedPointCount,
}: {
  stage: CalibrationStage
  frame: BrowserEyeTrackingFrame | null
  completedPointCount: number
}) {
  if (stage === 'loading') {
    return 'Preparing camera'
  }

  if (stage === 'capturing') {
    return `Calibration ${Math.min(completedPointCount + 1, DEFAULT_CALIBRATION_POINTS.length)} / ${
      DEFAULT_CALIBRATION_POINTS.length
    }`
  }

  if (stage === 'saving') {
    return 'Saving calibration'
  }

  if (stage === 'error') {
    return 'Calibration error'
  }

  return getTrackingLabel(frame?.status)
}

function getBlockingWarning(stage: CalibrationStage, frame: BrowserEyeTrackingFrame | null) {
  if (stage === 'loading' || stage === 'saving' || stage === 'error') {
    return ''
  }

  if (frame?.status === 'ready') {
    return ''
  }

  return 'A stable face detection is required before calibration can continue.'
}

export default function BrowserPatientCalibrationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const videoSlotRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef(createBrowserEyeTrackingSession())
  const calibrationInFlightRef = useRef(false)
  const { user, patientPostAuth, clearPatientPostAuth } = useAuth()
  const routeState = (location.state as PatientCalibrationLocationState | null) ?? null
  const postAuthNotice = routeState?.postAuthNotice ?? getPatientPostAuthNotice(patientPostAuth)
  const postCalibrationRedirectPath = routeState?.redirectPath ?? ROUTE_PATHS.PATIENT_MAIN
  const eyeTrackingProfileId = useMemo(() => getPatientEyeTrackingProfileId(user), [user])
  const [stage, setStage] = useState<CalibrationStage>('loading')
  const [frame, setFrame] = useState<BrowserEyeTrackingFrame | null>(null)
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null)
  const [completedPointCount, setCompletedPointCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const session = sessionRef.current
    const controller = new AbortController()
    let rafId = 0

    const run = async () => {
      try {
        const videoElement = await session.start(controller.signal)

        if (videoSlotRef.current && !videoSlotRef.current.contains(videoElement)) {
          videoElement.style.width = '100%'
          videoElement.style.height = '100%'
          videoElement.style.objectFit = 'cover'
          videoElement.style.transform = 'scaleX(-1)'
          videoSlotRef.current.innerHTML = ''
          videoSlotRef.current.appendChild(videoElement)
        }

        const tick = async () => {
          if (calibrationInFlightRef.current) {
            rafId = window.requestAnimationFrame(() => {
              void tick()
            })
            return
          }

          const nextFrame = await session.step()

          if (controller.signal.aborted) {
            return
          }

          setFrame(nextFrame)
          rafId = window.requestAnimationFrame(() => {
            void tick()
          })
        }

        setStage('ready')
        await tick()
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setStage('error')
        setErrorMessage(
          error instanceof Error ? error.message : 'Browser eye-tracking initialization failed.',
        )
      }
    }

    void run()

    return () => {
      controller.abort()
      window.cancelAnimationFrame(rafId)
      session.dispose()
    }
  }, [])

  const beginCalibration = async () => {
    if (!eyeTrackingProfileId) {
      setStage('error')
      setErrorMessage('Eye tracking profile id is missing for this patient session.')
      return
    }

    if (stage !== 'ready' || frame?.status !== 'ready') {
      return
    }

    const session = sessionRef.current

    try {
      calibrationInFlightRef.current = true
      setStage('capturing')
      setErrorMessage('')
      setCompletedPointCount(0)
      const samples: Array<{ rx: number; ry: number }> = []

      for (let index = 0; index < DEFAULT_CALIBRATION_POINTS.length; index += 1) {
        setActivePointIndex(index)
        const readyDeadline = Date.now() + READY_TIMEOUT_MS

        while (Date.now() < readyDeadline) {
          const currentFrame = await session.step()
          setFrame(currentFrame)

          if (currentFrame.status === 'ready') {
            break
          }

          await waitForAbortableDelay(120)
        }

        const collectedSamples: Array<{ rx: number; ry: number }> = []
        const captureEndsAt = Date.now() + CALIBRATION_POINT_CAPTURE_DELAY_MS

        while (Date.now() < captureEndsAt) {
          const currentFrame = await session.step()
          setFrame(currentFrame)

          if (
            currentFrame.status === 'ready' &&
            currentFrame.ratioX !== null &&
            currentFrame.ratioY !== null
          ) {
            collectedSamples.push({
              rx: currentFrame.ratioX,
              ry: currentFrame.ratioY,
            })
          }

          await waitForAbortableDelay(90)
        }

        if (collectedSamples.length === 0) {
          throw new Error(`Calibration capture failed at point ${index + 1}.`)
        }

        samples.push({
          rx: collectedSamples.reduce((sum, sample) => sum + sample.rx, 0) / collectedSamples.length,
          ry: collectedSamples.reduce((sum, sample) => sum + sample.ry, 0) / collectedSamples.length,
        })
        setCompletedPointCount(index + 1)

        if (import.meta.env.DEV) {
          console.info('[eye-tracking] calibration point collected', {
            pointIndex: index,
            pointId: DEFAULT_CALIBRATION_POINTS[index]?.id ?? null,
          })
        }
      }

      session.setCalibration(samples)

      if (!session.saveCalibration(eyeTrackingProfileId)) {
        throw new Error('Calibration save failed.')
      }

      if (import.meta.env.DEV) {
        console.info('[eye-tracking] calibration complete', {
          pointCount: samples.length,
        })
      }

      setActivePointIndex(null)
      setStage('saving')
      const result = await completePatientCalibration(user)

      if (!result.success) {
        throw new Error(result.message)
      }

      clearPatientPostAuth()
      navigate(postCalibrationRedirectPath, { replace: true })
    } catch (error) {
      setStage('error')
      setActivePointIndex(null)
      setErrorMessage(error instanceof Error ? error.message : 'Calibration failed.')
    } finally {
      calibrationInFlightRef.current = false
    }
  }

  const statusText = getStatusText({
    stage,
    frame,
    completedPointCount,
  })
  const blockingWarning = getBlockingWarning(stage, frame)
  const canStartCalibration = stage === 'ready' && frame?.status === 'ready'
  const hintText =
    stage === 'capturing'
      ? 'Keep looking at the highlighted point.'
      : postAuthNotice?.calibrationMessage ??
        postAuthNotice?.authSuccessMessage ??
        'Look at each point in order, then start calibration.'

  return (
    <main style={pageStyle}>
      <div ref={videoSlotRef} style={videoSlotStyle} />
      <div style={cameraTintStyle} />
      <div style={vignetteStyle} />

      <div style={hudLayerStyle}>
        <div style={topHudStyle}>
          <div style={statusBadgeStyle}>{statusText}</div>
          {stage === 'capturing' || stage === 'saving' ? (
            <div style={progressBadgeStyle}>
              {Math.min(completedPointCount, DEFAULT_CALIBRATION_POINTS.length)} /{' '}
              {DEFAULT_CALIBRATION_POINTS.length}
            </div>
          ) : null}
          {import.meta.env.DEV && frame ? (
            <div style={debugBadgeStyle}>
              {frame.status} | cell {frame.cell ?? '-'} | ({frame.screenX.toFixed(3)},{' '}
              {frame.screenY.toFixed(3)})
            </div>
          ) : null}
        </div>

        {blockingWarning ? <div style={warningOverlayStyle}>{blockingWarning}</div> : null}

        <div style={pointsLayerStyle}>
          {DEFAULT_CALIBRATION_POINTS.map((point, index) => {
            const isActive = activePointIndex === index
            const isCompleted = index < completedPointCount
            const isDimmed = activePointIndex !== null && !isActive && !isCompleted

            return (
              <div
                key={point.id}
                style={{
                  ...pointStyle,
                  left: `${point.xPercent}%`,
                  top: `${point.yPercent}%`,
                  opacity: isDimmed ? 0.2 : 1,
                  transform: `translate(-50%, -50%) scale(${isActive ? 1.22 : isCompleted ? 0.92 : 1})`,
                  background: isCompleted
                    ? 'rgba(45, 212, 191, 0.94)'
                    : isActive
                      ? '#f97316'
                      : 'rgba(255, 255, 255, 0.94)',
                  color: isCompleted || isActive ? '#ffffff' : '#09121f',
                  boxShadow: isActive
                    ? '0 0 0 12px rgba(249, 115, 22, 0.2), 0 0 40px rgba(249, 115, 22, 0.7)'
                    : isCompleted
                      ? '0 0 20px rgba(45, 212, 191, 0.45)'
                      : '0 10px 28px rgba(7, 14, 24, 0.28)',
                }}
              >
                {point.label}
              </div>
            )
          })}
        </div>

        <div style={bottomHudStyle}>
          <div style={hintBadgeStyle}>{hintText}</div>

          {stage === 'error' ? <div style={errorBadgeStyle}>{errorMessage}</div> : null}

          <div style={actionRowStyle}>
            {stage === 'ready' ? (
              <>
                <button
                  type="button"
                  data-smoke-id="patient-calibration-start"
                  style={{
                    ...primaryButtonStyle,
                    opacity: canStartCalibration ? 1 : 0.48,
                    cursor: canStartCalibration ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    void beginCalibration()
                  }}
                  disabled={!canStartCalibration}
                >
                  Start calibration
                </button>
                <button
                  type="button"
                  data-smoke-id="patient-calibration-retry"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    window.location.reload()
                  }}
                >
                  Retry
                </button>
              </>
            ) : null}

            {stage === 'error' ? (
              <button
                type="button"
                data-smoke-id="patient-calibration-retry"
                style={secondaryButtonStyle}
                onClick={() => {
                  window.location.reload()
                }}
              >
                Retry
              </button>
            ) : null}

            {stage === 'saving' ? <div style={savingBadgeStyle}>Saving</div> : null}
          </div>
        </div>
      </div>
    </main>
  )
}

const pageStyle: CSSProperties = {
  position: 'relative',
  minHeight: '100dvh',
  width: '100%',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top, rgba(36, 78, 126, 0.28) 0%, rgba(9, 15, 24, 0.84) 35%, #04070d 100%)',
}

const videoSlotStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: '#02050a',
}

const cameraTintStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(3, 10, 18, 0.48) 0%, rgba(3, 10, 18, 0.22) 28%, rgba(3, 10, 18, 0.5) 100%)',
}

const vignetteStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at center, rgba(255, 255, 255, 0) 42%, rgba(0, 0, 0, 0.28) 100%)',
}

const hudLayerStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  minHeight: '100dvh',
  width: '100%',
}

const topHudStyle: CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  right: '20px',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  pointerEvents: 'none',
}

const statusBadgeStyle: CSSProperties = {
  padding: '10px 16px',
  borderRadius: '999px',
  background: 'rgba(8, 15, 25, 0.78)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  color: '#eff6ff',
  fontSize: '14px',
  fontWeight: 800,
  backdropFilter: 'blur(10px)',
}

const progressBadgeStyle: CSSProperties = {
  ...statusBadgeStyle,
  color: '#f8fafc',
}

const debugBadgeStyle: CSSProperties = {
  ...statusBadgeStyle,
  color: '#93c5fd',
  fontFamily: 'monospace',
  fontSize: '12px',
}

const warningOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '14px 18px',
  borderRadius: '18px',
  background: 'rgba(7, 12, 20, 0.88)',
  border: '1px solid rgba(248, 113, 113, 0.32)',
  color: '#fecaca',
  fontSize: '15px',
  fontWeight: 700,
  lineHeight: 1.4,
  textAlign: 'center',
  backdropFilter: 'blur(12px)',
  pointerEvents: 'none',
}

const pointsLayerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
}

const pointStyle: CSSProperties = {
  position: 'absolute',
  width: 'clamp(38px, 4.4vw, 66px)',
  height: 'clamp(38px, 4.4vw, 66px)',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'clamp(13px, 1.5vw, 20px)',
  fontWeight: 900,
  lineHeight: 1,
  transition:
    'transform 160ms ease, opacity 160ms ease, box-shadow 160ms ease, background 160ms ease',
}

const bottomHudStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: '24px',
  transform: 'translateX(-50%)',
  width: 'min(100%, 760px)',
  padding: '0 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
}

const hintBadgeStyle: CSSProperties = {
  maxWidth: '100%',
  padding: '10px 16px',
  borderRadius: '999px',
  background: 'rgba(8, 15, 25, 0.72)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  color: '#e2e8f0',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.4,
  textAlign: 'center',
  backdropFilter: 'blur(10px)',
}

const errorBadgeStyle: CSSProperties = {
  maxWidth: '100%',
  padding: '12px 16px',
  borderRadius: '18px',
  background: 'rgba(127, 29, 29, 0.78)',
  border: '1px solid rgba(248, 113, 113, 0.24)',
  color: '#fee2e2',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1.5,
  textAlign: 'center',
  backdropFilter: 'blur(10px)',
}

const actionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  pointerEvents: 'auto',
}

const primaryButtonStyle: CSSProperties = {
  appearance: 'none',
  border: 'none',
  borderRadius: '999px',
  minWidth: '220px',
  height: '58px',
  padding: '0 28px',
  background: 'linear-gradient(135deg, #f97316 0%, #fb7185 100%)',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 900,
  letterSpacing: '-0.02em',
  boxShadow: '0 18px 32px rgba(249, 115, 22, 0.28)',
}

const secondaryButtonStyle: CSSProperties = {
  appearance: 'none',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  minWidth: '152px',
  height: '58px',
  padding: '0 24px',
  background: 'rgba(8, 15, 25, 0.72)',
  color: '#f8fafc',
  fontSize: '15px',
  fontWeight: 800,
  backdropFilter: 'blur(10px)',
}

const savingBadgeStyle: CSSProperties = {
  ...statusBadgeStyle,
  pointerEvents: 'auto',
}
