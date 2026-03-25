import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import {
  getViewportPointFromEyeTrackingFrame,
  isAbortError,
  mapEyeTrackingFrameToTrackingStatus,
  readEyeTrackingFrameFromVideo,
  waitForAbortableDelay,
} from '../../../../services/eyeTrackingCore'
import { getEyeTrackingRuntimePollIntervalMs } from '../../../../services/eyeTrackingServiceConfig'
import { useGazeInputStore } from '../stores/gazeInputStore'
import type { PatientRuntimeTrackingService } from './patientRuntimeTrackingService'
import { ensurePatientEyeTrackingRuntimeReady } from './calibration/patientCalibrationService'

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => {
    track.stop()
  })
}

async function warmUpStoredCalibration(eyeTrackingProfileId: string, signal?: AbortSignal) {
  try {
    const result = await ensurePatientEyeTrackingRuntimeReady(eyeTrackingProfileId, {
      attempts: 6,
      delayMs: 300,
      signal,
    })

    if (import.meta.env.DEV && result.success && result.attempts > 1) {
      console.info('[eye-tracking] runtime calibration warm-up recovered after retry', {
        eyeTrackingProfileId,
        attempts: result.attempts,
      })
    }

    return result
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error
    }

    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Eye tracking calibration load failed.'

    return {
      success: false as const,
      attempts: 1,
      message,
    }
  }
}

class RealPatientRuntimeTrackingService implements PatientRuntimeTrackingService {
  private hiddenVideoElement: HTMLVideoElement | null = null
  private frameCanvasElement: HTMLCanvasElement = document.createElement('canvas')
  private mediaStream: MediaStream | null = null
  private disposed = false
  private lastRuntimeTelemetryAt = 0
  private lastReadySnapshot: { clientX: number; clientY: number; cell: number | null } | null = null
  private lastReadyAt = 0

  private emitRuntimeTelemetry(
    eyeTrackingProfileId: string,
    payload: {
      rawStatus: CalibrationTrackingStatus
      effectiveStatus: CalibrationTrackingStatus
      frameCell: number | null
      frameScreenX: number
      frameScreenY: number
      action: 'setSnapshot' | 'holdSnapshot' | 'clearPoint'
    },
  ) {
    if (!import.meta.env.DEV) {
      return
    }

    const now = Date.now()

    if (now - this.lastRuntimeTelemetryAt < 300) {
      return
    }

    this.lastRuntimeTelemetryAt = now
    console.info('[eye-tracking] runtime frame telemetry', {
      eyeTrackingProfileId,
      ...payload,
      timestamp: now,
    })
  }

  async start({
    eyeTrackingProfileId,
    signal,
    onDoubleBlink,
    onTrackingStatusChange,
  }: {
    eyeTrackingProfileId: string
    signal?: AbortSignal
    onTrackingStatusChange: (status: CalibrationTrackingStatus) => void
    onDoubleBlink: () => void
  }): Promise<void> {
    this.disposed = false
    this.lastRuntimeTelemetryAt = 0
    this.lastReadySnapshot = null
    this.lastReadyAt = 0
    useGazeInputStore.getState().clearPoint()
    onTrackingStatusChange('face-not-detected')

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      onTrackingStatusChange('tracking-unstable')
      return
    }

    const videoElement = document.createElement('video')
    videoElement.muted = true
    videoElement.autoplay = true
    videoElement.playsInline = true

    try {
      if (import.meta.env.DEV) {
        console.info('[eye-tracking] runtime camera init start', {
          eyeTrackingProfileId,
        })
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      })

      if (signal?.aborted || this.disposed) {
        stopMediaStream(stream)
        return
      }

      this.hiddenVideoElement = videoElement
      this.mediaStream = stream
      this.hiddenVideoElement.srcObject = stream

      if (import.meta.env.DEV) {
        console.info('[eye-tracking] runtime camera init success', {
          eyeTrackingProfileId,
        })
      }

      await this.hiddenVideoElement.play().catch(() => {
        // Muted autoplay can still be delayed on some browsers until camera metadata is ready.
      })

      if (import.meta.env.DEV) {
        console.info('[eye-tracking] runtime calibration warm-up start', {
          eyeTrackingProfileId,
        })
      }

      const calibrationWarmupResult = await warmUpStoredCalibration(eyeTrackingProfileId, signal)

      if (!calibrationWarmupResult.success) {
        useGazeInputStore.getState().clearPoint()
        onTrackingStatusChange('tracking-unstable')

        if (import.meta.env.DEV) {
          console.warn('[eye-tracking] runtime calibration warm-up failed', {
            eyeTrackingProfileId,
            attempts: calibrationWarmupResult.attempts,
            message: calibrationWarmupResult.message,
          })
        }

        return
      }

