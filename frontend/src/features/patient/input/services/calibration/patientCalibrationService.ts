import type { AuthSession } from '../../../../../types/auth'
import type { ServiceResult } from '../../../../../types/api'
import type {
  PatientCalibrationStatus,
  StoredPatientCalibrationRecord,
} from '../../../../../types/calibration'
import { PATIENT_CALIBRATION_STORAGE_KEY } from '../../../../../services/calibration/calibrationConstants'
import { loadEyeTrackingCalibrationApi } from '../../../../../services/eyeTrackingApi'
import { isEyeTrackingApiEnabled } from '../../../../../services/eyeTrackingServiceConfig'
import { isAbortError, waitForAbortableDelay } from '../../../../../services/eyeTrackingCore'

type StoredPatientCalibrationMap = Record<string, StoredPatientCalibrationRecord>
const PATIENT_RECALIBRATION_SESSION_KEY = 'patientRecalibrationRequired'
const EYE_TRACKING_CALIBRATION_SYNC_ATTEMPTS = 5
const EYE_TRACKING_CALIBRATION_SYNC_DELAY_MS = 400

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizeIdentifier(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

function getPatientStorageKey(session: AuthSession | null) {
  return session?.role === 'patient' ? normalizeIdentifier(session.id) : null
}

export function getPatientEyeTrackingProfileId(session: AuthSession | null) {
  if (session?.role !== 'patient') {
    return null
  }

  return normalizeIdentifier(session.userId) ?? normalizeIdentifier(session.id)
}

function normalizeStoredCalibrationRecord(
  value: StoredPatientCalibrationRecord | null | undefined,
): StoredPatientCalibrationRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const completedAt = normalizeIdentifier(value.completedAt)

  if (!completedAt) {
    return null
  }

  return {
    completedAt,
    eyeTrackingProfileId: normalizeIdentifier(value.eyeTrackingProfileId),
    runtimeVerifiedAt: normalizeIdentifier(value.runtimeVerifiedAt),
  }
}

function readStoredCalibrationMap(): StoredPatientCalibrationMap {
  if (!isBrowser()) {
    return {}
  }

  const rawValue = localStorage.getItem(PATIENT_CALIBRATION_STORAGE_KEY)

  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, StoredPatientCalibrationRecord>

    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(PATIENT_CALIBRATION_STORAGE_KEY)
      return {}
    }

    return Object.entries(parsed).reduce<StoredPatientCalibrationMap>((accumulator, entry) => {
      const [patientId, record] = entry
      const normalizedPatientId = normalizeIdentifier(patientId)
      const normalizedRecord = normalizeStoredCalibrationRecord(record)

      if (normalizedPatientId && normalizedRecord) {
        accumulator[normalizedPatientId] = normalizedRecord
      }

      return accumulator
    }, {})
  } catch {
    localStorage.removeItem(PATIENT_CALIBRATION_STORAGE_KEY)
    return {}
  }
}

function writeStoredCalibrationMap(value: StoredPatientCalibrationMap) {
  if (!isBrowser()) {
    return
  }

  localStorage.setItem(PATIENT_CALIBRATION_STORAGE_KEY, JSON.stringify(value))
}

function getEyeTrackingCalibrationFailureMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Failed to load the stored eye tracking calibration.'
}

export async function ensurePatientEyeTrackingRuntimeReady(
  profileId: string,
  options?: {
    attempts?: number
    delayMs?: number
    signal?: AbortSignal
  },
) {
  const attempts = Math.max(1, options?.attempts ?? EYE_TRACKING_CALIBRATION_SYNC_ATTEMPTS)
  const delayMs = Math.max(0, options?.delayMs ?? EYE_TRACKING_CALIBRATION_SYNC_DELAY_MS)
  let lastMessage = 'Eye tracking calibration data is not ready yet.'

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await loadEyeTrackingCalibrationApi(profileId, options?.signal)

      if (response.ok === false) {
        lastMessage = response.error?.trim() || lastMessage
      } else if (response.calibrated === false) {
        lastMessage = 'Eye tracking calibration finished, but the runtime profile is not ready yet.'
      } else {
        return {
          success: true as const,
          runtimeVerifiedAt: new Date().toISOString(),
          attempts: attempt,
        }
      }
    } catch (error) {
      if (options?.signal?.aborted || isAbortError(error)) {
        throw error
      }

      lastMessage = getEyeTrackingCalibrationFailureMessage(error)
    }

    if (attempt < attempts) {
      await waitForAbortableDelay(delayMs, options?.signal)
    }
  }

  return {
    success: false as const,
    message: lastMessage,
    attempts,
  }
}

