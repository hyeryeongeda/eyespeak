import { getActiveAiApiMode } from './aiServiceConfig'
import { getActiveAuthSession } from './authSessionRegistry'
import { synthesizeTtsApi, testTtsApi } from './ttsApi'
import type {
  AudioPlaybackHandle,
  AudioPlaybackSource,
  TtsPreviewRequestDto,
  TtsSynthesizeRequestDto,
} from '../types/tts'
import { createSilentWavBlob, normalizeAudioResponse, playAudioSource } from '../utils/audio'

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function createMockAudioSource() {
  return normalizeAudioResponse(createSilentWavBlob())
}

export async function previewTts(request: TtsPreviewRequestDto): Promise<AudioPlaybackSource> {
  if (getActiveAiApiMode() !== 'real') {
    return createMockAudioSource()
  }

  const response = await testTtsApi(request, getAccessToken())
  return normalizeAudioResponse(response)
}

export async function synthesizeTts(
  request: TtsSynthesizeRequestDto,
): Promise<AudioPlaybackSource> {
  if (getActiveAiApiMode() !== 'real') {
    return createMockAudioSource()
  }

  const response = await synthesizeTtsApi(request, getAccessToken())
  return normalizeAudioResponse(response)
}

export async function playSynthesizeTts(
  request: TtsSynthesizeRequestDto,
): Promise<AudioPlaybackHandle | null> {
  if (getActiveAiApiMode() !== 'real') {
    return null
  }

  const source = await synthesizeTts(request)
  return playAudioSource(source)
}
