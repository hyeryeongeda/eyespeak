import { useEffect } from 'react'
import {
  CARE_DWELL_TIME_PRESET_UPDATED_EVENT,
  getDwellTimePreset,
  type CareDwellTimePresetUpdatedDetail,
} from '../../../../services/careSettingService'
import { usePatientModeStore } from '../stores/patientModeStore'
import { DWELL_TIME_OPTIONS, type DwellTimePreset } from '../../../../types/care'

interface UsePatientModeDwellSyncOptions {
  enabled?: boolean
}

function isDwellTimePreset(value: unknown): value is DwellTimePreset {
  return typeof value === 'string' && value in DWELL_TIME_OPTIONS
}

export function usePatientModeDwellSync({
  enabled = true,
}: UsePatientModeDwellSyncOptions = {}) {
  const setGlobalMenuDwellDurationMs = usePatientModeStore(
    state => state.setGlobalMenuDwellDurationMs,
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isMounted = true

    void getDwellTimePreset()
      .then(result => {
        if (!isMounted || !result.success) {
          return
        }

        setGlobalMenuDwellDurationMs(DWELL_TIME_OPTIONS[result.data].value)
      })
      .catch((error) => {
        console.warn('[patient-input] dwell-preset-sync-failed', { error })
      })

    return () => {
      isMounted = false
    }
  }, [enabled, setGlobalMenuDwellDurationMs])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleDwellPresetUpdated = (event: Event) => {
      const preset = (event as CustomEvent<CareDwellTimePresetUpdatedDetail>).detail?.preset

      if (!isDwellTimePreset(preset)) {
        return
      }

      setGlobalMenuDwellDurationMs(DWELL_TIME_OPTIONS[preset].value)
    }

    window.addEventListener(
      CARE_DWELL_TIME_PRESET_UPDATED_EVENT,
      handleDwellPresetUpdated as EventListener,
    )

    return () => {
      window.removeEventListener(
        CARE_DWELL_TIME_PRESET_UPDATED_EVENT,
        handleDwellPresetUpdated as EventListener,
      )
    }
  }, [enabled, setGlobalMenuDwellDurationMs])
}

export default usePatientModeDwellSync
