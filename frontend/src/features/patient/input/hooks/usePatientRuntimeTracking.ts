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
