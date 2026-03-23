import { create } from 'zustand'

export interface CellMappingState {
  cellMapping: Record<number, string | null> | null
  setCellMapping: (mapping: Record<number, string | null>) => void
  clearCellMapping: () => void
}

export const useCellMappingStore = create<CellMappingState>((set) => ({
  cellMapping: null,
  setCellMapping: (mapping) => set({ cellMapping: mapping }),
  clearCellMapping: () => set({ cellMapping: null }),
}))
