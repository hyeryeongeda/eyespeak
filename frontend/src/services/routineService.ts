import { createRoutineApi } from './routineApi'
import type { AuthSession } from '../types/auth'
import type { PatientRoutinesFormValues, RoutineCreateRequestDto } from '../types/patient'
import type { ServiceResult } from '../types/api'
import { createServiceFailure } from '../utils/errorMapper'

export function mapPatientRoutinesToRequest(
  patientRoutines: PatientRoutinesFormValues,
): RoutineCreateRequestDto {
  const routines = Object.entries(patientRoutines).map(([timeSlotId, activityTagId]) => {
    if (typeof activityTagId !== 'number') {
      throw new Error('모든 시간대의 대표 활동을 선택해주세요.')
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
  guardianSession: Pick<AuthSession, 'accessToken'>,
): Promise<ServiceResult<null>> {
  try {
    const response = await createRoutineApi(
      mapPatientRoutinesToRequest(patientRoutines),
      guardianSession.accessToken,
    )

    return {
      success: true,
      source: guardianSession.accessToken.startsWith('mock-') ? 'mock' : 'api',
      data: response,
    }
  } catch (error) {
    return createServiceFailure(error, '루틴 저장에 실패했습니다.')
  }
}
