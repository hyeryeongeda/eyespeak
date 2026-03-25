import type { CalibrationTrackingStatus } from '../types/calibration'
import type { EyeTrackingFrame } from '../types/eyeTracking'
import { analyzeEyeTrackingFrameApi } from './eyeTrackingApi'
import {
  getEyeTrackingFrameJpegQuality,
  getEyeTrackingFrameMaxWidth,
} from './eyeTrackingServiceConfig'

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException('The operation was aborted.', 'AbortError')
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function waitForAbortableDelay(delayMs: number, signal?: AbortSignal) {
  if (delayMs <= 0) {
    throwIfAborted(signal)
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

function isVideoPlayable(videoElement: HTMLVideoElement) {
  return (
    videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0
  )
}

export async function ensureVideoElementReady(
  videoElement: HTMLVideoElement,
  signal?: AbortSignal,
) {
  throwIfAborted(signal)

  if (!videoElement.srcObject) {
    throw new Error('Camera preview stream is not connected.')
  }

  if (!isVideoPlayable(videoElement)) {
    await new Promise<void>((resolve, reject) => {
      const handleReady = () => {
        cleanup()
        resolve()
      }

      const handleAbort = () => {
        cleanup()
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      }

      const cleanup = () => {
        videoElement.removeEventListener('loadeddata', handleReady)
        videoElement.removeEventListener('canplay', handleReady)
        videoElement.removeEventListener('playing', handleReady)
        signal?.removeEventListener('abort', handleAbort)
      }

      videoElement.addEventListener('loadeddata', handleReady, { once: true })
      videoElement.addEventListener('canplay', handleReady, { once: true })
      videoElement.addEventListener('playing', handleReady, { once: true })
      signal?.addEventListener('abort', handleAbort, { once: true })
    })
  }

  if (videoElement.paused) {
    await videoElement.play().catch(() => {
      // Muted camera previews can fail autoplay on some browsers until media is fully ready.
    })
  }

  throwIfAborted(signal)
}

function encodeVideoFrameAsBase64(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
) {
  const sourceWidth = videoElement.videoWidth
  const sourceHeight = videoElement.videoHeight

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Eye tracking frame is not available yet.')
  }

  const targetWidth = Math.min(sourceWidth, getEyeTrackingFrameMaxWidth())
  const targetHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * targetWidth))

  canvasElement.width = targetWidth
  canvasElement.height = targetHeight

  const context = canvasElement.getContext('2d', { alpha: false })

  if (!context) {
    throw new Error('Eye tracking frame canvas is unavailable.')
  }

  // 캘리브레이션 UI(gaze_server_9grid.html)는 랜드마크에 (1 - p.x) X축 미러를 적용한다.
  // Python 백엔드도 동일한 좌표 관례를 받아야 다항식이 올바르게 동작한다.
  // → 프레임을 수평 반전해서 전송한다. (ai-eyetracking/시선_예시/runtime_embed.html 과 동일)
  context.save()
  context.scale(-1, 1)
  context.translate(-targetWidth, 0)
  context.drawImage(videoElement, 0, 0, targetWidth, targetHeight)
  context.restore()

  const dataUrl = canvasElement.toDataURL('image/jpeg', getEyeTrackingFrameJpegQuality())
  const [, imageBase64 = ''] = dataUrl.split(',', 2)

  if (!imageBase64) {
    throw new Error('Failed to encode eye tracking frame.')
  }

  return imageBase64
}

export async function readEyeTrackingFrameFromVideo(args: {
  videoElement: HTMLVideoElement
  canvasElement: HTMLCanvasElement
  signal?: AbortSignal
}) {
  const { videoElement, canvasElement, signal } = args

  await ensureVideoElementReady(videoElement, signal)
  const imageBase64 = encodeVideoFrameAsBase64(videoElement, canvasElement)
  return analyzeEyeTrackingFrameApi(imageBase64, signal)
}

export function mapEyeTrackingFrameToTrackingStatus(
  frame: EyeTrackingFrame | null,
): CalibrationTrackingStatus {
  if (!frame?.faceDetected) {
    return 'face-not-detected'
  }

  if (
    frame.ratioX === null ||
    frame.ratioY === null ||
    !Number.isFinite(frame.screenX) ||
    !Number.isFinite(frame.screenY)
  ) {
    return 'tracking-unstable'
  }

  return 'ready'
}

export function getViewportPointFromEyeTrackingFrame(frame: EyeTrackingFrame) {
  return {
    clientX: clampToViewport(frame.screenX, window.innerWidth),
    clientY: clampToViewport(frame.screenY, window.innerHeight),
  }
}

function clampToViewport(value: number, size: number) {
  if (!Number.isFinite(value) || size <= 0) {
    return 0
  }

  return Math.min(Math.max(0, value), 1) * size
}
