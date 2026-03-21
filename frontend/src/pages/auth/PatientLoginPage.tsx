import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS, resolveAppPath } from '../../app/router/routePaths'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { resolvePatientPostAuthDestination } from '../../features/patient/input/services/calibration/patientCalibrationService'
import { setStoredEntryMode, setStoredRole } from '../../services/authStorage'
import AuthBrand from './AuthBrand'
import {
  card,
  errorMessage,
  formStack,
  helperText,
  infoBox,
  input,
  linkRow,
  pageTitle,
  primaryButton,
  textLink,
} from './authPageStyles'
import AuthPageFrame from './AuthPageFrame'

export default function PatientLoginPage() {
  const navigate = useNavigate()
  const { login, isPending } = useAuth()
  const [form, setForm] = useState({
    identifier: '',
    password: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setStoredRole('patient')
    setStoredEntryMode('login')
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = await login({
      identifier: form.identifier,
      password: form.password,
      role: 'patient',
    })

    if (!result.success) {
      setError(result.message)
      return
    }

    const destination = await resolvePatientPostAuthDestination(result.data, {
      entryPoint: 'login',
    })

    navigate(destination.path, {
      replace: true,
      state: destination.state,
    })
  }

  return (
    <AuthPageFrame>
      <div style={card}>
        <AuthBrand subtitleText="환자 로그인" />

        <h1 style={pageTitle}>환자 로그인</h1>

        <div style={infoBox}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
            현재 로그인 방식
          </p>
          <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            회원가입 때 등록한 로그인 이메일과 비밀번호로 로그인합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStack}>
          <input
            type="email"
            placeholder="로그인 이메일"
            style={input}
            value={form.identifier}
            onChange={event => setForm(prev => ({ ...prev, identifier: event.target.value }))}
          />
          <input
            type="password"
            placeholder="비밀번호"
            style={input}
            value={form.password}
            onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
          />

          {error ? <p style={errorMessage}>{error}</p> : null}

          <button
            type="submit"
            style={isPending ? { ...primaryButton, opacity: 0.7 } : primaryButton}
            disabled={isPending}
          >
            {isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p style={helperText}>
          로그인 성공 후에는 계정 상태를 먼저 확인하고, 필요한 경우에만 시선 보정 단계로 안내합니다.
        </p>

        <div style={linkRow}>
          <a href={resolveAppPath(`${ROUTE_PATHS.AUTH_RESET_PASSWORD}?role=patient`)} style={textLink}>
            비밀번호 재설정
          </a>
          <a href={resolveAppPath(ROUTE_PATHS.AUTH_SIGNUP_PATIENT)} style={textLink}>
            환자 회원가입
          </a>
          <a href={resolveAppPath(`${ROUTE_PATHS.AUTH_ROLE}?mode=login`)} style={textLink}>
            역할 다시 선택
          </a>
        </div>
      </div>
    </AuthPageFrame>
  )
}
