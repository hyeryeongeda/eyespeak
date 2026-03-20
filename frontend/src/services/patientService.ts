import { registerPatientInfoApi } from './patientApi'
import type { AuthSession } from '../types/auth'
import type {
  PatientGenderApiValue,
  PatientProfileFormValues,
  RegisterPatientInfoRequestDto,
  RegisterPatientInfoResponseDto,
} from '../types/patient'
import type { ServiceResult } from '../types/api'
import { createServiceFailure } from '../utils/errorMapper'

export interface RegisterPatientInfoInput {
  patientProfile: PatientProfileFormValues
}

export function mapPatientGenderToApiValue(gender: PatientProfileFormValues['gender']): PatientGenderApiValue {
  // TODO(BE): 실제 백엔드 gender enum/필드명 확정 시 이 mapper에서만 교체.
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
  guardianSession: Pick<AuthSession, 'accessToken'>,
): Promise<ServiceResult<RegisterPatientInfoResponseDto>> {
  try {
    const response = await registerPatientInfoApi(
      mapPatientInfoInputToRequest(input),
      guardianSession.accessToken,
    )

    return {
      success: true,
      source: guardianSession.accessToken.startsWith('mock-') ? 'mock' : 'api',
      data: response,
    }
  } catch (error) {
    return createServiceFailure(error, '환자 기본 정보 저장에 실패했습니다.')
  }
}
