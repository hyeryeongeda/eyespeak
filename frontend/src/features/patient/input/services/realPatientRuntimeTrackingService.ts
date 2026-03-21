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

      await this.hiddenVideoElement.play().catch(() => {
        // Muted autoplay can still be delayed on some browsers until camera metadata is ready.
      })

      const calibrationWarmupResult = await warmUpStoredCalibration(eyeTrackingProfileId, signal)

      if (!calibrationWarmupResult.success) {
        onTrackingStatusChange('tracking-unstable')

        if (import.meta.env.DEV) {
          console.warn('[eye-tracking] runtime calibration warm-up failed', {
            eyeTrackingProfileId,
            attempts: calibrationWarmupResult.attempts,
            message: calibrationWarmupResult.message,
          })
        }
      }

      let lastDoubleBlinkAt = 0

      while (!signal?.aborted && !this.disposed) {
        try {
          const frame = await readEyeTrackingFrameFromVideo({
            videoElement: this.hiddenVideoElement,
            canvasElement: this.frameCanvasElement,
            signal,
          })

          const status = mapEyeTrackingFrameToTrackingStatus(frame)
          onTrackingStatusChange(status)

          if (status === 'ready') {
            useGazeInputStore.getState().setSnapshot({
              ...getViewportPointFromEyeTrackingFrame(frame),
              cell: frame.cell,
            })
          } else {
            useGazeInputStore.getState().clearPoint()
          }

          if (frame.trigger === 'start') {
            const now = Date.now()

            if (now - lastDoubleBlinkAt >= 1000) {
              lastDoubleBlinkAt = now
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
