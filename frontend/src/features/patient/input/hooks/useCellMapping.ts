import { useEffect, useRef } from 'react'
import { useCellMappingStore } from '../stores/cellMappingStore'

let cellMappingOwnerSequence = 0

export function useCellMapping(mapping: Record<number, string | null>): void {
  const ownerIdRef = useRef(`cell-mapping-${++cellMappingOwnerSequence}`)
  const previousMappingRef = useRef(mapping)

  useEffect(() => {
    const { registerCellMapping, unregisterCellMapping } = useCellMappingStore.getState()
    registerCellMapping(ownerIdRef.current, mapping)

    return () => {
      unregisterCellMapping(ownerIdRef.current)
    }
  }, [])

  useEffect(() => {
    if (previousMappingRef.current === mapping) {
      return
    }

    previousMappingRef.current = mapping
    useCellMappingStore.getState().updateCellMapping(ownerIdRef.current, mapping)
  }, [mapping])
}
