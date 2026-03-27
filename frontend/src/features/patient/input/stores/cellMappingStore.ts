import { create } from 'zustand'

interface CellMappingEntry {
  ownerId: string
  mapping: Record<number, string | null>
}

export interface CellMappingState {
  cellMapping: Record<number, string | null> | null
  mappingEntries: CellMappingEntry[]
  registerCellMapping: (
    ownerId: string,
    mapping: Record<number, string | null>,
  ) => void
  updateCellMapping: (
    ownerId: string,
    mapping: Record<number, string | null>,
  ) => void
  unregisterCellMapping: (ownerId: string) => void
}

function getActiveCellMapping(entries: CellMappingEntry[]) {
  return entries.length > 0 ? entries[entries.length - 1]?.mapping ?? null : null
}

export const useCellMappingStore = create<CellMappingState>((set) => ({
  cellMapping: null,
  mappingEntries: [],
  registerCellMapping: (ownerId, mapping) =>
    set(state => {
      const nextEntry = { ownerId, mapping }
      const existingIndex = state.mappingEntries.findIndex(entry => entry.ownerId === ownerId)
      const nextEntries =
        existingIndex >= 0
          ? [
              ...state.mappingEntries.slice(0, existingIndex),
              ...state.mappingEntries.slice(existingIndex + 1),
              nextEntry,
            ]
          : [...state.mappingEntries, nextEntry]

      return {
        mappingEntries: nextEntries,
        cellMapping: getActiveCellMapping(nextEntries),
      }
    }),
  updateCellMapping: (ownerId, mapping) =>
    set(state => {
      const existingIndex = state.mappingEntries.findIndex(entry => entry.ownerId === ownerId)

      if (existingIndex < 0) {
        const nextEntries = [...state.mappingEntries, { ownerId, mapping }]
        return {
          mappingEntries: nextEntries,
          cellMapping: getActiveCellMapping(nextEntries),
        }
      }

      const nextEntries = state.mappingEntries.map((entry, index) =>
        index === existingIndex ? { ...entry, mapping } : entry,
      )

      return {
        mappingEntries: nextEntries,
        cellMapping: getActiveCellMapping(nextEntries),
      }
    }),
  unregisterCellMapping: ownerId =>
    set(state => {
      const nextEntries = state.mappingEntries.filter(entry => entry.ownerId !== ownerId)
      return {
        mappingEntries: nextEntries,
        cellMapping: getActiveCellMapping(nextEntries),
      }
    }),
}))
