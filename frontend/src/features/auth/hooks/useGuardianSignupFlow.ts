import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import {
  createInitialPatientRoutines,
  GUARDIAN_SIGNUP_ROUTINE_SLOTS,
} from '../guardianRoutineSurvey'
import { checkEmailAvailability } from '../../../services/authService'
import { signUpGuardian } from '../../../services/guardianSignupService'
import { setStoredEntryMode, setStoredRole } from '../../../services/authStorage'
import type { GuardianAccountFormValues } from '../../../types/auth'
import type {
  PatientProfileFormValues,
  PatientRoutinesFormValues,
} from '../../../types/patient'
import type {
  GuardianSignupFlowFailure,
  GuardianSignupFlowSuccess,
  GuardianSignupResumeContext,
  GuardianSignupRetryActionType,
  GuardianSignupStage,
} from '../../../services/guardianSignupService'
import {
  isValidEmail,
  normalizeEmailAddress,
  validateBirthYear,
  validatePassword,
} from '../../../utils/validators'

export type GuardianSignupStep =
  | 'guardian-account'
  | 'patient-profile'
  | 'patient-routines'
  | 'submitting'
  | 'completed'

export interface GuardianSignupRecoverableFailure {
  failedStage: GuardianSignupStage
  lastCompletedStage: GuardianSignupStage | null
  retryActionType: GuardianSignupRetryActionType
  title: string
  description: string
  nextAction: string
  detail: string | null
  partialCompletionNotice: string | null
  debugContext: GuardianSignupFlowFailure['debugContext']
}

const INITIAL_GUARDIAN_ACCOUNT: GuardianAccountFormValues = {
  email: '',
  emailConfirm: '',
  name: '',
  password: '',
  passwordConfirm: '',
}

const INITIAL_PATIENT_PROFILE: PatientProfileFormValues = {
  name: '',
  birthYear: '',
  gender: '',
}

function toggleSelectedTag(
  currentSelections: PatientRoutinesFormValues,
  slotId: number,
  tagId: number,
) {
  if (currentSelections[slotId] === tagId) {
    return {
      ...currentSelections,
      [slotId]: null,
    }
  }

  return {
    ...currentSelections,
    [slotId]: tagId,
  }
}

function cycleSelectedTag(
  currentSelections: PatientRoutinesFormValues,
  slotId: number,
  direction: 1 | -1,
) {
  const slot = GUARDIAN_SIGNUP_ROUTINE_SLOTS.find(item => item.id === slotId)

  if (!slot || slot.tags.length === 0) {
    return currentSelections
  }

  const currentTagId = currentSelections[slotId]
  const currentIndex = slot.tags.findIndex(tag => tag.id === currentTagId)
  const nextIndex =
    currentIndex === -1
      ? direction > 0
        ? 0
        : slot.tags.length - 1
      : (currentIndex + direction + slot.tags.length) % slot.tags.length

  return {
    ...currentSelections,
    [slotId]: slot.tags[nextIndex]?.id ?? null,
  }
}

function getStageTitle(stage: GuardianSignupStage) {
  switch (stage) {
    case 'guardian-account':
      return '1단계. 보호자 계정 생성'
    case 'patient-profile':
      return '2단계. 환자 기본 정보 저장'
    case 'patient-routines':
      return '3단계. 루틴 설문 저장'
    default:
      return '보호자 회원가입'
  }
}

