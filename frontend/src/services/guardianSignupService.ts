import { signUpGuardianApi } from './authApi'
import { mapAuthResponseToSession } from './authSessionMapper'
import { registerPatientInfo } from './patientService'
import { createPatientRoutines } from './routineService'
import type { GuardianAccountFormValues } from '../types/auth'
import type { AuthSession } from '../types/auth'
import type {
  PatientProfileFormValues,
  PatientRoutinesFormValues,
} from '../types/patient'
import type { ServiceResult } from '../types/api'
import { createServiceFailure } from '../utils/errorMapper'

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
  try {
    const authResponse = await signUpGuardianApi(
      mapGuardianAccountToSignupRequest(input.guardianAccount),
    )
    const session = mapAuthResponseToSession(authResponse)

    // TODO(BE): 보호자 계정 생성 후 환자 정보 저장 실패 시 롤백/재시도 정책 확정 필요.
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
      source: authResponse.accessToken.startsWith('mock-') ? 'mock' : 'api',
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
