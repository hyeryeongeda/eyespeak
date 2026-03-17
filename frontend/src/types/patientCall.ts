export type PatientCallFlowStatus =
  | 'idle'
  | 'requesting'
  | 'success'
  | 'cooldown'

export interface MockPatientCallSuccess {
  success: true
  requestedAt: number
}

export interface MockPatientCallCooldownFailure {
  success: false
  reason: 'cooldown'
  remainingMs: number
}

export type MockPatientCallRequestResult =
  | MockPatientCallSuccess
  | MockPatientCallCooldownFailure
