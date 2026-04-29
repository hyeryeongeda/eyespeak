import { useLayoutEffect, useRef } from 'react'
import type { PatientCellMapping } from '../services/patientCellMapping'
import {
  useCellMappingStore,
  type CellMappingOwnerOptions,
} from '../stores/cellMappingStore'

let cellMappingOwnerSequence = 0

export function useCellMapping(
  mapping: PatientCellMapping,
  options?: CellMappingOwnerOptions,
): void {
  const ownerIdRef = useRef(`cell-mapping-${++cellMappingOwnerSequence}`)
  const previousRegistrationRef = useRef({
    active: options?.active ?? true,
    debugLabel: options?.debugLabel,
    mapping,
    priority: options?.priority ?? 0,
  })
  const active = options?.active ?? true
  const debugLabel = options?.debugLabel
  const priority = options?.priority ?? 0

  useLayoutEffect(() => {
    const { registerCellMapping, unregisterCellMapping } = useCellMappingStore.getState()
    registerCellMapping(ownerIdRef.current, mapping, {
      active,
      debugLabel,
      priority,
    })

    return () => {
      unregisterCellMapping(ownerIdRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (
      previousRegistrationRef.current.mapping === mapping &&
      previousRegistrationRef.current.active === active &&
      previousRegistrationRef.current.debugLabel === debugLabel &&
      previousRegistrationRef.current.priority === priority
    ) {
      return
    }

    previousRegistrationRef.current = {
      active,
      debugLabel,
      mapping,
      priority,
    }
    useCellMappingStore.getState().updateCellMapping(ownerIdRef.current, mapping, {
      active,
      debugLabel,
      priority,
    })
  }, [active, debugLabel, mapping, priority])
}
