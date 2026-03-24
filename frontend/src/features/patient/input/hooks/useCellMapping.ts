import { useEffect } from 'react'
import { useCellMappingStore } from '../stores/cellMappingStore'

export function useCellMapping(mapping: Record<number, string | null>): void {
  useEffect(() => {
    const { setCellMapping, clearCellMapping } = useCellMappingStore.getState()
    setCellMapping(mapping)

    return () => {
      clearCellMapping()
    }
  }, [mapping])
}
