import { getActiveApiMode } from './apiClient'
import { findMockTeamCode } from './mockAuthApi'
import { signUpPatientApi } from './patientApi'
import { normalizeTeamCode } from './authStorage'
import { mapAuthResponseToSession } from './authService'
import type { AuthSession } from '../types/auth'
import type {
  PatientAccountFormValues,
  PatientSignupRequestDto,
  VerifiedTeamCode,
} from '../types/patient'
import type { ServiceResult } from '../types/api'
import { createServiceFailure } from '../utils/errorMapper'

export interface PatientSignupInput {
  teamCode: string
  account: PatientAccountFormValues
}

export interface PatientSignupSuccess {
  session: AuthSession
  patientId: string
  teamCode: string
}

function mapPatientSignupInputToRequest(input: PatientSignupInput): PatientSignupRequestDto {
  return {
    teamCode: normalizeTeamCode(input.teamCode),
    name: input.account.name.trim(),
    loginId: input.account.loginId.trim().toLowerCase(),
    password: input.account.password,
  }
}

export async function verifyTeamCode(
  teamCode: string,
): Promise<ServiceResult<VerifiedTeamCode>> {
  const normalizedTeamCode = normalizeTeamCode(teamCode)

  if (!normalizedTeamCode) {
    return {
      success: false,
      source: 'mock',
      statusCode: 400,
      message: '팀코드를 입력해주세요.',
    }
  }

  try {
    if (getActiveApiMode() === 'mock') {
      const verifiedTeamCode = await findMockTeamCode(normalizedTeamCode)

      return {
        success: true,
        source: 'mock',
        data: verifiedTeamCode,
      }
    }

    // TODO(BE): 팀코드 사전 검증용 API 또는 signup precheck 계약 확정 필요.
    return {
      success: false,
      source: 'api',
      statusCode: 400,
      message: '팀코드 검증 API 명세가 아직 확정되지 않았습니다.',
    }
  } catch (error) {
    return createServiceFailure(error, '팀코드 확인에 실패했습니다.')
  }
}

export async function signUpPatient(
  input: PatientSignupInput,
): Promise<ServiceResult<PatientSignupSuccess>> {
  try {
    const response = await signUpPatientApi(mapPatientSignupInputToRequest(input))
    const session = mapAuthResponseToSession(response)

    return {
      success: true,
      source: response.accessToken.startsWith('mock-') ? 'mock' : 'api',
      data: {
        session,
        patientId: response.patientId,
        teamCode: response.teamCode,
      },
    }
  } catch (error) {
    return createServiceFailure(error, '환자 회원가입에 실패했습니다.')
  }
}
