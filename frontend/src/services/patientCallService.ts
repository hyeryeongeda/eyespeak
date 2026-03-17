import type { MockPatientCallRequestResult } from '../types/patientCall'

export const PATIENT_CALL_COOLDOWN_MS = 30_000
export const MOCK_PATIENT_CALL_DELAY_MS = 1500

const PATIENT_CALL_STORAGE_PREFIX = 'patientCallLastRequestedAt'

function isBrowser() {
  return typeof window !== 'undefined'
}

function getPatientCallStorageKey(patientId: string) {
  return `${PATIENT_CALL_STORAGE_PREFIX}:${patientId}`
}

function getStoredLastPatientCallAt(patientId: string) {
  if (!isBrowser()) {
    return null
  }

  const savedValue = sessionStorage.getItem(getPatientCallStorageKey(patientId))

  if (!savedValue) {
    return null
  }

  const parsed = Number(savedValue)
  return Number.isFinite(parsed) ? parsed : null
}

function storeLastPatientCallAt(patientId: string, requestedAt: number) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(getPatientCallStorageKey(patientId), String(requestedAt))
}

export function getRemainingPatientCallCooldownMs(patientId: string, now = Date.now()) {
  const lastRequestedAt = getStoredLastPatientCallAt(patientId)

  if (!lastRequestedAt) {
    return 0
  }

  return Math.max(0, PATIENT_CALL_COOLDOWN_MS - (now - lastRequestedAt))
}

export function getPatientCallCooldownSeconds(patientId: string, now = Date.now()) {
  return Math.ceil(getRemainingPatientCallCooldownMs(patientId, now) / 1000)
}

export async function requestMockPatientCall(
  patientId: string,
): Promise<MockPatientCallRequestResult> {
  const remainingMs = getRemainingPatientCallCooldownMs(patientId)

  if (remainingMs > 0) {
    return {
      success: false,
      reason: 'cooldown',
      remainingMs,
    }
  }

  await new Promise(resolve => {
    setTimeout(resolve, MOCK_PATIENT_CALL_DELAY_MS)
  })

  const requestedAt = Date.now()
  storeLastPatientCallAt(patientId, requestedAt)

  return {
    success: true,
    requestedAt,
  }
}
