import { useEffect } from 'react'
import {
  PATIENT_GLOBAL_MENU_ACTION_EVENT,
  type PatientGlobalMenuActionDetail,
} from '../services/patientModeBridge'
import { usePatientGlobalActionTargetStore } from '../stores/patientGlobalActionTargetStore'

interface UsePatientGlobalMenuActionListenerOptions {
  enabled?: boolean
}

export function usePatientGlobalMenuActionListener({
  enabled = true,
}: UsePatientGlobalMenuActionListenerOptions = {}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleAction = (event: Event) => {
      const customEvent = event as CustomEvent<PatientGlobalMenuActionDetail>
      const actionId = customEvent.detail?.actionId

      if (actionId !== 'yes' && actionId !== 'no') {
        return
      }

      const handled = usePatientGlobalActionTargetStore.getState().consumeAction(actionId)

      if (handled) {
        customEvent.preventDefault()
      }
    }

    window.addEventListener(PATIENT_GLOBAL_MENU_ACTION_EVENT, handleAction as EventListener)

    return () => {
      window.removeEventListener(PATIENT_GLOBAL_MENU_ACTION_EVENT, handleAction as EventListener)
    }
  }, [enabled])
}

export default usePatientGlobalMenuActionListener
