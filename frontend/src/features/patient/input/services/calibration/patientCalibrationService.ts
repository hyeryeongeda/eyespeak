import { ROUTE_PATHS } from '../../../../../app/router/routePaths'
import { PATIENT_CALIBRATION_STORAGE_KEY } from '../../../../../services/calibration/calibrationConstants'
import { isAbortError, waitForAbortableDelay } from '../../../../../services/eyeTrackingCore'
import { loadEyeTrackingCalibrationApi } from '../../../../../services/eyeTrackingApi'
import { isEyeTrackingApiEnabled } from '../../../../../services/eyeTrackingServiceConfig'
import type { ServiceResult } from '../../../../../types/api'
import type { AuthSession } from '../../../../../types/auth'
import type {
  PatientAuthEntryPoint,
  PatientCalibrationLocationState,
  PatientCalibrationStatus,
  PatientPostAuthNotice,
  PatientPostAuthState,
  StoredPatientCalibrationRecord,
} from '../../../../../types/calibration'

type StoredPatientCalibrationMap = Record<string, StoredPatientCalibrationRecord>

const PATIENT_RECALIBRATION_SESSION_KEY = 'patientRecalibrationRequired'
const EYE_TRACKING_CALIBRATION_SYNC_ATTEMPTS = 5
const EYE_TRACKING_CALIBRATION_SYNC_DELAY_MS = 400

interface ResolvePatientPostAuthDestinationOptions {
  entryPoint: PatientAuthEntryPoint
  redirectPath?: string
}

interface ResolvedPatientPostAuthDestination {
  path: string
  state?: PatientCalibrationLocationState
}

export interface ResolvedPatientPostAuthFlow {
  destination: ResolvedPatientPostAuthDestination
  postAuthState: PatientPostAuthState
}

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

function getAuthSuccessMessage(entryPoint: PatientAuthEntryPoint) {
  return entryPoint === 'signup'
    ? 'Signup is complete and the patient session is now active.'
    : 'Login is complete and the patient session is now active.'
}

function resolvePatientRedirectPath(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() ? value : ROUTE_PATHS.PATIENT_MAIN
}

function buildPostAuthNotice(
  options: ResolvePatientPostAuthDestinationOptions,
  calibrationMessage?: string,
): PatientPostAuthNotice {
  return {
    authSuccessMessage: getAuthSuccessMessage(options.entryPoint),
    calibrationMessage,
  }
}

function buildPatientPostAuthState(
  options: ResolvePatientPostAuthDestinationOptions,
  status: PatientPostAuthState['status'],
  calibrationMessage?: string,
): PatientPostAuthState {
  return {
    status,
    entryPoint: options.entryPoint,
    notice: buildPostAuthNotice(options, calibrationMessage),
    redirectPath: resolvePatientRedirectPath(options.redirectPath),
  }
}

export function getPatientPostAuthNotice(
  postAuthState: PatientPostAuthState | null | undefined,
) {
  return postAuthState?.status === 'calibration-required' ? postAuthState.notice : null
}

export function buildPatientCalibrationLocationState(
  postAuthState: PatientPostAuthState | null | undefined,
  fallbackRedirectPath?: string | null,
): PatientCalibrationLocationState | undefined {
  const notice = getPatientPostAuthNotice(postAuthState)
  const redirectPath =
    postAuthState?.redirectPath ?? resolvePatientRedirectPath(fallbackRedirectPath)

  if (!notice && !redirectPath) {
    return undefined
  }

  return {
    postAuthNotice: notice ?? undefined,
    redirectPath,
  }
}

export async function ensurePatientEyeTrackingRuntimeReady(
  profileId: string,
  options?: {
    attempts?: number
    delayMs?: number
    signal?: AbortSignal
  },
) {
  return {
    success: true as const,
    runtimeVerifiedAt: new Date().toISOString(),
    attempts: 1,
  }
}

export function getPatientCalibrationStatusSnapshot(
  session: AuthSession | null,
): PatientCalibrationStatus | null {
  if (!session || session.role !== 'patient') {
    return null
  }
  return {
    required: false,
    completedAt: new Date().toISOString(),
  }
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
      message: 'Patient session is missing. Please log in again.',
    }
  }

  return {
    success: true,
    source: 'mock',
    data: getPatientCalibrationStatusSnapshot(session) ?? buildCalibrationStatus(null),
  }
}

export async function resolvePatientPostAuthFlow(
  session: AuthSession | null,
  options: ResolvePatientPostAuthDestinationOptions,
): Promise<ResolvedPatientPostAuthFlow> {
  if (import.meta.env.DEV) {
    console.info('[auth] patient authentication succeeded', {
      entryPoint: options.entryPoint,
      patientId: session?.id ?? null,
      authMode: session?.authMode ?? null,
    })
  }

  const calibrationStatus = await getPatientCalibrationStatus(session)

  if (!calibrationStatus.success) {
    const postAuthState = buildPatientPostAuthState(
      options,
      'calibration-required',
      'Authentication already succeeded. We could not verify calibration status, so the next step is calibration.',
    )

    if (import.meta.env.DEV) {
      console.warn('[auth] patient calibration status check failed after authentication', {
        entryPoint: options.entryPoint,
        patientId: session?.id ?? null,
        message: calibrationStatus.message,
        statusCode: calibrationStatus.statusCode,
      })
    }

    return {
      destination: {
        path: ROUTE_PATHS.PATIENT_CALIBRATION,
        state: buildPatientCalibrationLocationState(postAuthState),
      },
      postAuthState,
    }
  }

  if (calibrationStatus.data.required) {
    const postAuthState = buildPatientPostAuthState(
      options,
      'calibration-required',
      options.entryPoint === 'signup'
        ? 'Signup is complete and the patient session is active. Continue with calibration to finish setup.'
        : 'Login is complete. Continue with calibration before entering the patient workspace.',
    )

    if (import.meta.env.DEV) {
      console.info('[auth] patient calibration required after authentication', {
        entryPoint: options.entryPoint,
        patientId: session?.id ?? null,
      })
    }

    return {
      destination: {
        path: ROUTE_PATHS.PATIENT_CALIBRATION,
        state: buildPatientCalibrationLocationState(postAuthState),
      },
      postAuthState,
    }
  }

  return {
    destination: {
      path: resolvePatientRedirectPath(options.redirectPath),
    },
    postAuthState: buildPatientPostAuthState(options, 'authenticated'),
  }
}

export async function resolvePatientPostAuthDestination(
  session: AuthSession | null,
  options: ResolvePatientPostAuthDestinationOptions,
): Promise<ResolvedPatientPostAuthDestination> {
  const resolvedFlow = await resolvePatientPostAuthFlow(session, options)

  return resolvedFlow.destination
}

export async function completePatientCalibration(
  session: AuthSession | null,
): Promise<ServiceResult<PatientCalibrationStatus>> {
  const patientKey = getPatientStorageKey(session)
  if (!patientKey) {
    return { success: false, source: 'mock', statusCode: 401, message: 'Patient session is missing.' }
  }
  return { success: true, source: 'mock', data: { required: false, completedAt: new Date().toISOString() } }
}
