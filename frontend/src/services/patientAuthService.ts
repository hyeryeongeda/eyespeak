import { getActiveApiMode, resolveApiSource } from '../config/env'
import type { ServiceResult } from '../types/api'
import type { AuthSession } from '../types/auth'
import type {
  PatientAccountFormValues,
  PatientSignupRequestDto,
  VerifiedTeamCode,
} from '../types/patient'
import { createServiceFailure } from '../utils/errorMapper'
import { normalizeTeamCode } from './authStorage'
import { mapAuthResponseToSession } from './authSessionMapper'
import { findMockTeamCode, signUpPatientMockApi } from './mockAuthApi'
import { signUpPatientApi } from './patientApi'

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

function prefixFailureMessage(prefix: string, error: unknown, fallbackMessage: string) {
  const failure = createServiceFailure(error, fallbackMessage)

  return {
    ...failure,
    message: `${prefix} ${failure.message}`,
  }
}

export async function verifyTeamCode(
  teamCode: string,
): Promise<ServiceResult<VerifiedTeamCode>> {
  const apiMode = getActiveApiMode()
  const normalizedTeamCode = normalizeTeamCode(teamCode)

  if (!normalizedTeamCode) {
    return {
      success: false,
      source: resolveApiSource(apiMode),
      statusCode: 400,
      message: '팀 코드를 입력해 주세요.',
    }
  }

  try {
    if (apiMode === 'mock') {
      const verifiedTeamCode = await findMockTeamCode(normalizedTeamCode)

      return {
        success: true,
        source: resolveApiSource(apiMode),
        data: verifiedTeamCode,
      }
    }

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data: {
        teamCode: normalizedTeamCode,
        patientName: null,
        verificationMode: 'provisional',
      },
    }
  } catch (error) {
    return prefixFailureMessage(
      'Team code verification failed.',
      error,
      '팀 코드 확인에 실패했습니다.',
    )
  }
}

export async function signUpPatient(
  input: PatientSignupInput,
): Promise<ServiceResult<PatientSignupSuccess>> {
  const apiMode = getActiveApiMode()

  try {
    const request = mapPatientSignupInputToRequest(input)
    const response =
      apiMode === 'mock'
        ? await signUpPatientMockApi(request)
        : await signUpPatientApi(request)
    const session = mapAuthResponseToSession(response, apiMode)

    return {
      success: true,
      source: resolveApiSource(apiMode),
      data: {
        session,
        patientId: response.patientId,
        teamCode: response.teamCode,
      },
    }
  } catch (error) {
    return prefixFailureMessage(
      'Patient signup failed.',
      error,
      '환자 회원가입에 실패했습니다.',
    )
  }
}
