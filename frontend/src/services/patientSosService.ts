import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { AuthSession } from '../types/auth'
import { createServiceFailure } from '../utils/errorMapper'

export const PATIENT_SOS_COOLDOWN_MS = 30_000

const PATIENT_SOS_STORAGE_PREFIX = 'patientSosLastTriggeredAt'

interface CallCreateRequest {
  matchingId: number
  type: 'NORMAL' | 'SOS'
}

interface CallCreateResponse {
  callId: number
  matchingId: number
  type: string
  status: string
  senderId: number
  timestamp: string
}

export interface PatientCallRequestResult {
  success: boolean
  remainingMs: number
  requestedAt: number | null
  callId?: number
  message?: string
}

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let sharedAudioContext: AudioContext | null = null

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

export async function requestPatientCall(
  matchingId: number,
  callType: 'NORMAL' | 'SOS',
  session: Pick<AuthSession, 'accessToken'> | null = null,
): Promise<PatientCallRequestResult> {
  if (!session?.accessToken) {
    return {
      success: false,
      remainingMs: 0,
      requestedAt: null,
      message: '인증 정보가 없습니다.',
    }
  }

  if (matchingId == null) {
    return {
      success: false,
      remainingMs: 0,
      requestedAt: null,
      message: '매칭 정보가 없습니다.',
    }
  }

  const patientIdStr = String(matchingId)
  const remainingMs = getRemainingPatientSosCooldownMs(patientIdStr)

  if (remainingMs > 0) {
    return {
      success: false,
      remainingMs,
      requestedAt: null,
    }
  }

  const requestedAt = Date.now()
  storeLastPatientSosAt(patientIdStr, requestedAt)

  if (callType === 'SOS') {
    await playPatientSirenSound()
  }

  try {
    const response = await apiClient.post<CallCreateResponse, CallCreateRequest>(
      API_ENDPOINTS.CALL_CREATE,
      { matchingId, type: callType },
      { accessToken: session.accessToken },
    )

    return {
      success: true,
      remainingMs: 0,
      requestedAt,
      callId: response?.callId,
    }
  } catch (error) {
    const failure = createServiceFailure(error, '호출 전송에 실패했습니다.')
    return {
      success: false,
      remainingMs: 0,
      requestedAt,
      message: failure.message,
    }
  }
}
