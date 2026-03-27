import { create } from 'zustand'
import type { DwellPhase } from '../hooks/useDwell'

export type GazeSelectionInputSource = 'pointer' | 'gaze' | null
export type GazeSelectionCommitSource = 'gaze-dwell' | 'pointer-dwell'

export interface GazeSelectionDebugState {
  inputSource?: GazeSelectionInputSource
  clientX?: number | null
  clientY?: number | null
  gazeCell?: number | null
  rawTargetKey: string | null
  rawTargetId: string | null
  rawTargetSource: string | null
  rawTargetCell: number | null
  rawTargetGroupId: string | null
  stableTargetKey: string | null
  stableTargetId: string | null
  stableTargetSource: string | null
  stableTargetCell: number | null
  stableTargetGroupId: string | null
  hoveredTargetKey: string | null
  hoveredTargetId: string | null
  hoveredTargetBlockedReason: string | null
  dwellPhase?: DwellPhase
  dwellProgress?: number
  dwellRemainingMs?: number
  switchGracePending?: boolean
  switchGraceStartedAt?: number | null
  switchGraceMs?: number | null
  gazePointUpdatedAt?: number | null
  lastCancelReason: string | null
  lastCommitTargetKey: string | null
  lastCommitTargetId: string | null
  lastCommitSource: GazeSelectionCommitSource | null
}

export interface GazeSelectionSnapshot {
  enabled: boolean
  inputSource: GazeSelectionInputSource
  hoveredTargetId: string | null
  activeTargetId: string | null
  rawTargetId: string | null
  stableTargetId: string | null
  phase: DwellPhase
  progress: number
  remainingMs: number
  debug: GazeSelectionDebugState
}

type GazeSelectionSnapshotUpdate = Omit<Partial<GazeSelectionSnapshot>, 'debug'> & {
  debug?: Partial<GazeSelectionDebugState>
}

interface GazeSelectionStore extends GazeSelectionSnapshot {
  setSelectionSnapshot: (snapshot: GazeSelectionSnapshotUpdate) => void
  resetSelectionSnapshot: () => void
}

const initialState: GazeSelectionSnapshot = {
  enabled: false,
  inputSource: null,
  hoveredTargetId: null,
  activeTargetId: null,
  rawTargetId: null,
  stableTargetId: null,
  phase: 'idle',
  progress: 0,
  remainingMs: 0,
  debug: {
    inputSource: null,
    clientX: null,
    clientY: null,
    gazeCell: null,
    rawTargetKey: null,
    rawTargetId: null,
    rawTargetSource: null,
    rawTargetCell: null,
    rawTargetGroupId: null,
    stableTargetKey: null,
    stableTargetId: null,
    stableTargetSource: null,
    stableTargetCell: null,
    stableTargetGroupId: null,
    hoveredTargetKey: null,
    hoveredTargetId: null,
    hoveredTargetBlockedReason: null,
    dwellPhase: 'idle',
    dwellProgress: 0,
    dwellRemainingMs: 0,
    switchGracePending: false,
    switchGraceStartedAt: null,
    switchGraceMs: null,
    gazePointUpdatedAt: null,
    lastCancelReason: null,
    lastCommitTargetKey: null,
    lastCommitTargetId: null,
    lastCommitSource: null,
  },
}

export const useGazeSelectionStore = create<GazeSelectionStore>(set => ({
  ...initialState,
  setSelectionSnapshot: snapshot =>
    set(state => ({
      ...state,
      ...snapshot,
      debug: {
        ...state.debug,
        ...(snapshot.debug ?? {}),
      },
    })),
  resetSelectionSnapshot: () => {
    set(initialState)
  },
}))
