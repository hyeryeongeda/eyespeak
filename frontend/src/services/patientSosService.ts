import { apiClient } from './apiClient'
import type { AuthSession } from '../types/auth'
import type { ServiceResult } from '../types/api'
import { createServiceFailure } from '../utils/errorMapper'

export const PATIENT_SOS_COOLDOWN_MS = 30_000

const PATIENT_SOS_STORAGE_PREFIX = 'patientSosLastTriggeredAt'
const PATIENT_SOS_API_ENDPOINT = import.meta.env.VITE_PATIENT_SOS_ENDPOINT?.trim() || null

export interface PatientSosRequestPayload {
  patientId: string
  requestedAt: string
  teamCode?: string | null
}

interface MockPatientSosRequestResult {
  success: boolean
  remainingMs: number
  requestedAt: number | null
  message?: string
}

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let sharedAudioContext: AudioContext | null = null
let patientSosRequestTransport: null | ((
  payload: PatientSosRequestPayload,
  session: Pick<AuthSession, 'accessToken' | 'teamCode'> | null,
) => Promise<ServiceResult<null>>) = null

function isBrowser() {
  return typeof window !== 'undefined'
}

function getPatientSosStorageKey(patientId: string) {
  return `${PATIENT_SOS_STORAGE_PREFIX}:${patientId}`
}

function getStoredLastPatientSosAt(patientId: string) {
  if (!isBrowser()) {
    return null
  }

  const savedValue = sessionStorage.getItem(getPatientSosStorageKey(patientId))

  if (!savedValue) {
    return null
  }

  const parsed = Number(savedValue)
  return Number.isFinite(parsed) ? parsed : null
}

function storeLastPatientSosAt(patientId: string, requestedAt: number) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(getPatientSosStorageKey(patientId), String(requestedAt))
}

export function registerPatientSosRequestTransport(
  transport: null | ((
    payload: PatientSosRequestPayload,
    session: Pick<AuthSession, 'accessToken' | 'teamCode'> | null,
  ) => Promise<ServiceResult<null>>),
) {
  patientSosRequestTransport = transport
}

function getAudioContext() {
  if (!isBrowser()) {
    return null
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext

  if (!AudioContextConstructor) {
    return null
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextConstructor()
  }

  return sharedAudioContext
}

export function getRemainingPatientSosCooldownMs(patientId: string, now = Date.now()) {
  const lastTriggeredAt = getStoredLastPatientSosAt(patientId)

  if (!lastTriggeredAt) {
    return 0
  }

  return Math.max(0, PATIENT_SOS_COOLDOWN_MS - (now - lastTriggeredAt))
}

export function getPatientSosCooldownSeconds(patientId: string, now = Date.now()) {
  return Math.ceil(getRemainingPatientSosCooldownMs(patientId, now) / 1000)
}

export async function playPatientSirenSound(durationMs = 1800) {
  const audioContext = getAudioContext()

  if (!audioContext) {
    return
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  const startAt = audioContext.currentTime
  const stopAt = startAt + durationMs / 1000
  const sweepIntervalSeconds = 0.2

  oscillator.type = 'sawtooth'
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  for (let time = startAt, step = 0; time <= stopAt; time += sweepIntervalSeconds, step += 1) {
    oscillator.frequency.setValueAtTime(step % 2 === 0 ? 740 : 1080, time)
  }

  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(0.16, startAt + 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt)

  oscillator.start(startAt)
  oscillator.stop(stopAt)

  oscillator.onended = () => {
    oscillator.disconnect()
    gainNode.disconnect()
  }
}

export async function requestMockPatientSos(
  patientId: string,
  session: Pick<AuthSession, 'accessToken' | 'teamCode'> | null = null,
): Promise<MockPatientSosRequestResult> {
  const remainingMs = getRemainingPatientSosCooldownMs(patientId)

  if (remainingMs > 0) {
    return {
      success: false,
      remainingMs,
      requestedAt: null,
    }
  }

  const requestedAt = Date.now()
  const payload: PatientSosRequestPayload = {
    patientId,
    requestedAt: new Date(requestedAt).toISOString(),
    teamCode: session?.teamCode ?? null,
  }

  storeLastPatientSosAt(patientId, requestedAt)
  await playPatientSirenSound()

  try {
    if (patientSosRequestTransport) {
      const transportResult = await patientSosRequestTransport(payload, session)

      if (!transportResult.success) {
        return {
          success: false,
          remainingMs: 0,
          requestedAt,
          message: transportResult.message,
        }
      }
    } else if (PATIENT_SOS_API_ENDPOINT && session?.accessToken) {
      await apiClient.post<null, PatientSosRequestPayload>(PATIENT_SOS_API_ENDPOINT, payload, {
        accessToken: session.accessToken,
      })
    }
  } catch (error) {
    const failure = createServiceFailure(error, 'SOS 호출 전송에 실패했습니다.')
    return {
      success: false,
      remainingMs: 0,
      requestedAt,
      message: failure.message,
    }
  }

  return {
    success: true,
    remainingMs: 0,
    requestedAt,
  }
}
