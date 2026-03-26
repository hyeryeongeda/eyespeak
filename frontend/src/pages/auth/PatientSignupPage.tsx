import { useEffect, useRef } from 'react'
import type { TouchEvent, WheelEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { resolveAuthEntryRoute } from '../../features/auth/authRedirect'
import { usePatientSignup } from '../../features/auth/hooks/usePatientSignup'
import { setStoredEntryMode, setStoredRole } from '../../services/authStorage'
import AuthBrand from './AuthBrand'
import {
  card,
  errorMessage,
  formStack,
  infoBox,
  input,
  linkRow,
  pageDesc,
  pageTitle,
  primaryButton,
  secondaryButton,
  successMessage,
  successBox,
  teamCodeBox,
  textLink,
} from './authPageStyles'
import AuthPageFrame from './AuthPageFrame'

export default function PatientSignupPage() {
  const location = useLocation()
  const patientLoginRoute = resolveAuthEntryRoute('login', 'patient', location.state)
  const {
    teamCode,
    verifiedTeamCode,
    patientAccount,
    isPatientEmailChecked,
    patientEmailCheckMessage,
    patientEmailCheckMessageType,
    errorMessage: error,
    isVerifyingTeamCode,
    isCheckingPatientEmail,
    isSubmitting,
    setTeamCode,
    setPatientAccount,
    handleVerifyTeamCode,
    handleCheckPatientEmail,
    handleSubmit,
  } = usePatientSignup()

  useEffect(() => {
    setStoredRole('patient')
    setStoredEntryMode('signup')
  }, [])

  const teamCodeFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])
  const patientSignupFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])
  const wheelDeltaRef = useRef<Record<string, number>>({})
  const wheelActionAtRef = useRef<Record<string, number>>({})
  const touchStartYRef = useRef<Record<string, number | null>>({})
  const SCROLL_THRESHOLD = 40
  const SCROLL_COOLDOWN_MS = 140
  const TOUCH_THRESHOLD = 28
  const teamCodeSectionStyle = { ...teamCodeBox, marginBottom: verifiedTeamCode ? '14px' : '16px' }
  const verifiedCodeBoxStyle = { ...successBox, marginBottom: '10px' }
  const accountIntroStyle = { ...infoBox, marginBottom: '12px' }
  const teamCodeFormStyle = { ...formStack, gap: '10px' }
  const patientAccountFormStyle = { ...formStack, gap: '14px' }
  const inlineFieldStyle = { display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }
  const inlineFieldInputStyle = { ...input, minWidth: 0 }

  const moveFocusToField = (
    refs: Array<HTMLInputElement | HTMLButtonElement | null>,
    currentIndex: number,
    direction: 1 | -1,
  ) => {
    const targetIndex = currentIndex + direction
    const target = refs[targetIndex]

    if (!target) {
      return
    }

    target.focus()
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return true
  }

  const handleFieldWheel =
    (
      groupKey: string,
      refs: Array<HTMLInputElement | HTMLButtonElement | null>,
      currentIndex: number,
    ) =>
    (event: WheelEvent<HTMLElement>) => {
      const accumulatedDelta = (wheelDeltaRef.current[groupKey] ?? 0) + event.deltaY

      if (Math.abs(accumulatedDelta) < SCROLL_THRESHOLD) {
        wheelDeltaRef.current[groupKey] = accumulatedDelta
        return
      }

      const lastActionAt = wheelActionAtRef.current[groupKey] ?? 0
      const now = Date.now()

      wheelDeltaRef.current[groupKey] = 0

      if (now - lastActionAt < SCROLL_COOLDOWN_MS) {
        return
      }

      wheelActionAtRef.current[groupKey] = now
      const didMoveFocus = moveFocusToField(refs, currentIndex, accumulatedDelta > 0 ? 1 : -1)

      if (didMoveFocus) {
        event.preventDefault()
      }
    }

  const handleFieldTouchStart =
    (groupKey: string) =>
    (event: TouchEvent<HTMLElement>) => {
      touchStartYRef.current[groupKey] = event.touches[0]?.clientY ?? null
    }

  const handleFieldTouchEnd =
    (
      groupKey: string,
      refs: Array<HTMLInputElement | HTMLButtonElement | null>,
      currentIndex: number,
    ) =>
    (event: TouchEvent<HTMLElement>) => {
      const startY = touchStartYRef.current[groupKey]
      const endY = event.changedTouches[0]?.clientY

      touchStartYRef.current[groupKey] = null

      if (startY == null || endY == null) {
        return
      }

      const deltaY = startY - endY

      if (Math.abs(deltaY) < TOUCH_THRESHOLD) {
        return
      }

      moveFocusToField(refs, currentIndex, deltaY > 0 ? 1 : -1)
    }

  return (
    <AuthPageFrame>
      <div style={card}>
        <AuthBrand subtitleText="환자 회원가입" />

        <h1 style={pageTitle}>환자 회원가입</h1>
        <p style={pageDesc}>보호자에게 전달받은 팀코드를 확인한 뒤 환자 계정을 생성합니다.</p>

        <div style={teamCodeSectionStyle}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
            1단계. 팀코드 확인
          </p>
          <p style={{ margin: '0 0 14px', color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            보호자 가입 완료 화면에서 받은 팀코드를 입력해 주세요.
          </p>

          <div style={teamCodeFormStyle}>
            <input
              type="text"
              placeholder="팀코드 입력"
              style={input}
              ref={node => {
                teamCodeFieldRefs.current[0] = node
              }}
              value={teamCode}
              onChange={event => setTeamCode(event.target.value)}
              onWheel={handleFieldWheel('team-code-0', teamCodeFieldRefs.current, 0)}
              onTouchStart={handleFieldTouchStart('team-code-0')}
              onTouchEnd={handleFieldTouchEnd('team-code-0', teamCodeFieldRefs.current, 0)}
            />

            {!verifiedTeamCode ? (
              <button
                type="button"
                style={isVerifyingTeamCode ? { ...primaryButton, opacity: 0.7 } : primaryButton}
                ref={node => {
                  teamCodeFieldRefs.current[1] = node
                }}
                onClick={() => void handleVerifyTeamCode()}
                disabled={isVerifyingTeamCode}
                onWheel={handleFieldWheel('team-code-1', teamCodeFieldRefs.current, 1)}
                onTouchStart={handleFieldTouchStart('team-code-1')}
                onTouchEnd={handleFieldTouchEnd('team-code-1', teamCodeFieldRefs.current, 1)}
              >
                {isVerifyingTeamCode ? '확인 중...' : '팀코드 확인'}
              </button>
            ) : (
              <div style={verifiedCodeBoxStyle}>
                <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '12px' }}>
                  확인된 팀코드
                </p>
                <p style={{ margin: '0 0 6px', color: '#203042', fontSize: '20px', fontWeight: 800 }}>
                  {verifiedTeamCode.teamCode}
                </p>
                {verifiedTeamCode.verificationMode === 'lookup' && verifiedTeamCode.patientName ? (
                  <p style={{ margin: 0, color: '#6d7f8f', fontSize: '12px' }}>
                    {`연결 대상 환자: ${verifiedTeamCode.patientName}`}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {verifiedTeamCode ? (
          <>
            <div style={accountIntroStyle}>
              <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
                2단계. 환자 계정 생성
              </p>
              <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
                팀코드 확인이 끝나면 이메일 형식의 환자 로그인 계정을 생성할 수 있습니다.
              </p>
            </div>

            <div style={patientAccountFormStyle}>
              <input
                type="text"
                placeholder="환자 이름"
                style={input}
                ref={node => {
                  patientSignupFieldRefs.current[0] = node
                }}
                value={patientAccount.name}
                onChange={event => setPatientAccount(prev => ({ ...prev, name: event.target.value }))}
                onWheel={handleFieldWheel('patient-signup-0', patientSignupFieldRefs.current, 0)}
                onTouchStart={handleFieldTouchStart('patient-signup-0')}
                onTouchEnd={handleFieldTouchEnd('patient-signup-0', patientSignupFieldRefs.current, 0)}
              />
              <div style={inlineFieldStyle}>
                <input
                  type="email"
                  placeholder="로그인 이메일"
                  style={inlineFieldInputStyle}
                  ref={node => {
                    patientSignupFieldRefs.current[1] = node
                  }}
                  value={patientAccount.loginId}
                  onChange={event =>
                    setPatientAccount(prev => ({ ...prev, loginId: event.target.value }))
                  }
                  onWheel={handleFieldWheel('patient-signup-1', patientSignupFieldRefs.current, 1)}
                  onTouchStart={handleFieldTouchStart('patient-signup-1')}
                  onTouchEnd={handleFieldTouchEnd('patient-signup-1', patientSignupFieldRefs.current, 1)}
                />
                <button
                  type="button"
                  style={
                    isCheckingPatientEmail
                      ? { ...secondaryButton, width: '112px', height: '52px', opacity: 0.7 }
                      : { ...secondaryButton, width: '112px', height: '52px' }
                  }
                  ref={node => {
                    patientSignupFieldRefs.current[2] = node
                  }}
                  onClick={() => void handleCheckPatientEmail()}
                  disabled={isCheckingPatientEmail}
                  onWheel={handleFieldWheel('patient-signup-2', patientSignupFieldRefs.current, 2)}
                  onTouchStart={handleFieldTouchStart('patient-signup-2')}
                  onTouchEnd={handleFieldTouchEnd('patient-signup-2', patientSignupFieldRefs.current, 2)}
                >
                  {isCheckingPatientEmail ? '확인 중...' : '중복 확인'}
                </button>
              </div>
              {patientEmailCheckMessage ? (
                <p
                  style={
                    patientEmailCheckMessageType === 'error'
                      ? errorMessage
                      : successMessage
                  }
                >
                  {patientEmailCheckMessage}
                </p>
              ) : isPatientEmailChecked ? (
                <p style={successMessage}>사용 가능한 로그인 이메일입니다.</p>
              ) : null}
              <input
                type="password"
                placeholder="비밀번호"
                style={input}
                ref={node => {
                  patientSignupFieldRefs.current[3] = node
                }}
                value={patientAccount.password}
                onChange={event =>
                  setPatientAccount(prev => ({ ...prev, password: event.target.value }))
                }
                onWheel={handleFieldWheel('patient-signup-3', patientSignupFieldRefs.current, 3)}
                onTouchStart={handleFieldTouchStart('patient-signup-3')}
                onTouchEnd={handleFieldTouchEnd('patient-signup-3', patientSignupFieldRefs.current, 3)}
              />
              <input
                type="password"
                placeholder="비밀번호 확인"
                style={input}
                ref={node => {
                  patientSignupFieldRefs.current[4] = node
                }}
                value={patientAccount.passwordConfirm}
                onChange={event =>
                  setPatientAccount(prev => ({
                    ...prev,
                    passwordConfirm: event.target.value,
                  }))
                }
                onWheel={handleFieldWheel('patient-signup-4', patientSignupFieldRefs.current, 4)}
                onTouchStart={handleFieldTouchStart('patient-signup-4')}
                onTouchEnd={handleFieldTouchEnd('patient-signup-4', patientSignupFieldRefs.current, 4)}
              />

              <button
                type="button"
                style={isSubmitting ? { ...primaryButton, opacity: 0.7 } : primaryButton}
                ref={node => {
                  patientSignupFieldRefs.current[5] = node
                }}
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                onWheel={handleFieldWheel('patient-signup-5', patientSignupFieldRefs.current, 5)}
                onTouchStart={handleFieldTouchStart('patient-signup-5')}
                onTouchEnd={handleFieldTouchEnd('patient-signup-5', patientSignupFieldRefs.current, 5)}
              >
                {isSubmitting ? '회원가입 중...' : '계정 생성'}
              </button>
            </div>
          </>
        ) : null}

        {error ? <p style={errorMessage}>{error}</p> : null}

        <div style={linkRow}>
          <Link
            to={patientLoginRoute.path}
            state={patientLoginRoute.state}
            style={textLink}
          >
            환자 로그인
          </Link>
          <Link
            to={{
              pathname: ROUTE_PATHS.AUTH_ROLE,
              search: '?mode=signup',
            }}
            state={location.state}
            style={textLink}
          >
            뒤로 가기
          </Link>
        </div>
      </div>
    </AuthPageFrame>
  )
}
