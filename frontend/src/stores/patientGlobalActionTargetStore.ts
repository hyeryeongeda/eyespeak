import { create } from 'zustand'
import type { PatientGlobalMenuActionId } from '../services/patientModeBridge'

interface PatientGlobalActionTarget {
  id: string
  priority: number
  order: number
  onPositiveAction?: () => void
  onNegativeAction?: () => void
}

interface PatientGlobalActionTargetState {
  targets: Record<string, PatientGlobalActionTarget>
  upsertTarget: (
    target: Omit<PatientGlobalActionTarget, 'order'> & { order?: number },
  ) => void
  removeTarget: (targetId: string) => void
  consumeAction: (actionId: PatientGlobalMenuActionId) => boolean
}

let targetOrderSequence = 0

function getSortedTargets(targets: Record<string, PatientGlobalActionTarget>) {
  return Object.values(targets).sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority
    }

    return right.order - left.order
  })
}

export const usePatientGlobalActionTargetStore = create<PatientGlobalActionTargetState>(
  (set, get) => ({
    targets: {},
    upsertTarget: target => {
      set(state => {
        const previous = state.targets[target.id]

        return {
          targets: {
            ...state.targets,
            [target.id]: {
              ...previous,
              ...target,
              order: previous?.order ?? target.order ?? ++targetOrderSequence,
            },
          },
        }
      })
    },
    removeTarget: targetId => {
      set(state => {
        if (!state.targets[targetId]) {
          return state
        }

        const nextTargets = { ...state.targets }
        delete nextTargets[targetId]

        return {
          targets: nextTargets,
        }
      })
    },
    consumeAction: actionId => {
      if (actionId !== 'yes' && actionId !== 'no') {
        return false
      }

      const activeTarget = getSortedTargets(get().targets)[0]

      if (!activeTarget) {
        return false
      }

      const actionHandler =
        actionId === 'yes' ? activeTarget.onPositiveAction : activeTarget.onNegativeAction

      if (!actionHandler) {
        return false
      }

      actionHandler()
      return true
    },
  }),
)
