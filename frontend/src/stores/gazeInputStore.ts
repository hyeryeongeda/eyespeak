import { create } from 'zustand'

export interface GazeInputPoint {
  clientX: number
  clientY: number
  updatedAt: number
}

interface GazeInputState {
  point: GazeInputPoint | null
  setPoint: (point: Omit<GazeInputPoint, 'updatedAt'>) => void
  clearPoint: () => void
}

export const useGazeInputStore = create<GazeInputState>(set => ({
  point: null,
  setPoint: point => {
    set({
      point: {
        ...point,
        updatedAt: Date.now(),
      },
    })
  },
  clearPoint: () => {
    set({ point: null })
  },
}))
