import { useEffect } from 'react'
import {
  emitPatientDoubleBlink,
  emitPatientTrackingStatus,
} from '../services/patientModeBridge'
import { createPatientRuntimeTrackingService } from '../services/patientRuntimeTrackingService'
import { useGazeInputStore } from '../stores/gazeInputStore'

interface UsePatientRuntimeTrackingOptions {
  enabled?: boolean
  eyeTrackingProfileId: string | null
}

export function usePatientRuntimeTracking({
  enabled = true,
  eyeTrackingProfileId,
}: UsePatientRuntimeTrackingOptions) {
  useEffect(() => {
    if (!enabled || !eyeTrackingProfileId) {
      return
    }

    let rafId = 0

    const runInterpolationFrame = () => {
      useGazeInputStore.getState().interpolate()
      rafId = window.requestAnimationFrame(runInterpolationFrame)
    }

    rafId = window.requestAnimationFrame(runInterpolationFrame)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [enabled, eyeTrackingProfileId])

  useEffect(() => {
    if (!enabled || !eyeTrackingProfileId) {
      useGazeInputStore.getState().clearPoint()
      emitPatientTrackingStatus('idle')
      return
    }

    const controller = new AbortController()
    const runtimeTrackingService = createPatientRuntimeTrackingService()

    void Promise.resolve(
      runtimeTrackingService.start({
        eyeTrackingProfileId,
        signal: controller.signal,
        onDoubleBlink: () => {
          emitPatientDoubleBlink()
        },
        onTrackingStatusChange: status => {
          emitPatientTrackingStatus(status)
        },
      }),
    ).catch(() => {
      if (!controller.signal.aborted) {
        emitPatientTrackingStatus('tracking-unstable')
      }
    })

    return () => {
      controller.abort()
      runtimeTrackingService.dispose()
    }
  }, [enabled, eyeTrackingProfileId])
}

export default usePatientRuntimeTracking
