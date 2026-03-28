import type { AudioPlaybackHandle, AudioPlaybackSource, TtsAudioResponseDto } from '../types/tts'

type AudioPlaybackEndReason = 'ended' | 'pause' | 'error' | 'cleanup'

interface PlayAudioSourceOptions {
  audio?: HTMLAudioElement
  onPlaybackStart?: () => void
  onPlaybackEnd?: (reason: AudioPlaybackEndReason) => void
  onPlaybackError?: (error: Error) => void
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

export function createSilentWavBlob(durationMs = 800, sampleRate = 16000) {
  const sampleCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000))
  const bytesPerSample = 2
  const dataSize = sampleCount * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  return new Blob([buffer], { type: 'audio/wav' })
}

function toDataUrl(base64: string, mimeType = 'audio/wav') {
  const normalizedBase64 = base64.includes(',') ? base64.split(',').pop() ?? '' : base64
  return `data:${mimeType};base64,${normalizedBase64}`
}

function isDirectAudioSource(value: string) {
  return /^(blob:|data:|https?:\/\/|\/)/.test(value)
}

export function normalizeAudioResponse(
  payload: Blob | string | TtsAudioResponseDto,
): AudioPlaybackSource {
  if (payload instanceof Blob) {
    const objectUrl = URL.createObjectURL(payload)
    return {
      src: objectUrl,
      revoke: () => URL.revokeObjectURL(objectUrl),
    }
  }

  if (typeof payload === 'string') {
    return {
      src: isDirectAudioSource(payload) ? payload : toDataUrl(payload),
    }
  }

  if (payload.blob instanceof Blob) {
    return normalizeAudioResponse(payload.blob)
  }

  if (payload.audioUrl || payload.url) {
    return {
      src: payload.audioUrl ?? payload.url ?? '',
    }
  }

  if (payload.audioBase64 || payload.base64) {
    return {
      src: toDataUrl(payload.audioBase64 ?? payload.base64 ?? '', payload.mimeType ?? 'audio/wav'),
    }
  }

  throw new Error('Unsupported audio payload.')
}

export async function playAudioSource(
  source: AudioPlaybackSource,
  options: PlayAudioSourceOptions = {},
): Promise<AudioPlaybackHandle> {
  const audio = options.audio ?? new Audio()
  let isSettled = false
  let hasStartedPlayback = false

  const removeListeners = () => {
    audio.removeEventListener('playing', handlePlaying)
    audio.removeEventListener('ended', handleEnded)
    audio.removeEventListener('pause', handlePause)
    audio.removeEventListener('error', handleError)
  }

  const cleanupSource = () => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    source.revoke?.()
  }

  const finalizePlayback = (reason: AudioPlaybackEndReason) => {
    if (isSettled) {
      return
    }

    isSettled = true
    removeListeners()
    cleanupSource()
    options.onPlaybackEnd?.(reason)
  }

  const handlePlaying = () => {
    if (hasStartedPlayback || isSettled) {
      return
    }

    hasStartedPlayback = true
    options.onPlaybackStart?.()
  }

  const handleEnded = () => {
    finalizePlayback('ended')
  }

  const handlePause = () => {
    if (isSettled || audio.ended) {
      return
    }

    finalizePlayback('pause')
  }

  const handleError = () => {
    const error = new Error('Audio playback failed.')

    options.onPlaybackError?.(error)
    finalizePlayback('error')
  }

  audio.addEventListener('playing', handlePlaying)
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('pause', handlePause)
  audio.addEventListener('error', handleError)
  audio.src = source.src

  try {
    await audio.play()
  } catch (error) {
    removeListeners()
    cleanupSource()
    throw error
  }

  return {
    audio,
    cleanup: () => {
      finalizePlayback('cleanup')
    },
  }
}
