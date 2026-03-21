import { getActiveApiMode, resolveApiSource } from '../config/env'
import type { ServiceResult } from '../types/api'
import type { AuthSession, GuardianAccountFormValues } from '../types/auth'
import type {
  PatientProfileFormValues,
  PatientRoutinesFormValues,
} from '../types/patient'
import { createServiceFailure } from '../utils/errorMapper'
import { signUpGuardianApi } from './authApi'
import { mapAuthResponseToSession } from './authSessionMapper'
import { signUpGuardianMockApi } from './mockAuthApi'
import { registerPatientInfo } from './patientService'
import { createPatientRoutines } from './routineService'

export interface GuardianSignupFlowInput {
  guardianAccount: GuardianAccountFormValues
  patientProfile: PatientProfileFormValues
  patientRoutines: PatientRoutinesFormValues
}

export interface GuardianSignupFlowSuccess {
  session: AuthSession
  teamCode: string
  patientId: string
}

function mapGuardianAccountToSignupRequest(guardianAccount: GuardianAccountFormValues) {
  return {
    email: guardianAccount.email.trim().toLowerCase(),
    name: guardianAccount.name.trim(),
    password: guardianAccount.password,
  }
}

export async function signUpGuardian(
  input: GuardianSignupFlowInput,
): Promise<ServiceResult<GuardianSignupFlowSuccess>> {
  const authMode = getActiveApiMode()

  try {
    const request = mapGuardianAccountToSignupRequest(input.guardianAccount)
    const authResponse =
      authMode === 'mock'
        ? await signUpGuardianMockApi(request)
        : await signUpGuardianApi(request)
    const session = mapAuthResponseToSession(authResponse, authMode)

    const patientRegistrationResult = await registerPatientInfo(
      {
        patientProfile: input.patientProfile,
      },
      session,
    )

    if (!patientRegistrationResult.success) {
      return patientRegistrationResult
    }

    const routineRegistrationResult = await createPatientRoutines(input.patientRoutines, session)

    if (!routineRegistrationResult.success) {
      return routineRegistrationResult
    }

    return {
      success: true,
      source: resolveApiSource(authMode),
      data: {
        session: {
          ...session,
          teamCode: patientRegistrationResult.data.teamCode,
        },
        teamCode: patientRegistrationResult.data.teamCode,
        patientId: patientRegistrationResult.data.patientId,
      },
    }
  } catch (error) {
    return createServiceFailure(error, '보호자 회원가입에 실패했습니다.')
  }
}
