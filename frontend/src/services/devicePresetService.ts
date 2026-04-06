import type {
  ActivationDelayPreset,
  ApiResponse,
  DwellTimePreset,
} from '../types/care'
import {
  ACTIVATION_DELAY_MS_TO_PRESET,
  ACTIVATION_DELAY_OPTIONS,
  DWELL_TIME_MS_TO_PRESET,
  DWELL_TIME_OPTIONS,
} from '../types/care'
import {
  getActivationDelayApi,
  getDwellTimeApi,
  updateActivationDelayApi,
  updateDwellTimeApi,
} from './deviceSettingApi'

export const CARE_DWELL_TIME_PRESET_UPDATED_EVENT = 'care-setting:dwell-time-updated'
export const CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT =
  'care-setting:activation-delay-updated'

export interface CareDwellTimePresetUpdatedDetail {
  preset: DwellTimePreset
}

export interface CareActivationDelayPresetUpdatedDetail {
  preset: ActivationDelayPreset
}

function isBrowser() {
  return typeof window !== 'undefined'
}

export async function getDwellTimePreset(): Promise<ApiResponse<DwellTimePreset>> {
  const res = await getDwellTimeApi()
  const preset = DWELL_TIME_MS_TO_PRESET[res.dwellTime] ?? 'default'
  return { success: true, data: preset, message: 'Fetched dwell time preset.' }
}

export async function updateDwellTimePreset(
  preset: DwellTimePreset,
): Promise<ApiResponse<DwellTimePreset>> {
  const ms = DWELL_TIME_OPTIONS[preset].value
  await updateDwellTimeApi({ dwellTime: ms })

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent<CareDwellTimePresetUpdatedDetail>(CARE_DWELL_TIME_PRESET_UPDATED_EVENT, {
        detail: { preset },
      }),
    )
  }

  return { success: true, data: preset, message: 'Updated dwell time preset.' }
}

export async function getActivationDelayPreset(): Promise<ApiResponse<ActivationDelayPreset>> {
  const res = await getActivationDelayApi()
  const preset = ACTIVATION_DELAY_MS_TO_PRESET[res.activationDelay] ?? 'medium'
  return { success: true, data: preset, message: 'Fetched activation delay preset.' }
}

export async function updateActivationDelayPreset(
  preset: ActivationDelayPreset,
): Promise<ApiResponse<ActivationDelayPreset>> {
  const ms = ACTIVATION_DELAY_OPTIONS[preset].value
  await updateActivationDelayApi({ activationDelay: ms })

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent<CareActivationDelayPresetUpdatedDetail>(
        CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
        {
          detail: { preset },
        },
      ),
    )
  }

  return { success: true, data: preset, message: 'Updated activation delay preset.' }
}
