import { useEffect } from 'react'
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
  successBox,
  successMessage,
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
    errorMessage: error,
    infoMessage,
    isLoading,
    setTeamCode,
    setPatientAccount,
    handleVerifyTeamCode,
    handleResetTeamCode,
    handleSubmit,
  } = usePatientSignup()

  useEffect(() => {
    setStoredRole('patient')
    setStoredEntryMode('signup')
  }, [])

  return (
    <AuthPageFrame>
      <div style={card}>
        <AuthBrand subtitleText="환자 회원가입" />

        <h1 style={pageTitle}>환자 회원가입</h1>
        <p style={pageDesc}>보호자에게 전달받은 팀코드를 확인한 뒤 환자 계정을 생성합니다.</p>

        <div style={teamCodeBox}>
          <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
            1단계. 팀코드 확인
          </p>
          <p style={{ margin: '0 0 14px', color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
            보호자 가입 완료 화면에서 받은 팀코드를 입력해 주세요.
          </p>

          <div style={formStack}>
            <input
              type="text"
              placeholder="팀코드 입력"
              style={input}
              value={teamCode}
              onChange={event => setTeamCode(event.target.value)}
            />

            {!verifiedTeamCode ? (
              <button
                type="button"
                style={isLoading ? { ...primaryButton, opacity: 0.7 } : primaryButton}
                onClick={() => void handleVerifyTeamCode()}
                disabled={isLoading}
              >
                {isLoading ? '확인 중...' : '팀코드 확인'}
              </button>
            ) : (
              <>
                <div style={successBox}>
                  <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '12px' }}>
                    확인된 팀코드
                  </p>
                  <p style={{ margin: '0 0 6px', color: '#203042', fontSize: '20px', fontWeight: 800 }}>
                    {verifiedTeamCode.teamCode}
                  </p>
                  <p style={{ margin: 0, color: '#6d7f8f', fontSize: '12px' }}>
                    {verifiedTeamCode.verificationMode === 'lookup' && verifiedTeamCode.patientName
                      ? `연결 대상 환자: ${verifiedTeamCode.patientName}`
                      : '실제 연결 여부는 회원가입 요청 시 백엔드에서 최종 확인됩니다.'}
                  </p>
                </div>
                <button type="button" style={secondaryButton} onClick={handleResetTeamCode}>
                  팀코드 다시 입력
                </button>
              </>
            )}
          </div>
        </div>

        {verifiedTeamCode ? (
          <>
            <div style={infoBox}>
              <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
                2단계. 환자 계정 생성
              </p>
              <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
                팀코드 확인이 끝나면 이메일 형식의 환자 로그인 계정을 생성할 수 있습니다.
              </p>
              <p style={{ margin: '8px 0 0', color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
                계정 생성이 완료되면 자동 로그인되며, 로그인 성공 후 시선 보정이 필요한 경우에만 별도로 안내합니다.
              </p>
            </div>

            <p style={{ ...successMessage, marginTop: '12px' }}>
              회원가입이 끝난 뒤 calibration 또는 eye-tracking 준비에 문제가 생겨도, 회원가입 자체는 실패로 처리하지 않습니다.
            </p>

            <div style={formStack}>
              <input
                type="text"
                placeholder="환자 이름"
                style={input}
                value={patientAccount.name}
                onChange={event => setPatientAccount(prev => ({ ...prev, name: event.target.value }))}
              />
              <input
                type="email"
                placeholder="로그인 이메일"
                style={input}
                value={patientAccount.loginId}
                onChange={event =>
                  setPatientAccount(prev => ({ ...prev, loginId: event.target.value }))
                }
              />
              <input
                type="password"
                placeholder="비밀번호"
                style={input}
                value={patientAccount.password}
                onChange={event =>
                  setPatientAccount(prev => ({ ...prev, password: event.target.value }))
                }
              />
              <input
                type="password"
                placeholder="비밀번호 확인"
                style={input}
                value={patientAccount.passwordConfirm}
                onChange={event =>
                  setPatientAccount(prev => ({
                    ...prev,
                    passwordConfirm: event.target.value,
                  }))
                }
              />

              <button
                type="button"
                style={isLoading ? { ...primaryButton, opacity: 0.7 } : primaryButton}
                onClick={() => void handleSubmit()}
                disabled={isLoading}
              >
                {isLoading ? '회원가입 중...' : '계정 생성'}
              </button>
            </div>
          </>
        ) : null}

        {error ? <p style={errorMessage}>{error}</p> : null}
        {infoMessage ? <p style={successMessage}>{infoMessage}</p> : null}

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
