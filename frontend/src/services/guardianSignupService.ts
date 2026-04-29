import { getActiveApiMode, resolveApiSource } from '../config/env'
import type { ServiceFailure, ServiceSuccess } from '../types/api'
import type { AuthSession, GuardianAccountFormValues } from '../types/auth'
import type {
  PatientProfileFormValues,
  PatientRoutinesFormValues,
  RegisterPatientInfoResponseDto,
} from '../types/patient'
import { createServiceFailure } from '../utils/errorMapper'
import { signUpGuardianApi } from './authApi'
import { mapAuthResponseToSession } from './authSessionMapper'
import { signUpGuardianMockApi } from './mockAuthApi'
import { mapPatientInfoInputToRequest, registerPatientInfo } from './patientService'
import { createPatientRoutines, mapPatientRoutinesToRequest } from './routineService'

export type GuardianSignupStage = 'guardian-account' | 'patient-profile' | 'patient-routines'

export type GuardianSignupRetryActionType =
  | 'retry-guardian-account'
  | 'retry-patient-profile'
  | 'retry-patient-routines'
  | 'go-to-login'
  | 'contact-support'

export type GuardianSignupFailureReason =
  | 'email-duplicated'
  | 'guardian-account-failed'
  | 'patient-profile-failed'
  | 'patient-profile-already-created'
  | 'routine-failed'
  | 'network'
  | 'unknown'

export interface GuardianSignupProgress {
  guardianAccountCreated: boolean
  patientProfileCreated: boolean
  lastCompletedStage: GuardianSignupStage | null
  patientId: string | null
  teamCode: string | null
}

export interface GuardianSignupResumeContext {
  guardianSession: AuthSession
  patientRegistration: RegisterPatientInfoResponseDto | null
}

export interface GuardianSignupDebugContext {
  stage: GuardianSignupStage
  apiName: 'auth.signUpGuardian' | 'patient.registerInfo' | 'routine.create'
  requestPayload: Record<string, unknown>
  response: {
    source: ServiceFailure['source']
    statusCode?: number
    code?: string
    message: string
  }
}

export interface GuardianSignupFlowFailure extends ServiceFailure {
  failedStage: GuardianSignupStage
  lastCompletedStage: GuardianSignupStage | null
  retryActionType: GuardianSignupRetryActionType
  recoverableFailure: boolean
  partialCompletionPossible: boolean
  reason: GuardianSignupFailureReason
  progress: GuardianSignupProgress
  resumeContext: GuardianSignupResumeContext | null
  debugContext: GuardianSignupDebugContext
}

export type GuardianSignupFlowResult =
  | ServiceSuccess<GuardianSignupFlowSuccess>
  | GuardianSignupFlowFailure

export interface GuardianSignupFlowInput {
  guardianAccount: GuardianAccountFormValues
  patientProfile: PatientProfileFormValues
  patientRoutines: PatientRoutinesFormValues
  resumeContext?: GuardianSignupResumeContext | null
}

export interface GuardianSignupFlowSuccess {
  session: AuthSession
  teamCode: string
  patientId: string
  patientName: string
}

function mapGuardianAccountToSignupRequest(guardianAccount: GuardianAccountFormValues) {
  return {
    email: guardianAccount.email.trim().toLowerCase(),
    name: guardianAccount.name.trim(),
    password: guardianAccount.password,
  }
}

function buildProgress(
  guardianSession: AuthSession | null,
  patientRegistration: RegisterPatientInfoResponseDto | null,
): GuardianSignupProgress {
  return {
    guardianAccountCreated: guardianSession != null,
    patientProfileCreated: patientRegistration != null,
    lastCompletedStage:
      patientRegistration != null
        ? 'patient-profile'
        : guardianSession != null
          ? 'guardian-account'
          : null,
    patientId: patientRegistration?.patientId ?? null,
    teamCode: patientRegistration?.teamCode ?? guardianSession?.teamCode ?? null,
  }
}

function sanitizeGuardianSignupRequestForDebug(request: ReturnType<typeof mapGuardianAccountToSignupRequest>) {
  return {
    email: request.email,
    name: request.name,
    passwordLength: request.password.length,
  }
}

function sanitizePatientProfileRequestForDebug(input: { patientProfile: PatientProfileFormValues }) {
  const request = mapPatientInfoInputToRequest(input)

  return {
    name: request.name,
    birthYear: request.birthYear,
    gender: request.gender,
  }
}

function sanitizePatientRoutinesRequestForDebug(patientRoutines: PatientRoutinesFormValues) {
  const request = mapPatientRoutinesToRequest(patientRoutines)

  return {
    routineCount: request.routines.length,
    routines: request.routines.map(routine => ({
      timeSlotId: routine.timeSlotId,
      activityTagId: routine.activityTagId,
    })),
  }
}

function resolveFailureReason(
  stage: GuardianSignupStage,
  failure: Pick<ServiceFailure, 'code'>,
): GuardianSignupFailureReason {
  if (failure.code === 'NETWORK_ERROR') {
    return 'network'
  }

  if (stage === 'guardian-account' && failure.code === 'GUARDIAN_EMAIL_DUPLICATED') {
    return 'email-duplicated'
  }

  if (stage === 'patient-profile' && failure.code === 'INITIAL_SURVEY_ALREADY_COMPLETED') {
    return 'patient-profile-already-created'
  }

  if (stage === 'guardian-account') {
    return 'guardian-account-failed'
  }

  if (stage === 'patient-profile') {
    return 'patient-profile-failed'
  }

  if (stage === 'patient-routines') {
    return 'routine-failed'
  }

  return 'unknown'
}

