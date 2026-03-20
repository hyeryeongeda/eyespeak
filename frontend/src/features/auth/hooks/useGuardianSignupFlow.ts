import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import {
  createInitialPatientRoutines,
  GUARDIAN_SIGNUP_ROUTINE_SLOTS,
} from '../guardianRoutineSurvey'
import { signUpGuardian } from '../../../services/guardianSignupService'
import { setStoredEntryMode, setStoredRole } from '../../../services/authStorage'
import type { GuardianAccountFormValues } from '../../../types/auth'
import type {
  PatientProfileFormValues,
  PatientRoutinesFormValues,
} from '../../../types/patient'
import type { GuardianSignupFlowSuccess } from '../../../services/guardianSignupService'
import { isValidEmail, validateBirthYear, validatePassword } from '../../../utils/validators'

export type GuardianSignupStep =
  | 'guardian-account'
  | 'patient-profile'
  | 'patient-routines'
  | 'submitting'
  | 'completed'

const INITIAL_GUARDIAN_ACCOUNT: GuardianAccountFormValues = {
  email: '',
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

export function useGuardianSignupFlow() {
  const navigate = useNavigate()
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
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const validateGuardianAccountStep = () => {
    if (!guardianAccount.email.trim() || !guardianAccount.name.trim()) {
      return '이메일과 보호자 이름을 입력해주세요.'
    }

    if (!isValidEmail(guardianAccount.email)) {
      return '올바른 이메일 형식을 입력해주세요.'
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
    setErrorMessage('')

    if (currentStep === 'guardian-account') {
      const validationMessage = validateGuardianAccountStep()

      if (validationMessage) {
        setErrorMessage(validationMessage)
        return
      }

      setCurrentStep('patient-profile')
      return
    }

    if (currentStep === 'patient-profile') {
      const validationMessage = validatePatientProfileStep()

      if (validationMessage) {
        setErrorMessage(validationMessage)
        return
      }

      setCurrentStep('patient-routines')
    }
  }

  const goToPreviousStep = () => {
    setErrorMessage('')

    if (currentStep === 'patient-profile') {
      setCurrentStep('guardian-account')
      return
    }

    if (currentStep === 'patient-routines') {
      setCurrentStep('patient-profile')
    }
  }

  const submitGuardianSignup = async () => {
    const validationMessage = validatePatientRoutinesStep()

    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setErrorMessage('')
    setCopyMessage('')
    setIsSubmitting(true)
    setCurrentStep('submitting')

    const result = await signUpGuardian({
      guardianAccount,
      patientProfile,
      patientRoutines,
    })

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message)
      setCurrentStep('patient-routines')
      return
    }

    setSignupResult(result.data)
    setCurrentStep('completed')
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
    navigate(ROUTE_PATHS.AUTH_LOGIN_CARE, { replace: true })
  }

  return {
    currentStep,
    stepIndex,
    guardianAccount,
    patientProfile,
    patientRoutines,
    errorMessage,
    copyMessage,
    signupResult,
    isSubmitting,
    setGuardianAccount,
    setPatientProfile,
    setPatientRoutines,
    goToNextStep,
    goToPreviousStep,
    toggleRoutineTag: (slotId: number, tagId: number) => {
      setPatientRoutines(prev => toggleSelectedTag(prev, slotId, tagId))
    },
    submitGuardianSignup,
    copyTeamCode,
    finishGuardianSignup,
  }
}

export default useGuardianSignupFlow
