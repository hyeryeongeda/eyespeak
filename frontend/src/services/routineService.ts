import { resolveApiSource } from '../config/env'
import type { AuthSession } from '../types/auth'
import type { ServiceResult } from '../types/api'
import type { PatientRoutinesFormValues, RoutineCreateRequestDto } from '../types/patient'
import { createServiceFailure } from '../utils/errorMapper'
import { createRoutineMockApi } from './mockAuthApi'
import { createRoutineApi } from './routineApi'

export function mapPatientRoutinesToRequest(
  patientRoutines: PatientRoutinesFormValues,
): RoutineCreateRequestDto {
  const routines = Object.entries(patientRoutines).map(([timeSlotId, activityTagId]) => {
    if (typeof activityTagId !== 'number') {
      throw new Error('모든 시간대 루틴을 선택해 주세요.')
    }

    return {
      timeSlotId: Number(timeSlotId),
      activityTagId,
    }
  })

  return {
    routines: routines.sort((left, right) => left.timeSlotId - right.timeSlotId),
  }
}

export async function createPatientRoutines(
  patientRoutines: PatientRoutinesFormValues,
  guardianSession: Pick<AuthSession, 'accessToken' | 'authMode'>,
): Promise<ServiceResult<null>> {
  try {
    const request = mapPatientRoutinesToRequest(patientRoutines)
    const response =
      guardianSession.authMode === 'mock'
        ? await createRoutineMockApi(request, guardianSession.accessToken)
        : await createRoutineApi(request, guardianSession.accessToken)

    return {
      success: true,
      source: resolveApiSource(guardianSession.authMode),
      data: response,
    }
  } catch (error) {
    return createServiceFailure(error, '루틴 저장에 실패했습니다.')
  }
}
