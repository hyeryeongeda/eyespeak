import { create } from 'zustand'
import type { TtsPlaybackLifecycleEvent, TtsPlaybackStatus } from '../types/tts'

interface TtsPlaybackState {
  status: TtsPlaybackStatus
  activeRequestId: number | null
  lastEvent: TtsPlaybackLifecycleEvent | null
  errorMessage: string | null
  beginRequest: () => number
  isCurrentRequest: (requestId: number) => boolean
  markResponseReady: (requestId: number) => void
  markPlayRequested: (requestId: number) => void
  markPlaying: (requestId: number) => void
  finishRequest: (requestId: number, event?: Extract<TtsPlaybackLifecycleEvent, 'ended' | 'pause' | 'cleanup' | 'replaced'>) => void
  failRequest: (requestId: number, error: unknown) => void
}

let nextRequestId = 0

function normalizeTtsPlaybackError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'TTS playback failed.'
}

export const useTtsPlaybackStore = create<TtsPlaybackState>((set, get) => ({
  status: 'idle',
  activeRequestId: null,
  lastEvent: null,
  errorMessage: null,

  beginRequest: () => {
    const requestId = nextRequestId + 1
    nextRequestId = requestId

    set({
      status: 'preparing',
      activeRequestId: requestId,
      lastEvent: 'request_started',
      errorMessage: null,
    })

    return requestId
  },

  isCurrentRequest: requestId => get().activeRequestId === requestId,

  markResponseReady: requestId => {
    if (!get().isCurrentRequest(requestId)) {
      return
    }

    set({
      status: 'preparing',
      lastEvent: 'response_received',
    })
  },

  markPlayRequested: requestId => {
    if (!get().isCurrentRequest(requestId)) {
      return
    }

    set({
      status: 'preparing',
      lastEvent: 'play_requested',
    })
  },

  markPlaying: requestId => {
    if (!get().isCurrentRequest(requestId)) {
      return
    }

    set({
      status: 'playing',
      lastEvent: 'playback_started',
      errorMessage: null,
    })
  },

  finishRequest: (requestId, event = 'ended') => {
    if (!get().isCurrentRequest(requestId)) {
      return
    }

    set({
      status: 'idle',
      activeRequestId: null,
      lastEvent: event,
      errorMessage: null,
    })
  },

  failRequest: (requestId, error) => {
    if (!get().isCurrentRequest(requestId)) {
      return
    }

    set({
      status: 'error',
      activeRequestId: null,
      lastEvent: 'error',
      errorMessage: normalizeTtsPlaybackError(error),
    })
  },
}))
