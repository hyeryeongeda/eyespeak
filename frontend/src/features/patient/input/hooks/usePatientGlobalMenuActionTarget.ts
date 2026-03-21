import { useEffect, useState } from 'react'
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
  const [targetId] = useState(createPatientGlobalActionTargetId)

  useEffect(() => {
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
  }, [enabled, onNegativeAction, onPositiveAction, priority, targetId])
}

export default usePatientGlobalMenuActionTarget
