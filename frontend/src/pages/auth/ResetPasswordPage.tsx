import { type FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ROUTE_PATHS, resolveAppPath } from '../../app/router/routePaths'
import { requestPasswordReset } from '../../services/authService'
import { getStoredRole } from '../../services/authStorage'
import { normalizeAuthRole } from '../../services/authRole'
import type { PasswordResetResponseDto, UserRole } from '../../types/auth'
import { isValidEmail } from '../../utils/validators'
import AuthBrand from './AuthBrand'
import {
  card,
  errorMessage,
  formStack,
  infoBox,
  input,
  pageDesc,
  pageTitle,
  primaryButton,
  successBox,
  successMessage,
  textLink,
} from './authPageStyles'
import AuthPageFrame from './AuthPageFrame'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<PasswordResetResponseDto | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const storedRole = getStoredRole()
  const roleParam = searchParams.get('role')
  const resolvedRole: UserRole | null = normalizeAuthRole(roleParam) ?? normalizeAuthRole(storedRole)

  const loginPath = useMemo(() => {
    if (resolvedRole === 'guardian') {
      return ROUTE_PATHS.AUTH_LOGIN_CARE
    }

    if (resolvedRole === 'patient') {
      return ROUTE_PATHS.AUTH_LOGIN_PATIENT
    }

    return ROUTE_PATHS.AUTH_LOGIN
  }, [resolvedRole])

  const roleLabel =
    resolvedRole === 'guardian' ? '보호자' : resolvedRole === 'patient' ? '환자' : '역할 미지정'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setResult(null)

    const normalizedIdentifier = identifier.trim()

    if (!normalizedIdentifier) {
      setError('아이디 또는 이메일을 입력해주세요.')
      return
    }

    if (normalizedIdentifier.includes('@') && !isValidEmail(normalizedIdentifier)) {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    const response = await requestPasswordReset({
      identifier: normalizedIdentifier,
      role: resolvedRole ?? undefined,
    })

    setIsSubmitting(false)

    if (!response.success) {
      setError(response.message)
      return
    }

    setResult(response.data)
  }

  return (
    <AuthPageFrame>
      <div style={card}>
        <AuthBrand subtitleText="비밀번호 재설정" />

        <h1 style={pageTitle}>비밀번호 재설정</h1>
        <p style={pageDesc}>
          계정 역할과 아이디를 확인한 뒤 임시 비밀번호를 발급합니다.
        </p>

        <div style={infoBox}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontSize: '14px', fontWeight: 700 }}>
            현재 재설정 대상
          </p>
          <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            {resolvedRole
              ? `${roleLabel} 로그인 기준으로 계정을 찾습니다.`
              : '직접 진입한 경우 역할 정보가 없어서 입력값으로 계정을 찾습니다.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStack}>
          <input
            type="text"
            placeholder="아이디 또는 이메일"
            style={input}
            value={identifier}
            onChange={event => setIdentifier(event.target.value)}
          />
          <button
            type="submit"
            style={isSubmitting ? { ...primaryButton, opacity: 0.7 } : primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? '재설정 요청 중...' : '재설정 요청'}
          </button>
        </form>

        {error ? <p style={errorMessage}>{error}</p> : null}

        {result ? (
          <>
            <p style={successMessage}>{result.message}</p>
            <div style={successBox}>
              <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '12px' }}>
                재설정 대상
              </p>
              <p style={{ margin: '0 0 8px', color: '#203042', fontSize: '16px', fontWeight: 800 }}>
                {result.userName} · {result.userRole === 'guardian' ? '보호자' : '환자'}
              </p>
              <p style={{ margin: '0 0 8px', color: '#6d7f8f', fontSize: '12px' }}>
                계정: {result.maskedIdentifier}
              </p>
              {result.temporaryPassword ? (
                <p style={{ margin: 0, color: '#2f5d84', fontSize: '15px', fontWeight: 800 }}>
                  임시 비밀번호: {result.temporaryPassword}
                </p>
              ) : (
                <p style={{ margin: 0, color: '#36734a', fontSize: '13px', lineHeight: 1.5 }}>
                  재설정 안내를 전송했습니다. 수신한 임시 비밀번호로 다시 로그인해주세요.
                </p>
              )}
            </div>
          </>
        ) : null}

        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <a href={resolveAppPath(loginPath)} style={textLink}>
            로그인으로 돌아가기
          </a>
        </div>
      </div>
    </AuthPageFrame>
  )
}
