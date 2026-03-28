import { create } from 'zustand'

export interface GazeInputPoint {
  clientX: number
  clientY: number
  updatedAt: number
}

export interface GazeInputSnapshot {
  clientX: number
  clientY: number
  cell: number | null
}

interface GazeInputState {
  point: GazeInputPoint | null
  cell: number | null
  setSnapshot: (snapshot: GazeInputSnapshot) => void
  clearPoint: () => void
}

export const useGazeInputStore = create<GazeInputState>(set => ({
  point: null,
  cell: null,
  setSnapshot: snapshot => {
    set({
      point: {
        clientX: snapshot.clientX,
        clientY: snapshot.clientY,
        updatedAt: Date.now(),
      },
      cell: snapshot.cell,
    })
  },
  clearPoint: () => {
    set({
      point: null,
      cell: null,
    })
  },
}))
