import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import { isEyeTrackingApiEnabled } from '../../../../services/eyeTrackingServiceConfig'
import { createRealPatientRuntimeTrackingService } from './realPatientRuntimeTrackingService'

export interface PatientRuntimeTrackingStartOptions {
  eyeTrackingProfileId: string
  signal?: AbortSignal
  onTrackingStatusChange: (status: CalibrationTrackingStatus) => void
  onDoubleBlink: () => void
}

export interface PatientRuntimeTrackingService {
  start(options: PatientRuntimeTrackingStartOptions): Promise<void> | void
  dispose(): void
}

class NoopPatientRuntimeTrackingService implements PatientRuntimeTrackingService {
  start(_options: PatientRuntimeTrackingStartOptions) {}

  dispose() {}
}

let patientRuntimeTrackingServiceFactory: (() => PatientRuntimeTrackingService) | null = null

export function createPatientRuntimeTrackingService(): PatientRuntimeTrackingService {
  if (patientRuntimeTrackingServiceFactory) {
    return patientRuntimeTrackingServiceFactory()
  }

  return isEyeTrackingApiEnabled()
    ? createRealPatientRuntimeTrackingService()
    : new NoopPatientRuntimeTrackingService()
}

export function registerPatientRuntimeTrackingServiceFactory(
  factory: () => PatientRuntimeTrackingService,
) {
  patientRuntimeTrackingServiceFactory = factory
}
