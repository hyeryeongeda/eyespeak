import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { setStoredEntryMode, setStoredRole } from '../../services/authService'
import {
  card,
  errorMessage,
  formStack,
  infoBox,
  input,
  linkRow,
  logoText,
  logoWrap,
  pageDesc,
  pageTitle,
  pageWrapper,
  primaryButton,
  subtitle,
  successMessage,
  textLink,
} from './authPageStyles'

export default function CareSignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    id: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setStoredRole('caregiver')
    setStoredEntryMode('signup')
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name || !form.email || !form.id || !form.password || !form.confirmPassword) {
      setError('모든 항목을 입력해주세요.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setSuccess(
      '보호자 회원가입 UI 목업이 정상 동작했습니다. 실제 API 연동은 아직 연결되지 않았습니다.',
    )
  }

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>보호자 회원가입</p>
        </div>

        <h1 style={pageTitle}>보호자 회원가입</h1>
        <p style={pageDesc}>보호자 계정 생성 UI만 먼저 목업으로 제공합니다.</p>

        <div style={infoBox}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
            현재 상태
          </p>
          <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            입력 검증만 동작하며 실제 계정 생성 API는 연결하지 않습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStack}>
          <input
            type="text"
            placeholder="이름"
            style={input}
            value={form.name}
            onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          />
          <input
            type="email"
            placeholder="이메일"
            style={input}
            value={form.email}
            onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="text"
            placeholder="아이디"
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
          <input
            type="password"
            placeholder="비밀번호 확인"
            style={input}
            value={form.confirmPassword}
            onChange={event => setForm(prev => ({ ...prev, confirmPassword: event.target.value }))}
          />

          {error ? <p style={errorMessage}>{error}</p> : null}
          {success ? <p style={successMessage}>{success}</p> : null}

          <button type="submit" style={primaryButton}>
            회원가입 완료
          </button>
        </form>

        <div style={linkRow}>
          <Link to={ROUTE_PATHS.AUTH_LOGIN_CARE} style={textLink}>
            보호자 로그인
          </Link>
          <Link to={`${ROUTE_PATHS.AUTH_ROLE}?mode=signup`} style={textLink}>
            역할 다시 선택
          </Link>
        </div>
      </div>
    </div>
  )
}
