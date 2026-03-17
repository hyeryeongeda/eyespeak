import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import {
  clearVerifiedTeamCode,
  getStoredVerifiedTeamCode,
  normalizeTeamCode,
  setStoredEntryMode,
  setStoredRole,
  storeVerifiedTeamCode,
  verifyMockTeamCode,
} from '../../services/authService'
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
  secondaryButton,
  subtitle,
  successBox,
  successMessage,
  teamCodeBox,
  textLink,
} from './authPageStyles'

export default function PatientSignupPage() {
  const savedTeamCode = getStoredVerifiedTeamCode()
  const [teamCode, setTeamCode] = useState(savedTeamCode ?? '')
  const [isTeamCodeVerified, setIsTeamCodeVerified] = useState(savedTeamCode !== null)
  const [teamCodeError, setTeamCodeError] = useState('')
  const [form, setForm] = useState({
    name: '',
    id: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setStoredRole('patient')
    setStoredEntryMode('signup')
  }, [])

  const handleVerifyTeamCode = () => {
    setTeamCodeError('')
    setSuccess('')

    if (!verifyMockTeamCode(teamCode)) {
      setIsTeamCodeVerified(false)
      setTeamCodeError('팀코드가 올바르지 않습니다. TEAM123으로 테스트해주세요.')
      return
    }

    const normalizedTeamCode = normalizeTeamCode(teamCode)
    storeVerifiedTeamCode(normalizedTeamCode)
    setTeamCode(normalizedTeamCode)
    setIsTeamCodeVerified(true)
  }

  const handleResetTeamCode = () => {
    clearVerifiedTeamCode()
    setTeamCode('')
    setTeamCodeError('')
    setIsTeamCodeVerified(false)
    setSuccess('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!isTeamCodeVerified) {
      setError('팀코드 확인을 먼저 완료해주세요.')
      return
    }

    if (!form.name || !form.id || !form.password || !form.confirmPassword) {
      setError('모든 항목을 입력해주세요.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setSuccess(
      '환자 계정 생성 UI 목업이 정상 동작했습니다. 실제 API 연동은 아직 연결되지 않았습니다.',
    )
  }

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>환자 회원가입</p>
        </div>

        <h1 style={pageTitle}>환자 회원가입</h1>
        <p style={pageDesc}>팀코드 확인 후 환자 계정 생성 폼이 열립니다.</p>

        <div style={teamCodeBox}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
            1단계. 팀코드 확인
          </p>
          <p style={{ margin: '0 0 14px', color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            현재는 목업 검증만 동작합니다. TEAM123 입력 시 통과합니다.
          </p>

          <div style={formStack}>
            <input
              type="text"
              placeholder="팀코드 입력"
              style={input}
              value={teamCode}
              onChange={event => setTeamCode(event.target.value)}
            />

            {teamCodeError ? <p style={errorMessage}>{teamCodeError}</p> : null}

            {!isTeamCodeVerified ? (
              <button type="button" style={primaryButton} onClick={handleVerifyTeamCode}>
                팀코드 확인
              </button>
            ) : (
              <>
                <div style={successBox}>
                  <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '12px' }}>
                    확인된 팀코드
                  </p>
                  <p style={{ margin: 0, color: '#203042', fontSize: '20px', fontWeight: 800 }}>
                    {teamCode}
                  </p>
                </div>
                <button type="button" style={secondaryButton} onClick={handleResetTeamCode}>
                  팀코드 다시 입력
                </button>
              </>
            )}
          </div>
        </div>

        {isTeamCodeVerified ? (
          <>
            <div style={infoBox}>
              <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
                2단계. 환자 계정 생성
              </p>
              <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
                팀코드 검증이 완료되어 계정 생성 폼이 열렸습니다.
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
                onChange={event =>
                  setForm(prev => ({ ...prev, confirmPassword: event.target.value }))
                }
              />

              {error ? <p style={errorMessage}>{error}</p> : null}
              {success ? <p style={successMessage}>{success}</p> : null}

              <button type="submit" style={primaryButton}>
                계정 생성
              </button>
            </form>
          </>
        ) : null}

        <div style={linkRow}>
          <Link to={ROUTE_PATHS.AUTH_LOGIN_PATIENT} style={textLink}>
            환자 로그인
          </Link>
          <Link to={`${ROUTE_PATHS.AUTH_ROLE}?mode=signup`} style={textLink}>
            역할 다시 선택
          </Link>
        </div>
      </div>
    </div>
  )
}
