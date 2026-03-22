import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import type { PatientCalibrationLocationState } from '../../../../types/calibration'
import { waitForAbortableDelay } from '../../../../services/eyeTrackingCore'
import {
  CALIBRATION_POINT_CAPTURE_DELAY_MS,
  DEFAULT_CALIBRATION_POINTS,
} from '../../../../services/calibration/calibrationConstants'
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

export default function BrowserPatientCalibrationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const videoSlotRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef(createBrowserEyeTrackingSession())
  const calibrationInFlightRef = useRef(false)
  const { user, patientPostAuth, clearPatientPostAuth } = useAuth()
  const routeState = (location.state as PatientCalibrationLocationState | null) ?? null
  const postAuthNotice = routeState?.postAuthNotice ?? getPatientPostAuthNotice(patientPostAuth)
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
      navigate(ROUTE_PATHS.PATIENT_MAIN, { replace: true })
    } catch (error) {
      setStage('error')
      setActivePointIndex(null)
      setErrorMessage(error instanceof Error ? error.message : 'Calibration failed.')
    } finally {
      calibrationInFlightRef.current = false
    }
  }

  const statusText =
    stage === 'loading'
      ? '브라우저에서 동일 모델을 로드하고 카메라를 준비하는 중입니다.'
      : stage === 'capturing'
        ? `캘리브레이션 ${completedPointCount}/${DEFAULT_CALIBRATION_POINTS.length}`
        : stage === 'saving'
          ? '캘리브레이션을 저장하고 patient runtime을 준비하는 중입니다.'
          : stage === 'error'
            ? errorMessage
            : '카메라와 모델이 준비되었습니다. 시작하면 12점 캘리브레이션을 진행합니다.'

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={videoShellStyle}>
          <div ref={videoSlotRef} style={videoSlotStyle} />
          {DEFAULT_CALIBRATION_POINTS.map((point, index) => {
            const isActive = activePointIndex === index
            const isCompleted = index < completedPointCount

            return (
              <div
                key={point.id}
                style={{
                  ...pointStyle,
                  left: `${point.xPercent}%`,
                  top: `${point.yPercent}%`,
                  opacity: activePointIndex === null || isActive ? 1 : 0.25,
                  background: isCompleted ? '#2dd4bf' : isActive ? '#f97316' : '#ffffff',
                  boxShadow: isActive ? '0 0 28px rgba(249, 115, 22, 0.8)' : '0 0 0 transparent',
                }}
              >
                {point.label}
              </div>
            )
          })}
        </div>

        <div style={infoStyle}>
          <p style={eyebrowStyle}>Patient Calibration</p>
          <h1 style={titleStyle}>Browser Eye Tracking</h1>
          {postAuthNotice?.authSuccessMessage ? (
            <p style={noticeStyle}>{postAuthNotice.authSuccessMessage}</p>
          ) : null}
          {postAuthNotice?.calibrationMessage ? (
            <p style={noticeStyle}>{postAuthNotice.calibrationMessage}</p>
          ) : null}
          <p style={statusStyle}>{statusText}</p>
          <p style={metricStyle}>
            상태: {frame?.status ?? 'idle'} | 셀: {frame?.cell ?? '-'} | 시선: (
            {frame?.screenX?.toFixed(3) ?? '-'}, {frame?.screenY?.toFixed(3) ?? '-'})
          </p>
          <button
            type="button"
            data-smoke-id="patient-calibration-start"
            style={buttonStyle}
            onClick={() => {
              void beginCalibration()
            }}
            disabled={stage !== 'ready'}
          >
            캘리브레이션 시작
          </button>
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
        </div>
      </section>
    </main>
  )
}

const pageStyle: CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'linear-gradient(160deg, #08111f 0%, #10253d 100%)',
}

const panelStyle: CSSProperties = {
  width: 'min(1200px, 100%)',
  display: 'grid',
  gridTemplateColumns: '1.3fr 0.8fr',
  gap: '24px',
  padding: '24px',
  borderRadius: '28px',
  background: 'rgba(8, 18, 32, 0.82)',
  boxShadow: '0 28px 60px rgba(0, 0, 0, 0.35)',
}

const videoShellStyle: CSSProperties = {
  position: 'relative',
  minHeight: 'min(70dvh, 720px)',
  borderRadius: '24px',
  overflow: 'hidden',
  background: '#050b14',
}

const videoSlotStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
}

const pointStyle: CSSProperties = {
  position: 'absolute',
  width: '42px',
  height: '42px',
  borderRadius: '999px',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#08111f',
  fontSize: '12px',
  fontWeight: 800,
}

const infoStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '14px',
  color: '#eff6ff',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#60a5fa',
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(2rem, 3vw, 3rem)',
  fontWeight: 900,
}

const noticeStyle: CSSProperties = {
  margin: 0,
  color: '#cbd5e1',
  lineHeight: 1.5,
}

const statusStyle: CSSProperties = {
  margin: '12px 0 0',
  padding: '16px',
  borderRadius: '18px',
  background: 'rgba(15, 23, 42, 0.72)',
  lineHeight: 1.6,
}

const metricStyle: CSSProperties = {
  margin: 0,
  color: '#93c5fd',
  fontFamily: 'monospace',
}

const buttonStyle: CSSProperties = {
  marginTop: '8px',
  appearance: 'none',
  border: 'none',
  borderRadius: '18px',
  height: '56px',
  background: 'linear-gradient(135deg, #f97316 0%, #fb7185 100%)',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 800,
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  marginTop: 0,
  background: 'rgba(255, 255, 255, 0.14)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
}
