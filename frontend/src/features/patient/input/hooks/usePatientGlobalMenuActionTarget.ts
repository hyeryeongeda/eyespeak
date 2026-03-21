import { useEffect, useRef } from 'react'
import { usePatientGlobalActionTargetStore } from '../stores/patientGlobalActionTargetStore'

interface UsePatientGlobalMenuActionTargetOptions {
  enabled?: boolean
  priority?: number
  onPositiveAction?: () => void
  onNegativeAction?: () => void
}

let patientGlobalActionTargetIdSequence = 0

function createPatientGlobalActionTargetId() {
  patientGlobalActionTargetIdSequence += 1
  return `patient-global-action-target-${patientGlobalActionTargetIdSequence}`
}

export function usePatientGlobalMenuActionTarget({
  enabled = false,
  priority = 0,
  onPositiveAction,
  onNegativeAction,
}: UsePatientGlobalMenuActionTargetOptions) {
  const targetIdRef = useRef<string>('')

  if (!targetIdRef.current) {
    targetIdRef.current = createPatientGlobalActionTargetId()
  }

  useEffect(() => {
    const targetId = targetIdRef.current

    if (!enabled || (!onPositiveAction && !onNegativeAction)) {
      usePatientGlobalActionTargetStore.getState().removeTarget(targetId)
      return
    }

    usePatientGlobalActionTargetStore.getState().upsertTarget({
      id: targetId,
      priority,
      onPositiveAction,
      onNegativeAction,
    })

    return () => {
      usePatientGlobalActionTargetStore.getState().removeTarget(targetId)
    }
  }, [enabled, onNegativeAction, onPositiveAction, priority])
}

export default usePatientGlobalMenuActionTarget