function resolveRetryActionType(
  stage: GuardianSignupStage,
  reason: GuardianSignupFailureReason,
): GuardianSignupRetryActionType {
  if (reason === 'email-duplicated' || reason === 'patient-profile-already-created') {
    return 'go-to-login'
  }

  if (reason === 'unknown') {
    return 'contact-support'
  }

  if (stage === 'guardian-account') {
    return 'retry-guardian-account'
  }

  if (stage === 'patient-profile') {
    return 'retry-patient-profile'
  }

  return 'retry-patient-routines'
}

function buildGuardianSignupFailure(params: {
  stage: GuardianSignupStage
  apiName: GuardianSignupDebugContext['apiName']
  requestPayload: GuardianSignupDebugContext['requestPayload']
  failure: ServiceFailure
  guardianSession: AuthSession | null
  patientRegistration: RegisterPatientInfoResponseDto | null
}): GuardianSignupFlowFailure {
  const progress = buildProgress(params.guardianSession, params.patientRegistration)
  const reason = resolveFailureReason(params.stage, params.failure)
  const retryActionType = resolveRetryActionType(params.stage, reason)

  return {
    ...params.failure,
    failedStage: params.stage,
    lastCompletedStage: progress.lastCompletedStage,
    retryActionType,
    recoverableFailure: retryActionType !== 'contact-support',
    partialCompletionPossible:
      progress.guardianAccountCreated ||
      reason === 'email-duplicated' ||
      reason === 'network',
    reason,
    progress,
    resumeContext:
      params.guardianSession != null
        ? {
            guardianSession: params.guardianSession,
            patientRegistration: params.patientRegistration,
          }
        : null,
    debugContext: {
      stage: params.stage,
      apiName: params.apiName,
      requestPayload: params.requestPayload,
      response: {
        source: params.failure.source,
        statusCode: params.failure.statusCode,
        code: params.failure.code,
        message: params.failure.message,
      },
    },
  }
}

export async function signUpGuardian(
  input: GuardianSignupFlowInput,
): Promise<GuardianSignupFlowResult> {
  const authMode = input.resumeContext?.guardianSession.authMode ?? getActiveApiMode()
  let guardianSession = input.resumeContext?.guardianSession ?? null
  let patientRegistration = input.resumeContext?.patientRegistration ?? null

  if (!guardianSession) {
    const request = mapGuardianAccountToSignupRequest(input.guardianAccount)

    try {
      const authResponse =
        authMode === 'mock'
          ? await signUpGuardianMockApi(request)
          : await signUpGuardianApi(request)

      guardianSession = mapAuthResponseToSession(authResponse, authMode)
    } catch (error) {
      return buildGuardianSignupFailure({
        stage: 'guardian-account',
        apiName: 'auth.signUpGuardian',
        requestPayload: sanitizeGuardianSignupRequestForDebug(request),
        failure: createServiceFailure(error, '보호자 계정 생성에 실패했습니다.'),
        guardianSession,
        patientRegistration,
      })
    }
  }

  if (!guardianSession) {
    return buildGuardianSignupFailure({
      stage: 'guardian-account',
      apiName: 'auth.signUpGuardian',
      requestPayload: sanitizeGuardianSignupRequestForDebug(
        mapGuardianAccountToSignupRequest(input.guardianAccount),
      ),
      failure: {
        success: false,
        source: resolveApiSource(authMode),
        message: '보호자 계정 정보를 확인할 수 없습니다.',
      },
      guardianSession,
      patientRegistration,
    })
  }

  if (!patientRegistration) {
    const patientProfileInput = {
      patientProfile: input.patientProfile,
    }
    const patientRegistrationResult = await registerPatientInfo(patientProfileInput, guardianSession)

    if (!patientRegistrationResult.success) {
      return buildGuardianSignupFailure({
        stage: 'patient-profile',
        apiName: 'patient.registerInfo',
        requestPayload: sanitizePatientProfileRequestForDebug(patientProfileInput),
        failure: patientRegistrationResult,
        guardianSession,
        patientRegistration,
      })
    }

    patientRegistration = patientRegistrationResult.data
  }

  const routineRegistrationResult = await createPatientRoutines(input.patientRoutines, guardianSession)

  if (!routineRegistrationResult.success) {
    return buildGuardianSignupFailure({
      stage: 'patient-routines',
      apiName: 'routine.create',
      requestPayload: sanitizePatientRoutinesRequestForDebug(input.patientRoutines),
      failure: routineRegistrationResult,
      guardianSession,
      patientRegistration,
    })
  }

  return {
    success: true,
    source: resolveApiSource(guardianSession.authMode),
    data: {
      session: {
        ...guardianSession,
        teamCode: patientRegistration.teamCode,
      },
      teamCode: patientRegistration.teamCode,
      patientId: patientRegistration.patientId,
      patientName: input.patientProfile.name.trim(),
    },
  }
}
