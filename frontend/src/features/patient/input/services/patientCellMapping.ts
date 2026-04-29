export interface PatientCellMappingCandidate {
  targets?: string[]
  fallbackTargets?: string[]
  groupId?: string
}

export type PatientCellMappingTarget =
  | string
  | PatientCellMappingCandidate
  | null

export type PatientCellMapping = Record<number, PatientCellMappingTarget>

export interface NormalizedPatientCellMappingTarget {
  targets: string[]
  fallbackTargets: string[]
  allTargets: string[]
  groupId: string | null
}

function uniqTrackingIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map(value => value?.trim() ?? '')
        .filter((value): value is string => value.length > 0),
    ),
  )
}

export function normalizePatientCellMappingTarget(
  target: PatientCellMappingTarget,
): NormalizedPatientCellMappingTarget {
  if (!target) {
    return {
      targets: [],
      fallbackTargets: [],
      allTargets: [],
      groupId: null,
    }
  }

  if (typeof target === 'string') {
    const trackingIds = uniqTrackingIds([target])
    return {
      targets: trackingIds,
      fallbackTargets: [],
      allTargets: trackingIds,
      groupId: trackingIds[0] ?? null,
    }
  }

  const targets = uniqTrackingIds(target.targets ?? [])
  const fallbackTargets = uniqTrackingIds(target.fallbackTargets ?? [])
  const allTargets = uniqTrackingIds([...targets, ...fallbackTargets])

  return {
    targets,
    fallbackTargets,
    allTargets,
    groupId: target.groupId ?? allTargets[0] ?? null,
  }
}

export function getPrimaryTrackingIdFromCell(
  cell: number | null,
  mapping: PatientCellMapping | null,
) {
  if (cell === null || !mapping) {
    return null
  }

  const normalizedTarget = normalizePatientCellMappingTarget(mapping[cell] ?? null)
  return normalizedTarget.targets[0] ?? normalizedTarget.fallbackTargets[0] ?? null
}

export function getTrackingIdsFromCell(
  cell: number | null,
  mapping: PatientCellMapping | null,
) {
  if (cell === null || !mapping) {
    return []
  }

  return normalizePatientCellMappingTarget(mapping[cell] ?? null).allTargets
}
