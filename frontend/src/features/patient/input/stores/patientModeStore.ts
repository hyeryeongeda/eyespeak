import { create } from 'zustand'
import type { CalibrationTrackingStatus } from '../../../../types/calibration'
import type { PatientDoubleBlinkSource } from '../services/patientModeBridge'

export const DEFAULT_PATIENT_SELECTION_DWELL_MS = 2000

export function isPatientTrackingAvailable(status: CalibrationTrackingStatus) {
  return status === 'ready'
}

export function isPatientTrackingBlocked(status: CalibrationTrackingStatus) {
  return status === 'face-not-detected' || status === 'tracking-unstable'
}

interface PatientModeState {
  isGlobalMenuOpen: boolean
  isGlobalMenuTrackingBypassed: boolean
  selectionDwellDurationMs: number
  trackingStatus: CalibrationTrackingStatus
  openGlobalMenu: (options?: { bypassTracking?: boolean }) => void
  closeGlobalMenu: () => void
  toggleGlobalMenu: (options?: { bypassTracking?: boolean }) => void
  handleDoubleBlink: (source?: PatientDoubleBlinkSource) => void
  setTrackingStatus: (status: CalibrationTrackingStatus) => void
  setSelectionDwellDurationMs: (durationMs: number) => void
  resetPatientModeState: () => void
}

const initialState = {
  isGlobalMenuOpen: false,
  isGlobalMenuTrackingBypassed: false,
  selectionDwellDurationMs: DEFAULT_PATIENT_SELECTION_DWELL_MS,
  trackingStatus: 'idle' as const,
}

export const usePatientModeStore = create<PatientModeState>((set, get) => ({
  ...initialState,
  openGlobalMenu: options => {
    const bypassTracking = options?.bypassTracking === true

    if (!bypassTracking && !isPatientTrackingAvailable(get().trackingStatus)) {
      return
    }

    set({
      isGlobalMenuOpen: true,
      isGlobalMenuTrackingBypassed: bypassTracking,
    })
  },
  closeGlobalMenu: () => {
    set({
      isGlobalMenuOpen: false,
      isGlobalMenuTrackingBypassed: false,
    })
  },
  toggleGlobalMenu: options => {
    const state = get()
    const bypassTracking = options?.bypassTracking === true

    if (state.isGlobalMenuOpen) {
      set({
        isGlobalMenuOpen: false,
        isGlobalMenuTrackingBypassed: false,
      })
      return
    }

    if (!bypassTracking && !isPatientTrackingAvailable(state.trackingStatus)) {
      return
    }

    set({
      isGlobalMenuOpen: true,
      isGlobalMenuTrackingBypassed: bypassTracking,
    })
  },
  handleDoubleBlink: source => {
    get().toggleGlobalMenu({
      bypassTracking: source === 'keyboard-shortcut',
    })
  },
  setTrackingStatus: status => {
    set(state => ({
      trackingStatus: status,
      isGlobalMenuOpen:
        state.isGlobalMenuOpen &&
        (state.isGlobalMenuTrackingBypassed || isPatientTrackingAvailable(status)),
      isGlobalMenuTrackingBypassed:
        state.isGlobalMenuOpen &&
        (state.isGlobalMenuTrackingBypassed || isPatientTrackingAvailable(status))
          ? state.isGlobalMenuTrackingBypassed
          : false,
    }))
  },
  setSelectionDwellDurationMs: durationMs => {
    set({
      selectionDwellDurationMs: Math.max(1, Math.round(durationMs)),
    })
  },
  resetPatientModeState: () => {
    set(initialState)
  },
}))