      let lastDoubleBlinkAt = 0
      let lastBlinkDetected = false
      const unstableFrameHoldMs = 500

      while (!signal?.aborted && !this.disposed) {
        try {
          const frame = await readEyeTrackingFrameFromVideo({
            videoElement: this.hiddenVideoElement,
            canvasElement: this.frameCanvasElement,
            signal,
          })

          const rawStatus = mapEyeTrackingFrameToTrackingStatus(frame)
          let effectiveStatus: CalibrationTrackingStatus = rawStatus

          if (rawStatus === 'ready') {
            const snapshot = {
              ...getViewportPointFromEyeTrackingFrame(frame),
              cell: frame.cell,
            }
            useGazeInputStore.getState().setSnapshot(snapshot)
            this.lastReadySnapshot = snapshot
            this.lastReadyAt = Date.now()
            this.emitRuntimeTelemetry(eyeTrackingProfileId, {
              rawStatus,
              effectiveStatus,
              frameCell: frame.cell,
              frameScreenX: frame.screenX,
              frameScreenY: frame.screenY,
              action: 'setSnapshot',
            })
          } else {
            const now = Date.now()
            const snapshotToHold = this.lastReadySnapshot
            const shouldHoldSnapshot =
              snapshotToHold !== null && now - this.lastReadyAt <= unstableFrameHoldMs

            if (shouldHoldSnapshot) {
              useGazeInputStore.getState().setSnapshot(snapshotToHold)
              effectiveStatus = 'ready'
              this.emitRuntimeTelemetry(eyeTrackingProfileId, {
                rawStatus,
                effectiveStatus,
                frameCell: frame.cell,
                frameScreenX: frame.screenX,
                frameScreenY: frame.screenY,
                action: 'holdSnapshot',
              })
            } else {
              useGazeInputStore.getState().clearPoint()
              this.emitRuntimeTelemetry(eyeTrackingProfileId, {
                rawStatus,
                effectiveStatus,
                frameCell: frame.cell,
                frameScreenX: frame.screenX,
                frameScreenY: frame.screenY,
                action: 'clearPoint',
              })
            }
          }

          onTrackingStatusChange(effectiveStatus)

          if (import.meta.env.DEV && frame.blinkDetected && !lastBlinkDetected) {
            console.info('[eye-tracking] blink detected', {
              eyeTrackingProfileId,
              cell: frame.cell,
              trigger: frame.trigger,
            })
          }

          lastBlinkDetected = frame.blinkDetected

          if (import.meta.env.DEV && frame.trigger !== 'none') {
            console.info('[eye-tracking] trigger detected', {
              eyeTrackingProfileId,
              trigger: frame.trigger,
              cell: frame.cell,
              trackingStatus: effectiveStatus,
              rawTrackingStatus: rawStatus,
            })
          }

          if (frame.trigger === 'start') {
            const now = Date.now()

            if (now - lastDoubleBlinkAt >= 1000) {
              lastDoubleBlinkAt = now

              if (import.meta.env.DEV) {
                console.info('[eye-tracking] double blink confirmed', {
                  eyeTrackingProfileId,
                  cell: frame.cell,
                })
              }

              onDoubleBlink()
            }
          }
        } catch (error) {
          if (signal?.aborted || this.disposed || isAbortError(error)) {
            return
          }

          useGazeInputStore.getState().clearPoint()
          onTrackingStatusChange('tracking-unstable')
        }

        await waitForAbortableDelay(getEyeTrackingRuntimePollIntervalMs(), signal)
      }
    } catch (error) {
      if (import.meta.env.DEV && !signal?.aborted && !this.disposed) {
        console.warn('[eye-tracking] runtime camera init failed', {
          eyeTrackingProfileId,
          message: error instanceof Error ? error.message : 'Unknown camera init error.',
        })
      }

      if (!signal?.aborted && !this.disposed) {
        useGazeInputStore.getState().clearPoint()
        onTrackingStatusChange('tracking-unstable')
      }

      if (isAbortError(error)) {
        return
      }
    }
  }

  dispose() {
    this.disposed = true
    useGazeInputStore.getState().clearPoint()

    if (this.hiddenVideoElement) {
      this.hiddenVideoElement.srcObject = null
      this.hiddenVideoElement = null
    }

    stopMediaStream(this.mediaStream)
    this.mediaStream = null
    this.frameCanvasElement.width = 0
    this.frameCanvasElement.height = 0
  }
}

export function createRealPatientRuntimeTrackingService() {
  return new RealPatientRuntimeTrackingService()
}
