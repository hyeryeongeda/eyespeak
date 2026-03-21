import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getHomePathByRole, ROUTE_PATHS, resolveAppPath } from '../../app/router/routePaths'
import { useAuth } from '../../features/auth/hooks/useAuth'
import {
  consumeGuardianSessionExitReason,
  setStoredEntryMode,
  setStoredRole,
} from '../../services/authStorage'
import type { GuardianSessionExitReason } from '../../types/auth'
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

interface CareLoginLocationState {
  signupCompleted?: boolean
  guardianEmail?: string
}

export default function CareLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isPending } = useAuth()
  const locationState = (location.state as CareLoginLocationState | null) ?? null
  const [sessionNotice] = useState<GuardianSessionExitReason | null>(() =>
    consumeGuardianSessionExitReason(),
  )
  const [form, setForm] = useState({
    identifier: locationState?.guardianEmail ?? '',
    password: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    setStoredRole('guardian')
    setStoredEntryMode('login')
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = await login({
      identifier: form.identifier,
      password: form.password,
      role: 'guardian',
    })

    if (!result.success) {
      setError(`Login failed. ${result.message}`)
      return
    }

    navigate(getHomePathByRole(result.data.role), { replace: true })
  }

  return (
    <AuthPageFrame>
      <div style={card}>
        <AuthBrand subtitleText="보호자 로그인" />

        <h1 style={pageTitle}>보호자 로그인</h1>

        <div style={infoBox}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
            현재 로그인 방식
          </p>
          <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            보호자 회원가입에서 사용한 이메일과 비밀번호로 로그인합니다.
          </p>
        </div>

        {sessionNotice ? (
          <div style={infoBox}>
            <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
              세션 안내
            </p>
            <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
              {sessionNotice === 'idle-timeout'
                ? '오랫동안 활동이 없어 보호자 세션이 자동으로 종료되었습니다. 다시 로그인해주세요.'
                : '보호자 세션을 갱신하지 못해 다시 로그인이 필요합니다.'}
            </p>
          </div>
        ) : null}

        {locationState?.signupCompleted ? (
          <div style={infoBox}>
            <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
              가입 완료 안내
            </p>
            <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
              보호자 회원가입은 이미 완료되었습니다. 자동 로그인은 되지 않으니, 방금 만든 보호자 계정으로 로그인해 주세요.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={formStack}>
          <input
            type="email"
            placeholder="이메일"
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

        <p style={helperText}>로그인 성공 시 보호자 홈으로 이동합니다.</p>

        <div style={linkRow}>
          <a href={resolveAppPath(`${ROUTE_PATHS.AUTH_RESET_PASSWORD}?role=guardian`)} style={textLink}>
            비밀번호 재설정
          </a>
          <a href={resolveAppPath(ROUTE_PATHS.AUTH_SIGNUP_CARE)} style={textLink}>
            보호자 회원가입
          </a>
          <a href={resolveAppPath(`${ROUTE_PATHS.AUTH_ROLE}?mode=login`)} style={textLink}>
            역할 다시 선택
          </a>
        </div>
      </div>
    </AuthPageFrame>
  )
}
