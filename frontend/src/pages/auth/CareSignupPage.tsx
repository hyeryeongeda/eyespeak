import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { GUARDIAN_SIGNUP_ROUTINE_SLOTS } from '../../features/auth/guardianRoutineSurvey'
import { useGuardianSignupFlow } from '../../features/auth/hooks/useGuardianSignupFlow'
import { setStoredEntryMode, setStoredRole } from '../../services/authStorage'
import { sanitizeBirthYearInput } from '../../utils/validators'
import AuthBrand from './AuthBrand'
import {
  buttonRow,
  card,
  choiceButton,
  choiceButtonSelected,
  choiceGrid,
  errorMessage as errorMessageStyle,
  formStack,
  infoBox,
  input,
  linkRow,
  pageDesc,
  pageTitle,
  pageWrapper,
  primaryButton,
  progressRow,
  progressStep,
  progressStepActive,
  progressStepDone,
  routineSection,
  secondaryButton,
  sectionDesc,
  sectionTitle,
  successMessage,
  summaryBox,
  tagButton,
  tagButtonSelected,
  tagWrap,
  teamCodeBox,
  teamCodeValue,
  textLink,
} from './authPageStyles'

const STEP_LABELS = ['계정', '환자 정보', '루틴', '완료']

export default function CareSignupPage() {
  const {
    currentStep,
    guardianAccount,
    patientProfile,
    patientRoutines,
    errorMessage: stepErrorMessage,
    copyMessage,
    signupResult,
    isSubmitting,
    setGuardianAccount,
    setPatientProfile,
    goToNextStep,
    goToPreviousStep,
    toggleRoutineTag,
    submitGuardianSignup,
    copyTeamCode,
    finishGuardianSignup,
  } = useGuardianSignupFlow()

  const selectedRoutineCount = GUARDIAN_SIGNUP_ROUTINE_SLOTS.filter(
    slot => typeof patientRoutines[slot.id] === 'number',
  ).length

  useEffect(() => {
    setStoredRole('caregiver')
    setStoredEntryMode('signup')
  }, [])

  const progressIndex =
    currentStep === 'completed'
      ? 3
      : currentStep === 'submitting'
        ? 2
        : currentStep === 'patient-routines'
          ? 2
          : currentStep === 'patient-profile'
            ? 1
            : 0

  return (
    <div style={pageWrapper}>
      <div style={{ ...card, maxWidth: '560px' }}>
        <AuthBrand subtitleText="보호자 회원가입" />

        <h1 style={pageTitle}>보호자 회원가입</h1>
        <p style={pageDesc}>
          보호자 계정 생성부터 환자 기본 정보, 시간대별 루틴 설문, 팀코드 발급까지 한 흐름으로
          진행합니다.
        </p>

        <div style={progressRow}>
          {STEP_LABELS.map((label, index) => {
            const isDone = index < progressIndex
            const isActive = index === progressIndex

            return (
              <div
                key={label}
                style={{
                  ...progressStep,
                  ...(isDone ? progressStepDone : {}),
                  ...(isActive ? progressStepActive : {}),
                }}
              >
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7b8c99' }}>
                  {index + 1}단계
                </p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#203042' }}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>

        {currentStep === 'guardian-account' ? (
          <>
            <h2 style={sectionTitle}>1단계. 보호자 계정 정보 입력</h2>
            <p style={sectionDesc}>이메일, 보호자 이름, 비밀번호를 먼저 입력해주세요.</p>

            <div style={formStack}>
              <input
                type="email"
                placeholder="이메일"
                style={input}
                value={guardianAccount.email}
                onChange={event =>
                  setGuardianAccount(prev => ({ ...prev, email: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="보호자 이름"
                style={input}
                value={guardianAccount.name}
                onChange={event =>
                  setGuardianAccount(prev => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                type="password"
                placeholder="비밀번호"
                style={input}
                value={guardianAccount.password}
                onChange={event =>
                  setGuardianAccount(prev => ({ ...prev, password: event.target.value }))
                }
              />
              <input
                type="password"
                placeholder="비밀번호 확인"
                style={input}
                value={guardianAccount.passwordConfirm}
                onChange={event =>
                  setGuardianAccount(prev => ({
                    ...prev,
                    passwordConfirm: event.target.value,
                  }))
                }
              />

              {stepErrorMessage ? <p style={errorMessageStyle}>{stepErrorMessage}</p> : null}

              <button type="button" style={primaryButton} onClick={goToNextStep}>
                다음
              </button>
            </div>
          </>
        ) : null}

        {currentStep === 'patient-profile' ? (
          <>
            <h2 style={sectionTitle}>2단계. 환자 기본 정보 입력</h2>
            <p style={sectionDesc}>환자 이름, 출생연도, 성별을 입력해주세요.</p>

            <div style={formStack}>
              <input
                type="text"
                placeholder="환자 이름"
                style={input}
                value={patientProfile.name}
                onChange={event =>
                  setPatientProfile(prev => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="출생연도 (예: 1990)"
                style={input}
                value={patientProfile.birthYear}
                onChange={event =>
                  setPatientProfile(prev => ({
                    ...prev,
                    birthYear: sanitizeBirthYearInput(event.target.value),
                  }))
                }
              />

              <div>
                <p style={{ margin: '0 0 8px', color: '#203042', fontSize: '14px', fontWeight: 700 }}>
                  성별
                </p>
                <div style={choiceGrid}>
                  <button
                    type="button"
                    style={{
                      ...choiceButton,
                      ...(patientProfile.gender === 'male' ? choiceButtonSelected : {}),
                    }}
                    onClick={() => setPatientProfile(prev => ({ ...prev, gender: 'male' }))}
                  >
                    남성
                  </button>
                  <button
                    type="button"
                    style={{
                      ...choiceButton,
                      ...(patientProfile.gender === 'female' ? choiceButtonSelected : {}),
                    }}
                    onClick={() => setPatientProfile(prev => ({ ...prev, gender: 'female' }))}
                  >
                    여성
                  </button>
                </div>
              </div>

              {stepErrorMessage ? <p style={errorMessageStyle}>{stepErrorMessage}</p> : null}

              <div style={buttonRow}>
                <button type="button" style={secondaryButton} onClick={goToPreviousStep}>
                  이전
                </button>
                <button type="button" style={primaryButton} onClick={goToNextStep}>
                  다음
                </button>
              </div>
            </div>
          </>
        ) : null}

        {currentStep === 'patient-routines' ? (
          <>
            <h2 style={sectionTitle}>3단계. 환자 시간대별 루틴 입력</h2>
            <p style={sectionDesc}>
              7개 시간대별 대표 활동 태그를 1개씩 선택해주세요. 백엔드 루틴 API 기준으로 모든
              시간대 입력이 필요합니다.
            </p>

            <div style={formStack}>
              {GUARDIAN_SIGNUP_ROUTINE_SLOTS.map(slot => (
                <div key={slot.id} style={routineSection}>
                  <p style={{ margin: '0 0 4px', color: '#203042', fontSize: '15px', fontWeight: 700 }}>
                    {slot.label}
                  </p>
                  <p style={{ margin: '0 0 12px', color: '#6d7f8f', fontSize: '13px' }}>
                    {slot.timeRange}
                  </p>
                  <div style={tagWrap}>
                    {slot.tags.map(tag => {
                      const isSelected = patientRoutines[slot.id] === tag.id

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          style={{
                            ...tagButton,
                            ...(isSelected ? tagButtonSelected : {}),
                          }}
                          onClick={() => toggleRoutineTag(slot.id, tag.id)}
                        >
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div style={summaryBox}>
                <p style={{ margin: '0 0 8px', color: '#203042', fontSize: '14px', fontWeight: 700 }}>
                  입력 요약
                </p>
                <p style={{ margin: '0 0 4px', color: '#6d7f8f', fontSize: '13px' }}>
                  보호자: {guardianAccount.name} ({guardianAccount.email})
                </p>
                <p style={{ margin: '0 0 4px', color: '#6d7f8f', fontSize: '13px' }}>
                  환자: {patientProfile.name} / {patientProfile.birthYear}년생 /{' '}
                  {patientProfile.gender === 'male' ? '남성' : '여성'}
                </p>
                <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px' }}>
                  루틴 선택: {selectedRoutineCount}/{GUARDIAN_SIGNUP_ROUTINE_SLOTS.length}
                </p>
              </div>

              {stepErrorMessage ? <p style={errorMessageStyle}>{stepErrorMessage}</p> : null}

              <div style={buttonRow}>
                <button type="button" style={secondaryButton} onClick={goToPreviousStep}>
                  이전
                </button>
                <button
                  type="button"
                  style={isSubmitting ? { ...primaryButton, opacity: 0.7 } : primaryButton}
                  onClick={() => void submitGuardianSignup()}
                  disabled={isSubmitting}
                >
                  회원가입 완료
                </button>
              </div>
            </div>
          </>
        ) : null}

        {currentStep === 'submitting' ? (
            <div style={infoBox}>
              <p style={{ margin: '0 0 8px', color: '#203042', fontSize: '16px', fontWeight: 700 }}>
                회원가입 완료 처리 중
              </p>
              <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.6 }}>
                보호자 계정을 생성한 뒤 환자 기본 정보와 루틴을 순차 저장하고 있습니다.
              </p>
            </div>
          ) : null}

        {currentStep === 'completed' && signupResult ? (
          <>
            <h2 style={sectionTitle}>4단계. 팀코드 생성 완료</h2>
            <p style={sectionDesc}>
              보호자 계정 생성과 환자 초기 루틴 저장이 완료되었습니다. 아래 팀코드를 환자에게
              전달해주세요.
            </p>

            <div style={teamCodeBox}>
              <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '12px' }}>생성된 팀코드</p>
              <p style={teamCodeValue}>{signupResult.teamCode}</p>
              <button type="button" style={secondaryButton} onClick={() => void copyTeamCode()}>
                팀코드 복사
              </button>
            </div>

            <div style={infoBox}>
              <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
                다음 안내
              </p>
              <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
                환자 측은 이 팀코드를 입력한 뒤 보호자와 연결됩니다.
              </p>
              <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
                TODO(PLAN): 팀코드 재발급, 유효기간, 중복 생성 제한 정책 확정 필요.
              </p>
            </div>

            {copyMessage ? <p style={successMessage}>{copyMessage}</p> : null}

            <div style={buttonRow}>
              <button type="button" style={secondaryButton} onClick={() => void copyTeamCode()}>
                코드 다시 복사
              </button>
              <button type="button" style={primaryButton} onClick={finishGuardianSignup}>
                시작하기
              </button>
            </div>
          </>
        ) : null}

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
