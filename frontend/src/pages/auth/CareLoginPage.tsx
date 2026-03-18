import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHomePathByRole, ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../features/auth/hooks/useAuth'
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

export default function CareLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    id: '',
    password: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setStoredRole('caregiver')
    setStoredEntryMode('login')
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = login({
      id: form.id,
      password: form.password,
      role: 'caregiver',
    })

    if (!result.success) {
      setError(result.message)
      return
    }

    navigate(getHomePathByRole(result.user.role), { replace: true })
  }

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>보호자 로그인</p>
        </div>

        <h1 style={pageTitle}>보호자 로그인</h1>

        <form onSubmit={handleSubmit} style={formStack}>
          <input
            type="text"
            placeholder="보호자 아이디"
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

        <p style={helperText}>로그인 성공 시 보호자 홈으로 이동합니다.</p>

        <div style={linkRow}>
          <Link to={ROUTE_PATHS.AUTH_RESET_PASSWORD} style={textLink}>
            비밀번호 재설정
          </Link>
          <Link to={ROUTE_PATHS.AUTH_SIGNUP_CARE} style={textLink}>
            보호자 회원가입
          </Link>
          <Link to={`${ROUTE_PATHS.AUTH_ROLE}?mode=login`} style={textLink}>
            역할 다시 선택
          </Link>
        </div>
      </div>
    </div>
  )
}
