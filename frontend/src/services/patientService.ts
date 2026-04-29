import { resolveApiSource } from '../config/env'
import type { AuthSession } from '../types/auth'
import type { ServiceResult } from '../types/api'
import type {
  PatientGenderApiValue,
  PatientProfileFormValues,
  RegisterPatientInfoRequestDto,
  RegisterPatientInfoResponseDto,
} from '../types/patient'
import { createServiceFailure } from '../utils/errorMapper'
import { registerPatientInfoMockApi } from './mockAuthApi'
import { registerPatientInfoApi } from './patientApi'

export interface RegisterPatientInfoInput {
  patientProfile: PatientProfileFormValues
}

export function mapPatientGenderToApiValue(
  gender: PatientProfileFormValues['gender'],
): PatientGenderApiValue {
  return gender === 'female' ? 'F' : 'M'
}

export function mapPatientInfoInputToRequest(
  input: RegisterPatientInfoInput,
): RegisterPatientInfoRequestDto {
  return {
    name: input.patientProfile.name.trim(),
    birthYear: Number(input.patientProfile.birthYear),
    gender: mapPatientGenderToApiValue(input.patientProfile.gender),
  }
}

export async function registerPatientInfo(
  input: RegisterPatientInfoInput,
  guardianSession: Pick<AuthSession, 'accessToken' | 'authMode'>,
): Promise<ServiceResult<RegisterPatientInfoResponseDto>> {
  try {
    const request = mapPatientInfoInputToRequest(input)
    const response =
      guardianSession.authMode === 'mock'
        ? await registerPatientInfoMockApi(request, guardianSession.accessToken)
        : await registerPatientInfoApi(request, guardianSession.accessToken)

    return {
      success: true,
      source: resolveApiSource(guardianSession.authMode),
      data: response,
    }
  } catch (error) {
    return createServiceFailure(error, '환자 정보 등록에 실패했습니다.')
  }
}
