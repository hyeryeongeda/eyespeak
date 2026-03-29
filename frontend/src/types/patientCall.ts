export type PatientCallFlowStatus =
  | 'idle'
  | 'requesting'
  | 'success'

export interface MockPatientCallSuccess {
  success: true
  requestedAt: number
}

export type MockPatientCallRequestResult = MockPatientCallSuccess
