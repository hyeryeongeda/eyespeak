import { create } from 'zustand'
import type { PatientCellMapping } from '../services/patientCellMapping'

export interface CellMappingOwnerOptions {
  active?: boolean
  debugLabel?: string
  priority?: number
}

interface CellMappingEntry {
  ownerId: string
  mapping: PatientCellMapping
  active: boolean
  debugLabel: string
  priority: number
}

export interface CellMappingState {
  cellMapping: PatientCellMapping | null
  activeOwnerId: string | null
  activeOwnerDebugLabel: string | null
  mappingEntries: CellMappingEntry[]
  registerCellMapping: (
    ownerId: string,
    mapping: PatientCellMapping,
    options?: CellMappingOwnerOptions,
  ) => void
  updateCellMapping: (
    ownerId: string,
    mapping: PatientCellMapping,
    options?: CellMappingOwnerOptions,
  ) => void
  unregisterCellMapping: (ownerId: string) => void
}

let lastCellMappingDebugSignature: string | null = null

function getCellMappingOwnerLabel(ownerId: string, options?: CellMappingOwnerOptions) {
  const trimmedLabel = options?.debugLabel?.trim()
  return trimmedLabel && trimmedLabel.length > 0 ? trimmedLabel : ownerId
}

function createCellMappingEntry(
  ownerId: string,
  mapping: PatientCellMapping,
  options?: CellMappingOwnerOptions,
): CellMappingEntry {
  return {
    ownerId,
    mapping,
    active: options?.active ?? true,
    debugLabel: getCellMappingOwnerLabel(ownerId, options),
    priority: options?.priority ?? 0,
  }
}

function getActiveCellMappingEntry(entries: CellMappingEntry[]) {
  return entries.reduce<CellMappingEntry | null>((activeEntry, currentEntry) => {
    if (
      !currentEntry.active ||
      Object.keys(currentEntry.mapping).length === 0 ||
      summarizeCellMapping(currentEntry.mapping).populatedSlots === 0
    ) {
      return activeEntry
    }

    if (!activeEntry) {
      return currentEntry
    }

    if (currentEntry.priority > activeEntry.priority) {
      return currentEntry
    }

    if (currentEntry.priority === activeEntry.priority) {
      return currentEntry
    }

    return activeEntry
  }, null)
}

function summarizeCellMapping(mapping: PatientCellMapping) {
  const nullSlots = Object.entries(mapping)
    .filter(([, target]) => target == null)
    .map(([slot]) => Number(slot))

  return {
    nullSlots,
    populatedSlots: Object.keys(mapping).length - nullSlots.length,
  }
}

function debugLogCellMapping(
  event: string,
  payload: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) {
    return
  }

  const signature = `${event}:${JSON.stringify(payload)}`
  if (lastCellMappingDebugSignature === signature) {
    return
  }

  lastCellMappingDebugSignature = signature
  console.info('[patient-input] cell-mapping', {
    event,
    ...payload,
  })
}

function isOverlayOwner(entry: Pick<CellMappingEntry, 'debugLabel' | 'priority'>) {
  return entry.priority > 0 || entry.debugLabel.includes('overlay')
}

function buildStateFromEntries(entries: CellMappingEntry[]) {
  const activeEntry = getActiveCellMappingEntry(entries)

  return {
    mappingEntries: entries,
    cellMapping: activeEntry?.mapping ?? null,
    activeOwnerId: activeEntry?.ownerId ?? null,
    activeOwnerDebugLabel: activeEntry?.debugLabel ?? null,
  }
}

function getActiveOwnerDebugPayload(entries: CellMappingEntry[]) {
  const activeEntry = getActiveCellMappingEntry(entries)

  return {
    owner: activeEntry?.debugLabel ?? null,
    summary: activeEntry ? summarizeCellMapping(activeEntry.mapping) : null,
    mapping: activeEntry?.mapping ?? null,
  }
}

