import { useState } from 'react'
import { ROUTE_PATHS, resolveAppPath } from '../../../app/router/routePaths'
import { getPatientCalibrationStatus } from '../../../features/patient/input/services/calibration/patientCalibrationService'
import {
  clearVerifiedTeamCode,
  getStoredVerifiedTeamCode,
  storeVerifiedTeamCode,
} from '../../../services/authStorage'
import { signUpPatient, verifyTeamCode } from '../../../services/patientAuthService'
import type { PatientAccountFormValues, VerifiedTeamCode } from '../../../types/patient'
import { isValidEmail, validatePassword } from '../../../utils/validators'
import { useAuth } from './useAuth'

const INITIAL_PATIENT_ACCOUNT: PatientAccountFormValues = {
  name: '',
  loginId: '',
  password: '',
  passwordConfirm: '',
}

export function usePatientSignup() {
  const { setSession } = useAuth()
  const storedVerifiedTeamCode = getStoredVerifiedTeamCode()
  const [teamCode, setTeamCode] = useState(storedVerifiedTeamCode ?? '')
  const [verifiedTeamCode, setVerifiedTeamCode] = useState<VerifiedTeamCode | null>(null)
  const [patientAccount, setPatientAccount] =
    useState<PatientAccountFormValues>(INITIAL_PATIENT_ACCOUNT)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleVerifyTeamCode = async () => {
    setErrorMessage('')
    setInfoMessage('')
    setIsLoading(true)

    const result = await verifyTeamCode(teamCode)

    setIsLoading(false)

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
    setInfoMessage(
      result.data.verificationMode === 'provisional'
        ? '팀코드를 저장했습니다. 실제 유효성은 회원가입 요청 시 백엔드에서 확인됩니다.'
        : '팀코드 확인이 완료되었습니다.',
    )
  }

  const handleResetTeamCode = () => {
    clearVerifiedTeamCode()
    setVerifiedTeamCode(null)
    setTeamCode('')
    setErrorMessage('')
    setInfoMessage('')
  }

  const handleSubmit = async () => {
    setErrorMessage('')
    setInfoMessage('')

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

    const passwordMessage = validatePassword(patientAccount.password)

    if (passwordMessage) {
      setErrorMessage(passwordMessage)
      return
    }

    if (patientAccount.password !== patientAccount.passwordConfirm) {
      setErrorMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setIsLoading(true)

    const result = await signUpPatient({
      teamCode: verifiedTeamCode.teamCode,
      account: patientAccount,
    })

    setIsLoading(false)

    if (!result.success) {
      setErrorMessage(result.message)
      return
    }

    clearVerifiedTeamCode()
    setSession(result.data.session)

    const calibrationStatus = await getPatientCalibrationStatus(result.data.session)
    const nextPath =
      calibrationStatus.success && !calibrationStatus.data.required
        ? ROUTE_PATHS.PATIENT_MAIN
        : ROUTE_PATHS.PATIENT_CALIBRATION

    window.location.replace(resolveAppPath(nextPath))
  }

  return {
    teamCode,
    verifiedTeamCode,
    patientAccount,
    errorMessage,
    infoMessage,
    isLoading,
    setTeamCode,
    setPatientAccount,
    handleVerifyTeamCode,
    handleResetTeamCode,
    handleSubmit,
  }
}

export default usePatientSignup
