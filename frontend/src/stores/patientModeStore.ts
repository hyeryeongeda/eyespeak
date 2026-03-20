import { create } from 'zustand'
import type { CalibrationTrackingStatus } from '../types/calibration'

export const PATIENT_GLOBAL_MENU_DWELL_MS = 1000

export function isPatientTrackingAvailable(status: CalibrationTrackingStatus) {
  return status === 'ready'
}

export function isPatientTrackingBlocked(status: CalibrationTrackingStatus) {
  return status === 'face-not-detected' || status === 'tracking-unstable'
}

interface PatientModeState {
  isGlobalMenuOpen: boolean
  globalMenuDwellDurationMs: number
  trackingStatus: CalibrationTrackingStatus
  openGlobalMenu: () => void
  closeGlobalMenu: () => void
  toggleGlobalMenu: () => void
  handleDoubleBlink: () => void
  setTrackingStatus: (status: CalibrationTrackingStatus) => void
  setGlobalMenuDwellDurationMs: (durationMs: number) => void
  resetPatientModeState: () => void
}

const initialState = {
  isGlobalMenuOpen: false,
  globalMenuDwellDurationMs: PATIENT_GLOBAL_MENU_DWELL_MS,
  trackingStatus: 'ready' as const,
}

export const usePatientModeStore = create<PatientModeState>((set, get) => ({
  ...initialState,
  openGlobalMenu: () => {
    if (!isPatientTrackingAvailable(get().trackingStatus)) {
      return
    }

    set({ isGlobalMenuOpen: true })
  },
  closeGlobalMenu: () => {
    set({ isGlobalMenuOpen: false })
  },
  toggleGlobalMenu: () => {
    if (!isPatientTrackingAvailable(get().trackingStatus)) {
      return
    }

    set(state => ({
      isGlobalMenuOpen: !state.isGlobalMenuOpen,
    }))
  },
  handleDoubleBlink: () => {
    get().toggleGlobalMenu()
  },
  setTrackingStatus: status => {
    set(state => ({
      trackingStatus: status,
      isGlobalMenuOpen: isPatientTrackingAvailable(status) ? state.isGlobalMenuOpen : false,
    }))
  },
  setGlobalMenuDwellDurationMs: durationMs => {
    set({
      globalMenuDwellDurationMs: Math.max(1, Math.round(durationMs)),
    })
  },
  resetPatientModeState: () => {
    set(initialState)
  },
}))
