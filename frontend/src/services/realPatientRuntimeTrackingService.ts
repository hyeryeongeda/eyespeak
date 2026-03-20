import {
  getViewportPointFromEyeTrackingFrame,
  isAbortError,
  mapEyeTrackingFrameToTrackingStatus,
  readEyeTrackingFrameFromVideo,
  waitForAbortableDelay,
} from './eyeTrackingCore'
import { loadEyeTrackingCalibrationApi } from './eyeTrackingApi'
import { getEyeTrackingRuntimePollIntervalMs } from './eyeTrackingServiceConfig'
import { useGazeInputStore } from '../stores/gazeInputStore'
import type { PatientRuntimeTrackingService } from './patientRuntimeTrackingService'

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => {
    track.stop()
  })
}

class RealPatientRuntimeTrackingService implements PatientRuntimeTrackingService {
  private hiddenVideoElement: HTMLVideoElement | null = null
  private frameCanvasElement: HTMLCanvasElement = document.createElement('canvas')
  private mediaStream: MediaStream | null = null
  private disposed = false

  async start({
    patientId,
    signal,
    onDoubleBlink,
    onTrackingStatusChange,
  }: {
    patientId: string
    signal?: AbortSignal
    onTrackingStatusChange: (status: import('../types/calibration').CalibrationTrackingStatus) => void
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

      await loadEyeTrackingCalibrationApi(patientId, signal).catch(() => {
        // Runtime tracking can still proceed without a stored calibration.
      })

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
            useGazeInputStore.getState().setPoint(
              getViewportPointFromEyeTrackingFrame(frame),
            )
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
