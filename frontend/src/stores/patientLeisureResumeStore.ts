import { create } from 'zustand'
import type { LeisureCategoryId, LeisurePlayerRouteState } from '../types/leisure'

export interface PatientLeisureResumeContext {
  routeKind: 'player' | 'browse'
  resumePath: string
  fallbackPath: string
  contentId: string | null
  categoryId: LeisureCategoryId | null
  routeState: LeisurePlayerRouteState | null
  playbackPositionSec: number | null
  wasPlaying: boolean
  canResumePlayback: boolean
  fromLeisure: boolean
  interruptedMessageId: string | null
  savedAt: number
}

interface PatientLeisureResumeState {
  resumeContext: PatientLeisureResumeContext | null
  setResumeContext: (context: PatientLeisureResumeContext) => void
  patchResumeContext: (
    patch:
      | Partial<PatientLeisureResumeContext>
      | ((current: PatientLeisureResumeContext) => Partial<PatientLeisureResumeContext>),
  ) => void
  clearResumeContext: () => void
}

export const usePatientLeisureResumeStore = create<PatientLeisureResumeState>(set => ({
  resumeContext: null,
  setResumeContext: context => {
    set({ resumeContext: context })
  },
  patchResumeContext: patch => {
    set(state => {
      if (!state.resumeContext) {
        return state
      }

      const nextPatch =
        typeof patch === 'function'
          ? patch(state.resumeContext)
          : patch

      return {
        resumeContext: {
          ...state.resumeContext,
          ...nextPatch,
        },
      }
    })
  },
  clearResumeContext: () => {
    set({ resumeContext: null })
  },
}))
