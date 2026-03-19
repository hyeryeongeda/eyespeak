import { useEffect } from 'react'
import {
  emitPatientDoubleBlink,
  emitPatientTrackingStatus,
} from '../services/patientModeBridge'
import { createPatientRuntimeTrackingService } from '../services/patientRuntimeTrackingService'

interface UsePatientRuntimeTrackingOptions {
  enabled?: boolean
  patientId: string | null
}

export function usePatientRuntimeTracking({
  enabled = true,
  patientId,
}: UsePatientRuntimeTrackingOptions) {
  useEffect(() => {
    if (!enabled || !patientId) {
      return
    }

    const controller = new AbortController()
    const runtimeTrackingService = createPatientRuntimeTrackingService()

    void Promise.resolve(
      runtimeTrackingService.start({
        patientId,
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
  }, [enabled, patientId])
}

export default usePatientRuntimeTracking
