import { useEffect } from 'react'
import { useCellMappingStore } from '../stores/cellMappingStore'

export function useCellMapping(mapping: Record<number, string | null>): void {
  useEffect(() => {
    useCellMappingStore.getState().setCellMapping(mapping)
  }, [mapping])
}
