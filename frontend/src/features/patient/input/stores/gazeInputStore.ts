import { create } from 'zustand'

import { getActiveEyeTrackingApiMode } from '../../../../services/eyeTrackingServiceConfig'

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

const LERP_FACTOR = (() => {
  const env = import.meta.env.VITE_GAZE_LERP_FACTOR
  if (env) {
    const v = parseFloat(env)
    if (Number.isFinite(v) && v > 0 && v <= 1) {
      return v
    }
  }
  return 0.15
})()

interface GazeInputState {
  /** API·런타임이 갱신하는 목표 화면 좌표 */
  targetX: number
  targetY: number
  /** 보간되어 UI에 반영되는 좌표 */
  currentX: number
  currentY: number
  lastInterpolationTime: number
  point: GazeInputPoint | null
  cell: number | null
  setPoint: (point: Omit<GazeInputPoint, 'updatedAt'>) => void
  setSnapshot: (snapshot: GazeInputSnapshot) => void
  clearPoint: () => void
  interpolate: () => void
}

export const useGazeInputStore = create<GazeInputState>((set, get) => ({
  targetX: 0,
  targetY: 0,
  currentX: 0,
  currentY: 0,
  lastInterpolationTime: 0,
  point: null,
  cell: null,
  setPoint: point => {
    const clientX = point.clientX
    const clientY = point.clientY
    set({
      targetX: clientX,
      targetY: clientY,
      currentX: clientX,
      currentY: clientY,
      lastInterpolationTime: performance.now(),
      point: {
        ...point,
        updatedAt: Date.now(),
      },
    })
  },
  setSnapshot: snapshot => {
    const tx = snapshot.clientX
    const ty = snapshot.clientY
    const isReal = getActiveEyeTrackingApiMode() === 'real'

    if (!isReal) {
      set({
        targetX: tx,
        targetY: ty,
        currentX: tx,
        currentY: ty,
        lastInterpolationTime: performance.now(),
        point: {
          clientX: tx,
          clientY: ty,
          updatedAt: Date.now(),
        },
        cell: snapshot.cell,
      })
      return
    }

    set(state => ({
      targetX: tx,
      targetY: ty,
      cell: snapshot.cell,
      currentX: state.currentX,
      currentY: state.currentY,
      point:
        state.point === null
          ? {
              clientX: state.currentX,
              clientY: state.currentY,
              updatedAt: Date.now(),
            }
          : {
              clientX: state.currentX,
              clientY: state.currentY,
              updatedAt: state.point.updatedAt,
            },
    }))
  },
  clearPoint: () => {
    set({
      point: null,
      cell: null,
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      lastInterpolationTime: 0,
    })
  },
  interpolate: () => {
    if (getActiveEyeTrackingApiMode() !== 'real') {
      return
    }

    const state = get()

    if (state.point === null) {
      return
    }

    const nextX = state.currentX + (state.targetX - state.currentX) * LERP_FACTOR
    const nextY = state.currentY + (state.targetY - state.currentY) * LERP_FACTOR
    const now = performance.now()

    set({
      currentX: nextX,
      currentY: nextY,
      lastInterpolationTime: now,
      point: {
        clientX: nextX,
        clientY: nextY,
        updatedAt: Date.now(),
      },
    })
  },
}))
