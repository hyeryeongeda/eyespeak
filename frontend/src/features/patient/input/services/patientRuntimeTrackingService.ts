import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import {
  isBrowserEyeTrackingEnabled,
  isEyeTrackingApiEnabled,
} from '../../../../services/eyeTrackingServiceConfig'
import { createBrowserPatientRuntimeTrackingService } from './browserPatientRuntimeTrackingService'
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

let patientRuntimeTrackingServiceFactory = isEyeTrackingApiEnabled()
  ? createRealPatientRuntimeTrackingService
  : isBrowserEyeTrackingEnabled()
    ? createBrowserPatientRuntimeTrackingService
    : () => new NoopPatientRuntimeTrackingService()

export function createPatientRuntimeTrackingService(): PatientRuntimeTrackingService {
  return patientRuntimeTrackingServiceFactory()
}

export function registerPatientRuntimeTrackingServiceFactory(
  factory: () => PatientRuntimeTrackingService,
) {
  patientRuntimeTrackingServiceFactory = factory
}