function mapFailureToRecoverableState(
  failure: GuardianSignupFlowFailure,
): GuardianSignupRecoverableFailure {
  const defaultPartialNotice = failure.partialCompletionPossible
    ? '일부 정보가 이미 저장되었을 수 있습니다. 같은 이메일로 다시 가입이 되지 않거나 진행 상태가 맞지 않으면 로그인 또는 관리자 확인이 필요합니다.'
    : null

  switch (failure.reason) {
    case 'email-duplicated':
      return {
        failedStage: failure.failedStage,
        lastCompletedStage: failure.lastCompletedStage,
        retryActionType: failure.retryActionType,
        title: getStageTitle('guardian-account'),
        description: '이미 사용 중인 이메일입니다. 로그인 실패와는 별개로 회원가입 1단계에서 계정 생성이 완료되지 않았습니다.',
        nextAction:
          '다른 이메일로 다시 가입하거나, 같은 이메일을 계속 써야 하면 로그인 화면에서 먼저 로그인 가능 여부를 확인해주세요.',
        detail:
          '이전 시도에서 보호자 계정만 먼저 생성되었을 가능성도 있습니다. 같은 이메일로 다시 가입이 안 되면 새 가입보다 로그인 또는 관리자 확인이 안전합니다.',
        partialCompletionNotice: defaultPartialNotice,
        debugContext: failure.debugContext,
      }
    case 'patient-profile-already-created':
      return {
        failedStage: failure.failedStage,
        lastCompletedStage: failure.lastCompletedStage,
        retryActionType: failure.retryActionType,
        title: getStageTitle('patient-profile'),
        description:
          '보호자 계정 또는 환자 기본 정보 일부가 이미 저장된 것으로 보입니다. 로그인 실패가 아니라 회원가입 2단계 정합성 문제입니다.',
        nextAction:
          '같은 이메일로 로그인 가능한지 먼저 확인해주세요. 로그인 후 상태가 맞지 않으면 관리자 확인이 필요합니다.',
        detail:
          '현재 프론트엔드는 이미 생성된 환자 정보와 팀코드를 다시 조회할 수 없어서, 안전하게 3단계만 이어서 완료할 수 없습니다.',
        partialCompletionNotice: defaultPartialNotice,
        debugContext: failure.debugContext,
      }
    case 'patient-profile-failed':
    case 'network':
      if (failure.failedStage === 'patient-profile') {
        return {
          failedStage: failure.failedStage,
          lastCompletedStage: failure.lastCompletedStage,
          retryActionType: failure.retryActionType,
          title: getStageTitle('patient-profile'),
          description:
            '환자 기본 정보 저장에서 실패했습니다. 로그인 문제가 아니라 회원가입 2단계 저장 실패입니다.',
          nextAction:
            '환자 이름, 출생연도, 성별을 확인한 뒤 다시 진행해주세요. 같은 화면에서 다시 시도하면 보호자 계정을 새로 만들지 않고 2단계부터 이어서 진행합니다.',
          detail:
            failure.reason === 'network'
              ? '네트워크 응답이 불안정했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.'
              : '입력값 또는 서버 응답을 다시 확인한 뒤 재시도해주세요.',
          partialCompletionNotice:
            failure.lastCompletedStage === 'guardian-account'
              ? defaultPartialNotice
              : null,
          debugContext: failure.debugContext,
        }
      }

      if (failure.failedStage === 'patient-routines') {
        return {
          failedStage: failure.failedStage,
          lastCompletedStage: failure.lastCompletedStage,
          retryActionType: failure.retryActionType,
          title: getStageTitle('patient-routines'),
          description:
            '루틴 설문 저장에서 실패했습니다. 로그인 문제가 아니라 회원가입 3단계 저장 실패입니다.',
          nextAction:
            '현재 화면에서 다시 제출하면 보호자 계정과 환자 기본 정보는 다시 만들지 않고 루틴 설문 저장만 다시 시도합니다.',
          detail:
            failure.reason === 'network'
              ? '네트워크 응답이 불안정했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.'
              : '루틴 선택값과 서버 응답을 다시 확인한 뒤 재시도해주세요.',
          partialCompletionNotice: defaultPartialNotice,
          debugContext: failure.debugContext,
        }
      }

      if (failure.failedStage === 'guardian-account') {
        return {
          failedStage: failure.failedStage,
          lastCompletedStage: failure.lastCompletedStage,
          retryActionType: failure.retryActionType,
          title: getStageTitle('guardian-account'),
          description:
            '보호자 계정 생성 요청에 실패했습니다. 자동 로그인 실패와는 다른 문제이며 회원가입 1단계에서 멈춘 상태입니다.',
          nextAction:
            '잠시 후 다시 가입을 시도해주세요. 같은 이메일로 곧바로 다시 가입했을 때 중복 안내가 나오면 계정이 먼저 생성되었을 수 있으니 로그인 여부를 확인해주세요.',
          detail:
            failure.reason === 'network'
              ? '네트워크 응답이 불안정했습니다. 요청이 서버에 일부 반영되었을 가능성도 있습니다.'
              : '입력한 이메일과 비밀번호 정책을 다시 확인한 뒤 재시도해주세요.',
          partialCompletionNotice: defaultPartialNotice,
          debugContext: failure.debugContext,
        }
      }

      break
    case 'routine-failed':
      return {
        failedStage: failure.failedStage,
        lastCompletedStage: failure.lastCompletedStage,
        retryActionType: failure.retryActionType,
        title: getStageTitle('patient-routines'),
        description:
          '루틴 설문 저장에서 실패했습니다. 로그인 문제가 아니라 회원가입 3단계 저장 실패입니다.',
        nextAction:
          '현재 화면에서 다시 제출하면 루틴 설문 저장만 다시 시도합니다. 이미 저장된 보호자 계정과 환자 기본 정보는 다시 만들지 않습니다.',
        detail: '선택한 시간대별 루틴을 확인한 뒤 다시 제출해주세요.',
        partialCompletionNotice: defaultPartialNotice,
        debugContext: failure.debugContext,
      }
    case 'guardian-account-failed':
      return {
        failedStage: failure.failedStage,
        lastCompletedStage: failure.lastCompletedStage,
        retryActionType: failure.retryActionType,
        title: getStageTitle('guardian-account'),
        description:
          '보호자 계정 생성에서 실패했습니다. 자동 로그인 문제가 아니라 회원가입 1단계 요청 실패입니다.',
        nextAction: '이메일과 비밀번호를 다시 확인한 뒤 재시도해주세요.',
        detail: null,
        partialCompletionNotice: defaultPartialNotice,
        debugContext: failure.debugContext,
      }
    default:
      return {
        failedStage: failure.failedStage,
        lastCompletedStage: failure.lastCompletedStage,
        retryActionType: failure.retryActionType,
        title: getStageTitle(failure.failedStage),
        description: '회원가입 처리 중 알 수 없는 오류가 발생했습니다.',
        nextAction:
          '잠시 후 다시 시도해주세요. 같은 문제가 반복되면 관리자 확인이 필요합니다.',
        detail: failure.message,
        partialCompletionNotice: defaultPartialNotice,
        debugContext: failure.debugContext,
      }
  }

  return {
    failedStage: failure.failedStage,
    lastCompletedStage: failure.lastCompletedStage,
    retryActionType: failure.retryActionType,
    title: getStageTitle(failure.failedStage),
    description: '회원가입 단계 처리에 실패했습니다.',
    nextAction: '입력값을 다시 확인한 뒤 재시도해주세요.',
    detail: failure.message,
    partialCompletionNotice: defaultPartialNotice,
    debugContext: failure.debugContext,
  }
}

