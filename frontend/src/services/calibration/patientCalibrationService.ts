import type { AuthSession } from '../../types/auth'
import type { ServiceResult } from '../../types/api'
import type {
  PatientCalibrationStatus,
  StoredPatientCalibrationRecord,
} from '../../types/calibration'
import { PATIENT_CALIBRATION_STORAGE_KEY } from './calibrationConstants'

type StoredPatientCalibrationMap = Record<string, StoredPatientCalibrationRecord>
const PATIENT_RECALIBRATION_SESSION_KEY = 'patientRecalibrationRequired'

function isBrowser() {
  return typeof window !== 'undefined'
}

function getPatientStorageKey(session: AuthSession | null) {
  return session?.role === 'patient' ? String(session.id) : null
}

function isValidStoredCalibrationRecord(
  value: StoredPatientCalibrationRecord | null | undefined,
): value is StoredPatientCalibrationRecord {
  return Boolean(value && typeof value.completedAt === 'string' && value.completedAt.trim())
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

      if (isValidStoredCalibrationRecord(record)) {
        accumulator[patientId] = record
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

  if (!patientKey) {
    return null
  }

  const storedMap = readStoredCalibrationMap()
  const status = buildCalibrationStatus(storedMap[patientKey] ?? null)

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
    clearForcedRecalibrationPatientId(patientKey)

    writeStoredCalibrationMap({
      ...storedMap,
      [patientKey]: {
        completedAt,
      },
    })

    return {
      success: true,
      source: 'mock',
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
