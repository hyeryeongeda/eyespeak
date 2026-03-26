import { getActiveAiApiMode } from './aiServiceConfig'
import { getActiveAuthSession } from './authSessionRegistry'
import { synthesizeTtsApi } from './ttsApi'
import { useTtsPlaybackStore } from '../stores/ttsPlaybackStore'
import type {
  AudioPlaybackHandle,
  AudioPlaybackSource,
  TtsPlaybackLifecycleEvent,
  TtsSynthesizeRequestDto,
} from '../types/tts'
import { createSilentWavBlob, normalizeAudioResponse, playAudioSource } from '../utils/audio'

let activeTtsPlayback: AudioPlaybackHandle | null = null

function getAccessToken() {
  return getActiveAuthSession()?.accessToken ?? null
}

function createMockAudioSource() {
  return normalizeAudioResponse(createSilentWavBlob())
}

export function stopActiveSynthesizeTtsPlayback(
  event: Extract<TtsPlaybackLifecycleEvent, 'cleanup' | 'replaced'> = 'cleanup',
) {
  const { activeRequestId, finishRequest } = useTtsPlaybackStore.getState()

  if (activeRequestId !== null) {
    finishRequest(activeRequestId, event)
  }

  activeTtsPlayback?.cleanup()
  activeTtsPlayback = null
}

export async function previewTts(request: TtsSynthesizeRequestDto): Promise<AudioPlaybackSource> {
  if (getActiveAiApiMode() !== 'real') {
    return createMockAudioSource()
  }

  const response = await synthesizeTtsApi(request, getAccessToken())
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

  stopActiveSynthesizeTtsPlayback('replaced')

  const ttsPlaybackState = useTtsPlaybackStore.getState()
  const requestId = ttsPlaybackState.beginRequest()

  try {
    const source = await synthesizeTts(request)

    if (!useTtsPlaybackStore.getState().isCurrentRequest(requestId)) {
      source.revoke?.()
      return null
    }

    useTtsPlaybackStore.getState().markResponseReady(requestId)

    let playbackHandle: AudioPlaybackHandle | null = null
    useTtsPlaybackStore.getState().markPlayRequested(requestId)

    playbackHandle = await playAudioSource(source, {
      onPlaybackStart: () => {
        useTtsPlaybackStore.getState().markPlaying(requestId)
      },
      onPlaybackEnd: reason => {
        if (activeTtsPlayback === playbackHandle) {
          activeTtsPlayback = null
        }

        if (reason === 'error') {
          return
        }

        useTtsPlaybackStore.getState().finishRequest(requestId, reason)
      },
      onPlaybackError: error => {
        useTtsPlaybackStore.getState().failRequest(requestId, error)
      },
    })

    if (!useTtsPlaybackStore.getState().isCurrentRequest(requestId)) {
      playbackHandle.cleanup()
      return null
    }

    activeTtsPlayback = playbackHandle
    return playbackHandle
  } catch (error) {
    useTtsPlaybackStore.getState().failRequest(requestId, error)
    throw error
  }
}
