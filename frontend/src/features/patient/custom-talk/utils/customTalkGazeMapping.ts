import type { PatientCellMapping } from '../../input/services/patientCellMapping'

interface GuardianPromptCellMappingInput {
  topLeft: string | null
  topRight: string | null
  bottomLeft: string | null
  bottomRight: string | null
  namespace: string
}

interface EntryCellMappingInput {
  topLeft: string | null
  topCenter: string | null
  topRight: string | null
  bottomLeft: string | null
  bottomCenter: string | null
  bottomRight: string | null
}

export function createGuardianPromptCellMapping({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  namespace,
}: GuardianPromptCellMappingInput): PatientCellMapping {
  return {
    0: topLeft,
    1:
      topLeft || topRight
        ? {
            targets: [topLeft, topRight].filter((value): value is string => Boolean(value)),
            groupId: `${namespace}-top-row`,
          }
        : null,
    2: topRight,
    3: bottomLeft,
    4:
      bottomLeft || bottomRight
        ? {
            targets: [bottomLeft].filter((value): value is string => Boolean(value)),
            fallbackTargets: [bottomRight].filter((value): value is string => Boolean(value)),
            groupId: `${namespace}-bottom-row`,
          }
        : null,
    5: bottomRight,
  }
}

export function createEntryCellMapping(input: EntryCellMappingInput): PatientCellMapping {
  return {
    0: input.topLeft,
    1: input.topCenter,
    2: input.topRight,
    3: input.bottomLeft,
    4: input.bottomCenter,
    5: input.bottomRight,
  }
}
