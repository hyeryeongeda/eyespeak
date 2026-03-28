import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { checkEmailAvailability } from '../../../services/authService'
import {
  clearVerifiedTeamCode,
  normalizeTeamCode,
  storeVerifiedTeamCode,
} from '../../../services/authStorage'
import { signUpPatient, verifyTeamCode } from '../../../services/patientAuthService'
import type { PatientAccountFormValues, VerifiedTeamCode } from '../../../types/patient'
import { isValidEmail, normalizeEmailAddress, validatePassword } from '../../../utils/validators'
import { resolveAuthSuccessNavigation } from '../authRedirect'
import { useAuth } from './useAuth'

const INITIAL_PATIENT_ACCOUNT: PatientAccountFormValues = {
  name: '',
  loginId: '',
  password: '',
  passwordConfirm: '',
}

const TEAM_CODE_PREFILL_SOURCE = 'guardian-signup-complete'

interface PatientSignupLocationState {
  prefilledTeamCode?: string
  prefilledTeamCodeSource?: typeof TEAM_CODE_PREFILL_SOURCE
}

function getPrefilledTeamCode(state: unknown) {
  if (!state || typeof state !== 'object') {
    return ''
  }

  const { prefilledTeamCode, prefilledTeamCodeSource } = state as PatientSignupLocationState

  if (prefilledTeamCodeSource !== TEAM_CODE_PREFILL_SOURCE || typeof prefilledTeamCode !== 'string') {
    return ''
  }

  return normalizeTeamCode(prefilledTeamCode)
}