export const useCellMappingStore = create<CellMappingState>((set) => ({
  cellMapping: null,
  activeOwnerId: null,
  activeOwnerDebugLabel: null,
  mappingEntries: [],
  registerCellMapping: (ownerId, mapping, options) =>
    set(state => {
      const nextEntry = createCellMappingEntry(ownerId, mapping, options)
      const existingIndex = state.mappingEntries.findIndex(entry => entry.ownerId === ownerId)
      const nextEntries =
        existingIndex >= 0
          ? [
              ...state.mappingEntries.slice(0, existingIndex),
              ...state.mappingEntries.slice(existingIndex + 1),
              nextEntry,
            ]
          : [...state.mappingEntries, nextEntry]

      const nextState = buildStateFromEntries(nextEntries)
      const mappingSummary = summarizeCellMapping(mapping)

      if (isOverlayOwner(nextEntry)) {
        debugLogCellMapping('register', {
          owner: nextEntry.debugLabel,
          priority: nextEntry.priority,
          active: nextEntry.active,
        })
      }

      if (mappingSummary.populatedSlots === 0) {
        debugLogCellMapping('null-mapping', {
          owner: nextEntry.debugLabel,
          reason: 'register',
        })
      }

      if (state.activeOwnerId !== nextState.activeOwnerId) {
        debugLogCellMapping('active-owner', getActiveOwnerDebugPayload(nextEntries))
      }

      return nextState
    }),
  updateCellMapping: (ownerId, mapping, options) =>
    set(state => {
      const existingIndex = state.mappingEntries.findIndex(entry => entry.ownerId === ownerId)

      if (existingIndex < 0) {
        const nextEntry = createCellMappingEntry(ownerId, mapping, options)
        const nextEntries = [...state.mappingEntries, nextEntry]
        const nextState = buildStateFromEntries(nextEntries)
        const mappingSummary = summarizeCellMapping(mapping)

        if (isOverlayOwner(nextEntry)) {
          debugLogCellMapping('register', {
            owner: nextEntry.debugLabel,
            priority: nextEntry.priority,
            active: nextEntry.active,
          })
        }

        if (mappingSummary.populatedSlots === 0) {
          debugLogCellMapping('null-mapping', {
            owner: nextEntry.debugLabel,
            reason: 'update-missing-owner',
          })
        }

        if (state.activeOwnerId !== nextState.activeOwnerId) {
          debugLogCellMapping('active-owner', getActiveOwnerDebugPayload(nextEntries))
        }

        return nextState
      }

      const nextEntries = state.mappingEntries.map((entry, index) =>
        index === existingIndex
          ? createCellMappingEntry(ownerId, mapping, {
              active: options?.active ?? entry.active,
              debugLabel: options?.debugLabel ?? entry.debugLabel,
              priority: options?.priority ?? entry.priority,
            })
          : entry,
      )

      const nextState = buildStateFromEntries(nextEntries)
      const nextEntry = nextEntries[existingIndex]
      const mappingSummary = summarizeCellMapping(mapping)

      if (mappingSummary.populatedSlots === 0 && nextEntry) {
        debugLogCellMapping('null-mapping', {
          owner: nextEntry.debugLabel,
          reason: nextEntry.active ? 'update' : 'inactive-update',
        })
      }

      if (state.activeOwnerId !== nextState.activeOwnerId) {
        debugLogCellMapping('active-owner', getActiveOwnerDebugPayload(nextEntries))
      }

      return nextState
    }),
  unregisterCellMapping: ownerId =>
    set(state => {
      const removedEntry = state.mappingEntries.find(entry => entry.ownerId === ownerId) ?? null
      const nextEntries = state.mappingEntries.filter(entry => entry.ownerId !== ownerId)
      const nextState = buildStateFromEntries(nextEntries)

      if (removedEntry && isOverlayOwner(removedEntry)) {
        debugLogCellMapping('unregister', {
          owner: removedEntry.debugLabel,
        })
      }

      if (state.activeOwnerId !== nextState.activeOwnerId) {
        debugLogCellMapping('active-owner', getActiveOwnerDebugPayload(nextEntries))
      }

      return nextState
    }),
}))
