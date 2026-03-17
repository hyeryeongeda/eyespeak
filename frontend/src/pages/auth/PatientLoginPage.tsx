import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'
import { setStoredEntryMode, setStoredRole } from '../../services/authService'
import {
  card,
  errorMessage,
  formStack,
  helperText,
  input,
  linkRow,
  logoText,
  logoWrap,
  pageTitle,
  pageWrapper,
  primaryButton,
  subtitle,
  textLink,
} from './authPageStyles'

export default function PatientLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    id: '',
    password: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setStoredRole('patient')
    setStoredEntryMode('login')
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = login({
      id: form.id,
      password: form.password,
      role: 'patient',
    })

    if (!result.success) {
      setError(result.message)
      return
    }

    navigate(ROUTE_PATHS.PATIENT_MAIN, { replace: true })
  }

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>환자 로그인</p>
        </div>

        <h1 style={pageTitle}>환자 로그인</h1>

        <form onSubmit={handleSubmit} style={formStack}>
          <input
            type="text"
            placeholder="환자 아이디"
            style={input}
            value={form.id}
            onChange={event => setForm(prev => ({ ...prev, id: event.target.value }))}
          />
          <input
            type="password"
            placeholder="비밀번호"
            style={input}
            value={form.password}
            onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
          />

          {error ? <p style={errorMessage}>{error}</p> : null}

          <button type="submit" style={primaryButton}>
            로그인
          </button>
        </form>

        <p style={helperText}>로그인 성공 시 환자 메인으로 이동합니다.</p>

        <div style={linkRow}>
          <Link to={ROUTE_PATHS.AUTH_RESET_PASSWORD} style={textLink}>
            비밀번호 재설정
          </Link>
          <Link to={ROUTE_PATHS.AUTH_SIGNUP_PATIENT} style={textLink}>
            환자 회원가입
          </Link>
          <Link to={`${ROUTE_PATHS.AUTH_ROLE}?mode=login`} style={textLink}>
            역할 다시 선택
          </Link>
        </div>
      </div>
    </div>
  )
}
