import { CALIBRATION_POINT_CAPTURE_DELAY_MS } from './calibrationConstants'
import {
  loadEyeTrackingCalibrationApi,
  resetEyeTrackingCalibrationApi,
  saveEyeTrackingCalibrationApi,
  submitEyeTrackingCalibrationApi,
} from '../eyeTrackingApi'
import {
  mapEyeTrackingFrameToTrackingStatus,
  readEyeTrackingFrameFromVideo,
  waitForAbortableDelay,
} from '../eyeTrackingCore'
import {
  getEyeTrackingCaptureSampleIntervalMs,
  getEyeTrackingReadyStreak,
  getEyeTrackingRuntimePollIntervalMs,
} from '../eyeTrackingServiceConfig'
import type { CalibrationCaptureResult, CalibrationPoint } from '../../types/calibration'
import type { EyeTrackingCalibrationSample } from '../../types/eyeTracking'
import type { GazeTrackingService } from './gazeTrackingService'

function averageCalibrationSamples(samples: EyeTrackingCalibrationSample[]) {
  const sampleCount = samples.length

  return samples.reduce<EyeTrackingCalibrationSample>(
    (accumulator, sample) => ({
      rx: accumulator.rx + sample.rx / sampleCount,
      ry: accumulator.ry + sample.ry / sampleCount,
    }),
    { rx: 0, ry: 0 },
  )
}

class RealGazeTrackingService implements GazeTrackingService {
  private previewVideoElement: HTMLVideoElement | null = null
  private frameCanvasElement: HTMLCanvasElement = document.createElement('canvas')
  private calibrationSamples: EyeTrackingCalibrationSample[] = []

  async connectPreview(videoElement: HTMLVideoElement): Promise<void> {
    if (!videoElement.srcObject) {
      throw new Error('Camera preview stream is not connected.')
    }

    this.previewVideoElement = videoElement
    this.calibrationSamples = []
  }

  async runReadinessCheck({
    signal,
    onStatusChange,
  }: {
    signal?: AbortSignal
    onStatusChange: (status: import('../../types/calibration').CalibrationTrackingStatus) => void
  }): Promise<void> {
    if (!this.previewVideoElement) {
      throw new Error('Camera preview is not connected.')
    }

    let readyStreak = 0

    while (readyStreak < getEyeTrackingReadyStreak()) {
      const frame = await readEyeTrackingFrameFromVideo({
        videoElement: this.previewVideoElement,
        canvasElement: this.frameCanvasElement,
        signal,
      })

      const status = mapEyeTrackingFrameToTrackingStatus(frame)
      onStatusChange(status)
      readyStreak = status === 'ready' ? readyStreak + 1 : 0

      if (readyStreak >= getEyeTrackingReadyStreak()) {
        return
      }

      await waitForAbortableDelay(getEyeTrackingRuntimePollIntervalMs(), signal)
    }
  }

  async capturePoint(
    _point: CalibrationPoint,
    options?: { signal?: AbortSignal },
  ): Promise<CalibrationCaptureResult> {
    if (!this.previewVideoElement) {
      throw new Error('Camera preview is not connected.')
    }

    if (this.calibrationSamples.length === 0) {
      await resetEyeTrackingCalibrationApi(options?.signal)
    }

    const collectedSamples: EyeTrackingCalibrationSample[] = []
    let faceDetected = false
    const startedAt = performance.now()

    while (performance.now() - startedAt < CALIBRATION_POINT_CAPTURE_DELAY_MS) {
      const frame = await readEyeTrackingFrameFromVideo({
        videoElement: this.previewVideoElement,
        canvasElement: this.frameCanvasElement,
        signal: options?.signal,
      })

      faceDetected = faceDetected || frame.faceDetected

      if (frame.ratioX !== null && frame.ratioY !== null) {
        collectedSamples.push({
          rx: frame.ratioX,
          ry: frame.ratioY,
        })
      }

      await waitForAbortableDelay(getEyeTrackingCaptureSampleIntervalMs(), options?.signal)
    }

    if (collectedSamples.length === 0) {
      return {
        success: false,
        trackingStatus: faceDetected ? 'tracking-unstable' : 'face-not-detected',
      }
    }

    this.calibrationSamples.push(averageCalibrationSamples(collectedSamples))

    return {
      success: true,
    }
  }

  async completeCalibration(options?: {
    patientId?: string | null
    signal?: AbortSignal
  }): Promise<CalibrationCaptureResult> {
    if (this.calibrationSamples.length < 6) {
      return {
        success: false,
        trackingStatus: 'tracking-unstable',
      }
    }

    const response = await submitEyeTrackingCalibrationApi(
      this.calibrationSamples,
      options?.signal,
    )

    if (!response.ok) {
      return {
        success: false,
        trackingStatus: 'tracking-unstable',
      }
    }

    if (options?.patientId) {
      const saveResponse = await saveEyeTrackingCalibrationApi(
        options.patientId,
        options.signal,
      )

      if (!saveResponse.ok) {
        throw new Error('Failed to save eye tracking calibration.')
      }

      await loadEyeTrackingCalibrationApi(options.patientId, options.signal).catch(() => {
        // Saving is the critical path. Load is best-effort to warm the model state.
      })
    }

    return {
      success: true,
    }
  }

  dispose() {
    this.previewVideoElement = null
    this.calibrationSamples = []
    this.frameCanvasElement.width = 0
    this.frameCanvasElement.height = 0
  }
}

export function createRealGazeTrackingService() {
  return new RealGazeTrackingService()
}
