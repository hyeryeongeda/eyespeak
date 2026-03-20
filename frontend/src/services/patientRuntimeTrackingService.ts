import type { CalibrationTrackingStatus } from '../types/calibration'

export interface PatientRuntimeTrackingStartOptions {
  patientId: string
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

let patientRuntimeTrackingServiceFactory = () => new NoopPatientRuntimeTrackingService()

export function createPatientRuntimeTrackingService(): PatientRuntimeTrackingService {
  return patientRuntimeTrackingServiceFactory()
}

export function registerPatientRuntimeTrackingServiceFactory(
  factory: () => PatientRuntimeTrackingService,
) {
  patientRuntimeTrackingServiceFactory = factory
}