export function useGuardianSignupFlow() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState<GuardianSignupStep>('guardian-account')
  const [guardianAccount, setGuardianAccount] =
    useState<GuardianAccountFormValues>(INITIAL_GUARDIAN_ACCOUNT)
  const [patientProfile, setPatientProfile] =
    useState<PatientProfileFormValues>(INITIAL_PATIENT_PROFILE)
  const [patientRoutines, setPatientRoutines] =
    useState<PatientRoutinesFormValues>(() => createInitialPatientRoutines())
  const [errorMessage, setErrorMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [signupResult, setSignupResult] = useState<GuardianSignupFlowSuccess | null>(null)
  const [currentSignupStage, setCurrentSignupStage] = useState<GuardianSignupStage>('guardian-account')
  const [lastCompletedStage, setLastCompletedStage] = useState<GuardianSignupStage | null>(null)
  const [recoverableFailure, setRecoverableFailure] =
    useState<GuardianSignupRecoverableFailure | null>(null)
  const [retryActionType, setRetryActionType] = useState<GuardianSignupRetryActionType | null>(null)
  const [resumeContext, setResumeContext] = useState<GuardianSignupResumeContext | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingGuardianEmail, setIsCheckingGuardianEmail] = useState(false)
  const [checkedGuardianEmail, setCheckedGuardianEmail] = useState('')
  const [guardianEmailCheckMessage, setGuardianEmailCheckMessage] = useState('')
  const isMountedRef = useRef(true)
  const isSubmittingRef = useRef(false)
  const activeSubmissionIdRef = useRef(0)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const stepIndex = useMemo(() => {
    switch (currentStep) {
      case 'guardian-account':
        return 0
      case 'patient-profile':
        return 1
      case 'patient-routines':
      case 'submitting':
      case 'completed':
        return 2
      default:
        return 0
    }
  }, [currentStep])

  const clearFormErrorState = () => {
    setErrorMessage('')
    setCopyMessage('')
  }

  const normalizedGuardianEmail = normalizeEmailAddress(guardianAccount.email)
  const hasValidGuardianEmail = isValidEmail(guardianAccount.email)
  const isGuardianEmailChecked =
    normalizedGuardianEmail.length > 0 && checkedGuardianEmail === normalizedGuardianEmail

  const validateGuardianAccountStep = () => {
    if (!guardianAccount.name.trim() || !guardianAccount.email.trim()) {
      return '보호자 이름과 이메일을 입력해주세요.'
    }

    if (!isValidEmail(guardianAccount.email)) {
      return '올바른 이메일 형식을 입력해주세요.'
    }

    if (!isGuardianEmailChecked) {
      return '이메일 중복확인을 완료해주세요.'
    }

    const passwordMessage = validatePassword(guardianAccount.password)

    if (passwordMessage) {
      return passwordMessage
    }

    if (guardianAccount.password !== guardianAccount.passwordConfirm) {
      return '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
    }

    return null
  }

  const validatePatientProfileStep = () => {
    if (!patientProfile.name.trim()) {
      return '환자 이름을 입력해주세요.'
    }

    const birthYearMessage = validateBirthYear(patientProfile.birthYear)

    if (birthYearMessage) {
      return birthYearMessage
    }

    if (!patientProfile.gender) {
      return '환자 성별을 선택해주세요.'
    }

    return null
  }

  const validatePatientRoutinesStep = () => {
    const missingSlot = GUARDIAN_SIGNUP_ROUTINE_SLOTS.find(
      slot => typeof patientRoutines[slot.id] !== 'number',
    )

    if (missingSlot) {
      return `${missingSlot.label} 시간대의 대표 활동을 선택해주세요.`
    }

    return null
  }

  const goToNextStep = () => {
    if (isSubmittingRef.current) {
      return
    }

    setErrorMessage('')
    setRecoverableFailure(null)

    if (currentStep === 'guardian-account') {
      const validationMessage = validateGuardianAccountStep()

      if (validationMessage) {
        setErrorMessage(validationMessage)
        return
      }

      setCurrentSignupStage('patient-profile')
      setCurrentStep('patient-profile')
      return
    }

    if (currentStep === 'patient-profile') {
      const validationMessage = validatePatientProfileStep()

      if (validationMessage) {
        setErrorMessage(validationMessage)
        return
      }

      setCurrentSignupStage('patient-routines')
      setCurrentStep('patient-routines')
    }
  }

  const goToPreviousStep = () => {
    if (isSubmittingRef.current) {
      return
    }

    setErrorMessage('')
    setRecoverableFailure(null)

    if (currentStep === 'patient-profile') {
      if (lastCompletedStage === 'guardian-account' || lastCompletedStage === 'patient-profile') {
        return
      }

      setCurrentSignupStage('guardian-account')
      setCurrentStep('guardian-account')
      return
    }

    if (currentStep === 'patient-routines') {
      if (lastCompletedStage === 'patient-profile') {
        return
      }

      setCurrentSignupStage('patient-profile')
      setCurrentStep('patient-profile')
    }
  }

  const submitGuardianSignup = async () => {
    if (isSubmittingRef.current) {
      return
    }

    const validationMessage = validatePatientRoutinesStep()

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setErrorMessage('')
    setCopyMessage('')
    setRecoverableFailure(null)
    setRetryActionType(null)
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setCurrentStep('submitting')
    const submissionId = activeSubmissionIdRef.current + 1
    activeSubmissionIdRef.current = submissionId

    const result = await signUpGuardian({
      guardianAccount,
      patientProfile,
      patientRoutines,
      resumeContext,
    })

    if (!isMountedRef.current || activeSubmissionIdRef.current !== submissionId) {
      return
    }

    isSubmittingRef.current = false
    setIsSubmitting(false)

    if (!result.success) {
      const mappedFailure = mapFailureToRecoverableState(result)
      setLastCompletedStage(result.lastCompletedStage)
      setResumeContext(result.resumeContext)
      setRetryActionType(result.retryActionType)
      setRecoverableFailure(mappedFailure)
      setCurrentSignupStage(result.failedStage)
      setCurrentStep(result.failedStage)

      if (import.meta.env.DEV) {
        console.groupCollapsed(
          `[guardian-signup] ${result.failedStage} failed (${result.retryActionType})`,
        )
        console.info('userMessage', {
          title: mappedFailure.title,
          description: mappedFailure.description,
          nextAction: mappedFailure.nextAction,
        })
        console.info('debugContext', result.debugContext)
        console.groupEnd()
      }

      return
    }

    setResumeContext(null)
    setLastCompletedStage('patient-routines')
    setSignupResult(result.data)
    setCurrentStep('completed')

    if (import.meta.env.DEV) {
      console.info('[guardian-signup] completed', {
        patientId: result.data.patientId,
        teamCode: result.data.teamCode,
      })
    }
  }

  const copyTeamCode = async () => {
    if (!signupResult?.teamCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(signupResult.teamCode)
      setCopyMessage('팀코드를 복사했습니다.')
    } catch {
      setCopyMessage('복사에 실패했습니다. 팀코드를 직접 확인해주세요.')
    }
  }

  const finishGuardianSignup = () => {
    if (!signupResult) {
      return
    }

    setStoredRole('guardian')
    setStoredEntryMode('login')
    navigate(ROUTE_PATHS.AUTH_LOGIN_CARE, {
      replace: true,
      state: {
        ...(location.state && typeof location.state === 'object'
          ? (location.state as Record<string, unknown>)
          : {}),
        signupCompleted: true,
        guardianEmail: normalizedGuardianEmail,
        patientName: signupResult.patientName,
        teamCode: signupResult.teamCode,
      },
    })
  }

  const setGuardianAccountValues = (
    nextState:
      | GuardianAccountFormValues
      | ((previousState: GuardianAccountFormValues) => GuardianAccountFormValues),
  ) => {
    clearFormErrorState()
    setGuardianAccount(previousState => {
      const resolvedState =
        typeof nextState === 'function'
          ? nextState(previousState)
          : nextState
      const normalizedNextEmail = normalizeEmailAddress(resolvedState.email)

      if (normalizedNextEmail !== checkedGuardianEmail) {
        setCheckedGuardianEmail('')
        setGuardianEmailCheckMessage('')
      }

      return resolvedState
    })
  }

  const checkGuardianEmail = async () => {
    clearFormErrorState()

    if (!guardianAccount.email.trim()) {
      setErrorMessage('이메일을 입력해주세요.')
      return
    }

    if (!hasValidGuardianEmail) {
      setErrorMessage('올바른 이메일 형식을 입력해주세요.')
      return
    }

    setIsCheckingGuardianEmail(true)
    const result = await checkEmailAvailability(normalizedGuardianEmail)

    if (!isMountedRef.current) {
      return
    }

    setIsCheckingGuardianEmail(false)

    if (!result.success) {
      setCheckedGuardianEmail('')
      setGuardianEmailCheckMessage('')
      setErrorMessage(result.message)
      return
    }

    setCheckedGuardianEmail(normalizedGuardianEmail)
    setGuardianEmailCheckMessage('사용 가능한 이메일입니다.')
  }

  const setPatientProfileValues = (
    nextState:
      | PatientProfileFormValues
      | ((previousState: PatientProfileFormValues) => PatientProfileFormValues),
  ) => {
    clearFormErrorState()
    setPatientProfile(nextState)
  }

  const setPatientRoutineValues = (
    nextState:
      | PatientRoutinesFormValues
      | ((previousState: PatientRoutinesFormValues) => PatientRoutinesFormValues),
  ) => {
    clearFormErrorState()
    setPatientRoutines(nextState)
  }

  const canGoToPreviousStep =
    currentStep === 'patient-profile'
      ? lastCompletedStage == null
      : currentStep === 'patient-routines'
        ? lastCompletedStage !== 'patient-profile'
        : false

  const submitButtonLabel =
    retryActionType === 'retry-patient-routines' && recoverableFailure?.failedStage === 'patient-routines'
      ? '루틴 저장 다시 시도'
      : '회원가입 완료'

  return {
    currentStep,
    currentSignupStage,
    stepIndex,
    guardianAccount,
    normalizedGuardianEmail,
    isGuardianEmailChecked,
    guardianEmailCheckMessage,
    patientProfile,
    patientRoutines,
    errorMessage,
    copyMessage,
    signupResult,
    lastCompletedStage,
    recoverableFailure,
    retryActionType,
    canGoToPreviousStep,
    submitButtonLabel,
    isSubmitting,
    isCheckingGuardianEmail,
    setGuardianAccount: setGuardianAccountValues,
    setPatientProfile: setPatientProfileValues,
    setPatientRoutines: setPatientRoutineValues,
    checkGuardianEmail,
    goToNextStep,
    goToPreviousStep,
    toggleRoutineTag: (slotId: number, tagId: number) => {
      clearFormErrorState()
      setPatientRoutines(prev => toggleSelectedTag(prev, slotId, tagId))
    },
    cycleRoutineTag: (slotId: number, direction: 1 | -1) => {
      clearFormErrorState()
      setPatientRoutines(prev => cycleSelectedTag(prev, slotId, direction))
    },
    submitGuardianSignup,
    copyTeamCode,
    finishGuardianSignup,
  }
}

export default useGuardianSignupFlow
