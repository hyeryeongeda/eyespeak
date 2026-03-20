import type { AudioPlaybackHandle, AudioPlaybackSource, TtsAudioResponseDto } from '../types/tts'

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

function toDataUrl(base64: string, mimeType = 'audio/mpeg') {
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
      src: toDataUrl(payload.audioBase64 ?? payload.base64 ?? '', payload.mimeType ?? 'audio/mpeg'),
    }
  }

  throw new Error('Unsupported audio payload.')
}

export async function playAudioSource(
  source: AudioPlaybackSource,
  audio = new Audio(),
): Promise<AudioPlaybackHandle> {
  audio.src = source.src
  await audio.play()

  return {
    audio,
    cleanup: () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      source.revoke?.()
    },
  }
}