function getForcedRecalibrationPatientId() {
  if (!isBrowser()) {
    return null
  }

  return sessionStorage.getItem(PATIENT_RECALIBRATION_SESSION_KEY)
}

function setForcedRecalibrationPatientId(patientId: string) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(PATIENT_RECALIBRATION_SESSION_KEY, patientId)
}

function clearForcedRecalibrationPatientId(patientId: string) {
  if (!isBrowser()) {
    return
  }

  if (getForcedRecalibrationPatientId() === patientId) {
    sessionStorage.removeItem(PATIENT_RECALIBRATION_SESSION_KEY)
  }
}

function buildCalibrationStatus(
  record: StoredPatientCalibrationRecord | null,
): PatientCalibrationStatus {
  return {
    required: record === null,
    completedAt: record?.completedAt ?? null,
  }
}

export function getPatientCalibrationStatusSnapshot(
  session: AuthSession | null,
): PatientCalibrationStatus | null {
  const patientKey = getPatientStorageKey(session)
  const currentEyeTrackingProfileId = getPatientEyeTrackingProfileId(session)

  if (!patientKey) {
    return null
  }

  const storedMap = readStoredCalibrationMap()
  const storedRecord = storedMap[patientKey] ?? null
  const hasProfileMismatch =
    Boolean(storedRecord?.eyeTrackingProfileId) &&
    Boolean(currentEyeTrackingProfileId) &&
    storedRecord?.eyeTrackingProfileId !== currentEyeTrackingProfileId
  const status = buildCalibrationStatus(hasProfileMismatch ? null : storedRecord)

  if (getForcedRecalibrationPatientId() === patientKey) {
    return {
      required: true,
      completedAt: status.completedAt,
    }
  }

  return status
}

export function requestPatientRecalibration(session: AuthSession | null) {
  const patientKey = getPatientStorageKey(session)

  if (!patientKey) {
    return
  }

  setForcedRecalibrationPatientId(patientKey)
}

export async function getPatientCalibrationStatus(
  session: AuthSession | null,
): Promise<ServiceResult<PatientCalibrationStatus>> {
  const patientKey = getPatientStorageKey(session)

  if (!patientKey) {
    return {
      success: false,
      source: 'mock',
      statusCode: 401,
      message: '환자 로그인 정보가 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    success: true,
    source: 'mock',
    data: getPatientCalibrationStatusSnapshot(session) ?? buildCalibrationStatus(null),
  }
}

export async function completePatientCalibration(
  session: AuthSession | null,
): Promise<ServiceResult<PatientCalibrationStatus>> {
  const patientKey = getPatientStorageKey(session)

  if (!patientKey) {
    return {
      success: false,
      source: 'mock',
      statusCode: 401,
      message: '환자 로그인 정보가 없습니다. 다시 로그인해주세요.',
    }
  }

  try {
    const storedMap = readStoredCalibrationMap()
    const completedAt = new Date().toISOString()
    const eyeTrackingProfileId = getPatientEyeTrackingProfileId(session)
    let runtimeVerifiedAt: string | null = null

    if (isEyeTrackingApiEnabled()) {
      if (!eyeTrackingProfileId) {
        return {
          success: false,
          source: 'api',
          statusCode: 400,
          message: 'Eye tracking profile id is missing for this patient session.',
        }
      }

      const runtimeWarmupResult = await ensurePatientEyeTrackingRuntimeReady(
        eyeTrackingProfileId,
      )

      if (!runtimeWarmupResult.success) {
        return {
          success: false,
          source: 'api',
          statusCode: 503,
          message: runtimeWarmupResult.message,
        }
      }

      runtimeVerifiedAt = runtimeWarmupResult.runtimeVerifiedAt
    }

    clearForcedRecalibrationPatientId(patientKey)

    writeStoredCalibrationMap({
      ...storedMap,
      [patientKey]: {
        completedAt,
        eyeTrackingProfileId: eyeTrackingProfileId ?? null,
        runtimeVerifiedAt,
      },
    })

    return {
      success: true,
      source: isEyeTrackingApiEnabled() ? 'api' : 'mock',
      data: {
        required: false,
        completedAt,
      },
    }
  } catch {
    return {
      success: false,
      source: 'mock',
      statusCode: 500,
      message: '캘리브레이션 완료 상태를 저장하지 못했습니다. 다시 시도해주세요.',
    }
  }
}
