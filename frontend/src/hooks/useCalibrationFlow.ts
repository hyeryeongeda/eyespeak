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
  patientId?: string | null
  previewStream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
}

export function useCalibrationFlow({
  enabled,
  patientId,
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
        setErrorMessage('?쇨뎬 異붿쟻??以鍮꾪븯吏 紐삵뻽?듬땲?? ?ㅼ떆 ?쒕룄?댁＜?몄슂.')
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
      setErrorMessage('移대찓???꾨━酉곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?ㅼ떆 ?쒕룄?댁＜?몄슂.')
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
          setErrorMessage('?쇨뎬???붾㈃ 以묒븰??留욎떠二쇱꽭??')
          return false
        }

        setCompletedPointIds(prev => [...prev, point.id])
      }

      const completionResult = await serviceRef.current.completeCalibration({
        patientId,
        signal: controller.signal,
      })

      if (!completionResult.success) {
        setTrackingStatus(completionResult.trackingStatus ?? 'tracking-unstable')
        setPhase('ready')
        setErrorMessage('Eye tracking calibration could not be saved. Please try again.')
        return false
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
      setErrorMessage('罹섎━釉뚮젅?댁뀡??吏꾪뻾?섏? 紐삵뻽?듬땲?? ?ㅼ떆 ?쒕룄?댁＜?몄슂.')
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
