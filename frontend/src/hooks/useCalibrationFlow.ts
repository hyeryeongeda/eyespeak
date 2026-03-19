import { useEffect, useRef, useState, type RefObject } from 'react'
import { DEFAULT_CALIBRATION_POINTS } from '../services/calibration/calibrationConstants'
import {
  createGazeTrackingService,
  type GazeTrackingService,
} from '../services/calibration/gazeTrackingService'
import type {
  CalibrationPhase,
  CalibrationPoint,
  CalibrationTrackingStatus,
} from '../types/calibration'

interface UseCalibrationFlowOptions {
  enabled: boolean
  previewStream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
}

export function useCalibrationFlow({
  enabled,
  previewStream,
  videoRef,
}: UseCalibrationFlowOptions) {
  const serviceRef = useRef<GazeTrackingService>(createGazeTrackingService())
  const activeControllerRef = useRef<AbortController | null>(null)
  const [phase, setPhase] = useState<CalibrationPhase>('idle')
  const [trackingStatus, setTrackingStatus] =
    useState<CalibrationTrackingStatus>('idle')
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [completedPointIds, setCompletedPointIds] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [resetSeed, setResetSeed] = useState(0)

  const points = DEFAULT_CALIBRATION_POINTS

  const abortActiveWork = () => {
    activeControllerRef.current?.abort()
    activeControllerRef.current = null
  }

  useEffect(() => {
    const service = serviceRef.current

    abortActiveWork()
    setCompletedPointIds([])
    setCurrentPointIndex(0)
    setErrorMessage('')

    if (!enabled || !previewStream || !videoRef.current) {
      setPhase('idle')
      setTrackingStatus('idle')
      service.dispose()
      return
    }

    const controller = new AbortController()
    activeControllerRef.current = controller
    setPhase('checking-face')
    setTrackingStatus('face-not-detected')

    void (async () => {
      try {
        await service.connectPreview(videoRef.current!)
        await service.runReadinessCheck({
          signal: controller.signal,
          onStatusChange: status => {
            if (controller.signal.aborted) {
              return
            }

            setTrackingStatus(status)
            setPhase(status === 'ready' ? 'ready' : 'checking-face')
          },
        })
      } catch {
        if (controller.signal.aborted) {
          return
        }

        setPhase('error')
        setTrackingStatus('idle')
        setErrorMessage('얼굴 추적을 준비하지 못했습니다. 다시 시도해주세요.')
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null
        }
      }
    })()

    return () => {
      controller.abort()

      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null
      }

      service.dispose()
    }
  }, [enabled, previewStream, resetSeed, videoRef])

  const startCalibration = async () => {
    if (phase !== 'ready') {
      return false
    }

    if (!videoRef.current) {
      setPhase('error')
      setErrorMessage('카메라 프리뷰를 불러오지 못했습니다. 다시 시도해주세요.')
      return false
    }

    abortActiveWork()
    setPhase('calibrating')
    setErrorMessage('')
    setCompletedPointIds([])
    setCurrentPointIndex(0)

    const controller = new AbortController()
    activeControllerRef.current = controller

    try {
      for (let index = 0; index < points.length; index += 1) {
        const point = points[index]
        setCurrentPointIndex(index)

        const result = await serviceRef.current.capturePoint(point, {
          signal: controller.signal,
        })

        if (!result.success) {
          setTrackingStatus(result.trackingStatus ?? 'tracking-unstable')
          setPhase('ready')
          setErrorMessage('얼굴을 화면 중앙에 맞춰주세요.')
          return false
        }

        setCompletedPointIds(prev => [...prev, point.id])
      }

      setTrackingStatus('ready')
      setPhase('completed')
      return true
    } catch {
      if (controller.signal.aborted) {
        return false
      }

      setPhase('error')
      setTrackingStatus('idle')
      setErrorMessage('캘리브레이션을 진행하지 못했습니다. 다시 시도해주세요.')
      return false
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null
      }
    }
  }

  const resetCalibration = () => {
    abortActiveWork()
    setResetSeed(prev => prev + 1)
  }

  const activePoint: CalibrationPoint | null =
    phase === 'calibrating' ? points[currentPointIndex] ?? null : null

  return {
    points,
    phase,
    trackingStatus,
    activePoint,
    currentPointIndex,
    completedPointIds,
    completedCount: completedPointIds.length,
    progressRatio: points.length === 0 ? 0 : completedPointIds.length / points.length,
    errorMessage,
    startCalibration,
    resetCalibration,
  }
}

export default useCalibrationFlow
