import { useMemo } from 'react'
import type { PatientCellMapping } from '../services/patientCellMapping'
import { useCellMapping } from './useCellMapping'

export type PatientPageCellTrackingId = string | null | undefined

export type PatientSixCellTrackingIds = readonly [
  PatientPageCellTrackingId,
  PatientPageCellTrackingId,
  PatientPageCellTrackingId,
  PatientPageCellTrackingId,
  PatientPageCellTrackingId,
  PatientPageCellTrackingId,
]

function normalizeTrackingId(value: PatientPageCellTrackingId) {
  if (typeof value !== 'string') {
    return null
  }

  const trackingId = value.trim()
  return trackingId.length > 0 ? trackingId : null
}

export function createSixCellMapping(
  cells: PatientSixCellTrackingIds,
): PatientCellMapping {
  const [cell0, cell1, cell2, cell3, cell4, cell5] = cells

  return {
    0: normalizeTrackingId(cell0),
    1: normalizeTrackingId(cell1),
    2: normalizeTrackingId(cell2),
    3: normalizeTrackingId(cell3),
    4: normalizeTrackingId(cell4),
    5: normalizeTrackingId(cell5),
  }
}

export function usePatientPageCellMapping(
  cells: PatientSixCellTrackingIds,
) {
  const [cell0, cell1, cell2, cell3, cell4, cell5] = cells

  const mapping = useMemo(
    () => createSixCellMapping([cell0, cell1, cell2, cell3, cell4, cell5]),
    [cell0, cell1, cell2, cell3, cell4, cell5],
  )

  useCellMapping(mapping)

  return mapping
}

export default usePatientPageCellMapping