export function usePatientSignup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession, setPatientPostAuth } = useAuth()
  const [teamCode, setTeamCode] = useState(() => getPrefilledTeamCode(location.state))
  const [verifiedTeamCode, setVerifiedTeamCode] = useState<VerifiedTeamCode | null>(null)
  const [patientAccount, setPatientAccount] =
    useState<PatientAccountFormValues>(INITIAL_PATIENT_ACCOUNT)
  const [errorMessage, setErrorMessage] = useState('')
  const [isVerifyingTeamCode, setIsVerifyingTeamCode] = useState(false)
  const [isCheckingPatientEmail, setIsCheckingPatientEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkedPatientEmail, setCheckedPatientEmail] = useState('')
  const [patientEmailCheckMessage, setPatientEmailCheckMessage] = useState('')
  const [patientEmailCheckMessageType, setPatientEmailCheckMessageType] = useState<
    'success' | 'error' | null
  >(null)

  const normalizedPatientEmail = normalizeEmailAddress(patientAccount.loginId)
  const isPatientEmailChecked =
    normalizedPatientEmail.length > 0 && checkedPatientEmail === normalizedPatientEmail

  const handleVerifyTeamCode = async () => {
    setErrorMessage('')
    setIsVerifyingTeamCode(true)

    const result = await verifyTeamCode(teamCode)

    setIsVerifyingTeamCode(false)

    if (!result.success) {
      setVerifiedTeamCode(null)
      setErrorMessage(result.message)
      return
    }

    setVerifiedTeamCode(result.data)
    setTeamCode(result.data.teamCode)
    setPatientAccount(prev => ({
      ...prev,
      name: prev.name || result.data.patientName || '',
    }))
    storeVerifiedTeamCode(result.data.teamCode)
  }

  const setTeamCodeValue = (
    nextState: string | ((previousState: string) => string),
  ) => {
    setErrorMessage('')
    setTeamCode(previousState => {
      const resolvedState =
        typeof nextState === 'function'
          ? nextState(previousState)
          : nextState
      const normalizedNextTeamCode = normalizeTeamCode(resolvedState)

      if (verifiedTeamCode && normalizedNextTeamCode !== verifiedTeamCode.teamCode) {
        clearVerifiedTeamCode()
        setVerifiedTeamCode(null)
      }

      return resolvedState
    })
  }

  const setPatientAccountValues = (
    nextState:
      | PatientAccountFormValues
      | ((previousState: PatientAccountFormValues) => PatientAccountFormValues),
  ) => {
    setErrorMessage('')
    setPatientAccount(previousState => {
      const resolvedState =
        typeof nextState === 'function'
          ? nextState(previousState)
          : nextState
      const normalizedNextEmail = normalizeEmailAddress(resolvedState.loginId)

      if (normalizedNextEmail !== checkedPatientEmail) {
        setCheckedPatientEmail('')
        setPatientEmailCheckMessage('')
        setPatientEmailCheckMessageType(null)
      }

      return resolvedState
    })
  }

  const handleCheckPatientEmail = async () => {
    setErrorMessage('')
    setPatientEmailCheckMessage('')
    setPatientEmailCheckMessageType(null)
    setCheckedPatientEmail('')

    if (!patientAccount.loginId.trim()) {
      setErrorMessage('로그인 이메일을 입력해 주세요.')
      return
    }

    if (!isValidEmail(patientAccount.loginId)) {
      setErrorMessage('이메일 형식의 로그인 계정을 입력해 주세요.')
      return
    }

    setIsCheckingPatientEmail(true)

    let result: Awaited<ReturnType<typeof checkEmailAvailability>>

    try {
      result = await checkEmailAvailability(normalizedPatientEmail)
    } finally {
      setIsCheckingPatientEmail(false)
    }

    if (!result.success) {
      if (
        result.code === 'AUTH-204' ||
        result.code === 'GUARDIAN_EMAIL_DUPLICATED' ||
        result.code === 'PATIENT_LOGIN_ID_DUPLICATED'
      ) {
        setPatientEmailCheckMessage('이미 사용 중인 로그인 이메일입니다.')
        setPatientEmailCheckMessageType('error')
        setErrorMessage('')
        return
      }

      setPatientEmailCheckMessage(result.message)
      setPatientEmailCheckMessageType('error')
      setErrorMessage('')
      return
    }

    setCheckedPatientEmail(normalizedPatientEmail)
    setPatientEmailCheckMessage('사용 가능한 로그인 이메일입니다.')
    setPatientEmailCheckMessageType('success')
  }

  const handleSubmit = async () => {
    setErrorMessage('')

    if (!verifiedTeamCode) {
      setErrorMessage('팀코드 확인을 먼저 완료해 주세요.')
      return
    }

    if (!patientAccount.name.trim() || !patientAccount.loginId.trim()) {
      setErrorMessage('환자 이름과 로그인 이메일을 입력해 주세요.')
      return
    }

    if (!isValidEmail(patientAccount.loginId)) {
      setErrorMessage('이메일 형식의 로그인 계정을 입력해 주세요.')
      return
    }

    if (!isPatientEmailChecked) {
      setErrorMessage('로그인 이메일 중복확인을 완료해 주세요.')
      return
    }

    const passwordMessage = validatePassword(patientAccount.password)

    if (passwordMessage) {
      setErrorMessage(passwordMessage)
      return
    }

    if (patientAccount.password !== patientAccount.passwordConfirm) {
      setErrorMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)

    const result = await signUpPatient({
      teamCode: verifiedTeamCode.teamCode,
      account: patientAccount,
    })

    setIsSubmitting(false)

    if (!result.success) {
      setPatientPostAuth(null)
      setErrorMessage(result.message)
      return
    }

    clearVerifiedTeamCode()
    setSession(result.data.session)
    const resolvedNavigation = await resolveAuthSuccessNavigation(result.data.session, {
      entryPoint: 'signup',
      locationState: location.state,
    })
    setPatientPostAuth(resolvedNavigation.patientPostAuthState)

    navigate(resolvedNavigation.path, {
      replace: true,
      state: resolvedNavigation.state,
    })
  }

  return {
    teamCode,
    verifiedTeamCode,
    patientAccount,
    normalizedPatientEmail,
    isPatientEmailChecked,
    patientEmailCheckMessage,
    patientEmailCheckMessageType,
    errorMessage,
    isVerifyingTeamCode,
    isCheckingPatientEmail,
    isSubmitting,
    setTeamCode: setTeamCodeValue,
    setPatientAccount: setPatientAccountValues,
    handleVerifyTeamCode,
    handleCheckPatientEmail,
    handleSubmit,
  }
}

export default usePatientSignup
