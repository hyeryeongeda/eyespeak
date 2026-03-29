export type PatientSelectionSurface =
  | 'common'
  | 'main'
  | 'menu'
  | 'custom-talk'
  | 'keyboard'
  | 'global-menu'

export interface PatientSelectionProfile {
  surface: PatientSelectionSurface
  stableHoldMs: number
  switchHoldMs: number
  switchMargin: number
  cooldownMs: number
  areaHitRadiusPx: number
}

const PATIENT_SELECTION_COMMON_DEFAULTS = {
  stableHoldMs: 120,
  switchHoldMs: 120,
  switchMargin: 0.09,
  cooldownMs: 600,
  areaHitRadiusPx: 40,
} as const

const PATIENT_SELECTION_SURFACE_OVERRIDES: Partial<
  Record<PatientSelectionSurface, Partial<Omit<PatientSelectionProfile, 'surface'>>>
> = {
  main: {
    cooldownMs: 950,
  },
  menu: {
    cooldownMs: 950,
  },
  'custom-talk': {
    stableHoldMs: 240,
    switchHoldMs: 240,
    switchMargin: 0.1,
    cooldownMs: 1050,
    areaHitRadiusPx: 44,
  },
  keyboard: {
    stableHoldMs: 220,
    switchHoldMs: 220,
    switchMargin: 0.08,
    cooldownMs: 900,
    areaHitRadiusPx: 36,
  },
  'global-menu': {
    stableHoldMs: 220,
    switchHoldMs: 220,
    switchMargin: 0.08,
    cooldownMs: 900,
    areaHitRadiusPx: 40,
  },
}

export function getPatientSelectionProfile(
  surface: PatientSelectionSurface,
): PatientSelectionProfile {
  return {
    surface,
    ...PATIENT_SELECTION_COMMON_DEFAULTS,
    ...(PATIENT_SELECTION_SURFACE_OVERRIDES[surface] ?? {}),
  }
}
