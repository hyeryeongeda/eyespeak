import {
  CALIBRATION_POINT_CAPTURE_DELAY_MS,
  DEFAULT_CALIBRATION_READINESS_STEPS,
} from './calibrationConstants'
import { isEyeTrackingApiEnabled } from '../eyeTrackingServiceConfig'
import { createRealGazeTrackingService } from './realGazeTrackingService'
import type {
  CalibrationCaptureResult,
  CalibrationPoint,
  CalibrationTrackingStatus,
} from '../../types/calibration'

interface GazeTrackingReadinessOptions {
  signal?: AbortSignal
  onStatusChange: (status: CalibrationTrackingStatus) => void
}

interface GazeCaptureOptions {
  signal?: AbortSignal
}

export interface GazeTrackingService {
  connectPreview(videoElement: HTMLVideoElement): Promise<void>
  runReadinessCheck(options: GazeTrackingReadinessOptions): Promise<void>
  capturePoint(
    point: CalibrationPoint,
    options?: GazeCaptureOptions,
  ): Promise<CalibrationCaptureResult>
  completeCalibration(options?: {
    patientId?: string | null
    signal?: AbortSignal
  }): Promise<CalibrationCaptureResult>
  dispose(): void
}

function wait(delayMs: number, signal?: AbortSignal) {
  if (delayMs <= 0) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)

    const handleAbort = () => {
      window.clearTimeout(timeoutId)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

class MockGazeTrackingService implements GazeTrackingService {
  async connectPreview(videoElement: HTMLVideoElement): Promise<void> {
    if (!videoElement.srcObject) {
      throw new Error('카메라 프리뷰가 연결되지 않았습니다.')
    }
  }

  async runReadinessCheck({
    signal,
    onStatusChange,
  }: GazeTrackingReadinessOptions): Promise<void> {
    for (const step of DEFAULT_CALIBRATION_READINESS_STEPS) {
      signal?.throwIfAborted()
      onStatusChange(step.status)
      await wait(step.durationMs, signal)
    }
  }

  async capturePoint(
    _point: CalibrationPoint,
    options?: GazeCaptureOptions,
  ): Promise<CalibrationCaptureResult> {
    options?.signal?.throwIfAborted()

    // MOCK: 실제 eye tracking 모델 연동 전까지 각 포인트 응시를 시간 기반으로 시뮬레이션한다.
    await wait(CALIBRATION_POINT_CAPTURE_DELAY_MS, options?.signal)

    return {
      success: true,
    }
  }

  async completeCalibration(): Promise<CalibrationCaptureResult> {
    return {
      success: true,
    }
  }

  dispose() {}
}

let gazeTrackingServiceFactory = isEyeTrackingApiEnabled()
  ? createRealGazeTrackingService
  : () => new MockGazeTrackingService()

export function createGazeTrackingService(): GazeTrackingService {
  return gazeTrackingServiceFactory()
}

export function registerGazeTrackingServiceFactory(factory: () => GazeTrackingService) {
  gazeTrackingServiceFactory = factory
}
