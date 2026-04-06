import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { resolveAuthEntryRoute } from '../authRedirect'
import { GUARDIAN_SIGNUP_ROUTINE_SLOTS } from '../guardianRoutineSurvey'
import { useGuardianSignupFlow } from '../hooks/useGuardianSignupFlow'
import { setStoredEntryMode, setStoredRole } from '../../../services/authStorage'
import type { GuardianSignupStage } from '../../../services/guardianSignupService'
import { sanitizeBirthYearInput } from '../../../utils/validators'
import AuthBrand from '../components/AuthBrand'
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
} from '../ui/authPageStyles'
import AuthPageFrame from '../components/AuthPageFrame'

const STEP_LABELS = ['계정', '환자 정보', '루틴', '완료']
const SIGNUP_STAGES: Array<{ stage: GuardianSignupStage; label: string; helper: string }> = [
  {
    stage: 'guardian-account',
    label: '1단계. 보호자 계정',
    helper: '이메일, 이름, 비밀번호',
  },
  {
    stage: 'patient-profile',
    label: '2단계. 환자 기본 정보',
    helper: '환자 이름, 출생연도, 성별',
  },
  {
    stage: 'patient-routines',
    label: '3단계. 루틴 설문',
    helper: '시간대별 대표 활동 태그',
  },
]

function getStageOrder(stage: GuardianSignupStage | null) {
  switch (stage) {
    case 'guardian-account':
      return 0
    case 'patient-profile':
      return 1
    case 'patient-routines':
      return 2
    default:
      return -1
  }
}

function getNextSubmissionStage(lastCompletedStage: GuardianSignupStage | null) {
  switch (lastCompletedStage) {
    case 'guardian-account':
      return 'patient-profile'
    case 'patient-profile':
      return 'patient-routines'
    default:
      return 'guardian-account'
  }
}

export default function CareSignupPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    currentStep,
    currentSignupStage,
    guardianAccount,
    normalizedGuardianEmail,
    isGuardianEmailChecked,
    guardianEmailCheckMessage,
    guardianEmailCheckMessageType,
    patientProfile,
    patientRoutines,
    errorMessage: stepErrorMessage,
    copyMessage,
    signupResult,
    lastCompletedStage,
    recoverableFailure,
    retryActionType,
    canGoToPreviousStep,
    submitButtonLabel,
    isSubmitting,
    isCheckingGuardianEmail,
    setGuardianAccount,
    setPatientProfile,
    checkGuardianEmail,
    goToNextStep,
    goToPreviousStep,
    toggleRoutineTag,
    submitGuardianSignup,
    copyTeamCode,
    finishGuardianSignup,
  } = useGuardianSignupFlow()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] = useState(false)

  const selectedRoutineCount = GUARDIAN_SIGNUP_ROUTINE_SLOTS.filter(
    slot => typeof patientRoutines[slot.id] === 'number',
  ).length
  const copyMessageStyle = { ...successMessage, marginBottom: '16px' }
  const guardianStepSummaryStyle = { ...summaryBox, marginBottom: '26px' }
  const guardianFormStyle = { ...formStack, gap: '14px' }
  const inlineFieldStyle = { display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }
  const inlineFieldInputStyle = { ...input, minWidth: 0 }
  const passwordFieldWrapStyle = { position: 'relative' as const }
  const passwordInputStyle = { ...input, paddingRight: '58px' }
  const togglePasswordButtonStyle = {
    position: 'absolute' as const,
    top: '50%',
    right: '12px',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    color: '#6f8090',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  }

  useEffect(() => {
    setStoredRole('guardian')
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
  const loginEntryRoute = resolveAuthEntryRoute('login', 'guardian', location.state)
  const inheritedLocationState =
    location.state && typeof location.state === 'object'
      ? (location.state as Record<string, unknown>)
      : {}
  const completedLoginState =
    currentStep === 'completed' && signupResult
      ? {
          ...(loginEntryRoute.state && typeof loginEntryRoute.state === 'object'
            ? (loginEntryRoute.state as Record<string, unknown>)
            : {}),
          signupCompleted: true,
          guardianEmail: normalizedGuardianEmail,
          patientName: signupResult.patientName,
          teamCode: signupResult.teamCode,
        }
      : loginEntryRoute.state
  const completedPatientSignupState =
    currentStep === 'completed' && signupResult
      ? {
          ...inheritedLocationState,
          prefilledTeamCode: signupResult.teamCode,
          prefilledTeamCodeSource: 'guardian-signup-complete' as const,
        }
      : inheritedLocationState

  const goToPatientSignup = () => {
    if (!signupResult) {
      return
    }

    navigate(ROUTE_PATHS.AUTH_SIGNUP_PATIENT, {
      state: completedPatientSignupState,
    })
  }

  return (
    <AuthPageFrame>
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

        <div style={guardianStepSummaryStyle}>
          <p style={{ margin: '0 0 12px', color: '#203042', fontSize: '14px', fontWeight: 700 }}>
            가입 단계 상태
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SIGNUP_STAGES.map(item => {
              const stageOrder = getStageOrder(item.stage)
              const lastCompletedOrder = getStageOrder(lastCompletedStage)
              const failedStage = recoverableFailure?.failedStage ?? null
              const nextSubmissionStage = getNextSubmissionStage(lastCompletedStage)
              const isCompleted =
                signupResult != null || (lastCompletedOrder >= 0 && stageOrder <= lastCompletedOrder)
              const isFailed = failedStage === item.stage
              const isSubmittingStage = currentStep === 'submitting' && nextSubmissionStage === item.stage
              const isActive =
                !isCompleted &&
                !isFailed &&
                !isSubmittingStage &&
                currentSignupStage === item.stage &&
                currentStep !== 'completed'
              const statusLabel = isCompleted
                ? '완료'
                : isFailed
                  ? '실패'
                  : isSubmittingStage
                    ? '처리 중'
                    : isActive
                      ? '입력 중'
                      : '대기'
              const statusStyle = isCompleted
                ? {
                    backgroundColor: '#eff9f0',
                    border: '1px solid #cfe5d1',
                    color: '#36734a',
                  }
                : isFailed
                  ? {
                      backgroundColor: '#fff3f3',
                      border: '1px solid #efc8c8',
                      color: '#b14b4b',
                    }
                  : isSubmittingStage
                    ? {
                        backgroundColor: '#eef6fd',
                        border: '1px solid #cfe0ee',
                        color: '#2f5d84',
                      }
                    : {
                        backgroundColor: '#f5f9fc',
                        border: '1px solid #dce6ee',
                        color: '#6d7f8f',
                      }

              return (
                <div
                  key={item.stage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderRadius: '14px',
                    border: '1px solid #dce6ee',
                    backgroundColor: '#ffffff',
                    padding: '12px 14px',
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: '0 0 4px',
                        color: '#203042',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </p>
                    <p style={{ margin: 0, color: '#6d7f8f', fontSize: '12px' }}>{item.helper}</p>
                  </div>

                  <span
                    style={{
                      ...statusStyle,
                      borderRadius: '999px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {recoverableFailure ? (
          <div
            style={{
              ...infoBox,
              backgroundColor: '#fff8f2',
              border: '1px solid #f0d2b6',
            }}
          >
            <p style={{ margin: '0 0 8px', color: '#8a4e1f', fontSize: '15px', fontWeight: 700 }}>
              {recoverableFailure.title}
            </p>
            <p style={{ margin: '0 0 8px', color: '#805c39', fontSize: '13px', lineHeight: 1.6 }}>
              {recoverableFailure.description}
            </p>
            <p style={{ margin: '0 0 8px', color: '#805c39', fontSize: '13px', lineHeight: 1.6 }}>
              다음으로 해주세요: {recoverableFailure.nextAction}
            </p>
            {recoverableFailure.detail ? (
              <p style={{ margin: '0 0 8px', color: '#805c39', fontSize: '13px', lineHeight: 1.6 }}>
                {recoverableFailure.detail}
              </p>
            ) : null}
            {recoverableFailure.partialCompletionNotice ? (
              <p style={{ margin: 0, color: '#805c39', fontSize: '13px', lineHeight: 1.6 }}>
                {recoverableFailure.partialCompletionNotice}
              </p>
            ) : null}
          </div>
        ) : null}

        {retryActionType === 'go-to-login' ? (
          <div style={infoBox}>
            <p style={{ margin: '0 0 6px', color: '#203042', fontWeight: 700, fontSize: '14px' }}>
              권장 동선
            </p>
            <p style={{ margin: 0, color: '#6d7f8f', fontSize: '13px', lineHeight: 1.5 }}>
              새로 가입을 반복하기보다 로그인 화면으로 이동해 같은 이메일로 로그인 가능한지 먼저 확인하는 편이 안전합니다.
            </p>
          </div>
        ) : null}

        {currentStep === 'guardian-account' ? (
          <>
            <h2 style={sectionTitle}>1단계. 보호자 계정 정보 입력</h2>
            <p style={sectionDesc}>보호자 이름, 이메일, 비밀번호를 순서대로 입력해주세요.</p>

            <div style={guardianFormStyle}>
              <input
                type="text"
                placeholder="보호자 이름"
                style={input}
                value={guardianAccount.name}
                onChange={event =>
                  setGuardianAccount(prev => ({ ...prev, name: event.target.value }))
                }
              />
              <div style={inlineFieldStyle}>
                <input
                  type="email"
                  placeholder="이메일"
                  style={inlineFieldInputStyle}
                  value={guardianAccount.email}
                  onChange={event =>
                    setGuardianAccount(prev => ({ ...prev, email: event.target.value }))
                  }
                />
                <button
                  type="button"
                  style={
                    isCheckingGuardianEmail
                      ? { ...secondaryButton, width: '112px', height: '52px', opacity: 0.7 }
                      : { ...secondaryButton, width: '112px', height: '52px' }
                  }
                  onClick={() => void checkGuardianEmail()}
                  disabled={isCheckingGuardianEmail}
                >
                  {isCheckingGuardianEmail ? '확인 중...' : '중복 확인'}
                </button>
              </div>
              {guardianEmailCheckMessage ? (
                <p
                  aria-live="polite"
                  style={
                    guardianEmailCheckMessageType === 'error'
                      ? errorMessageStyle
                      : successMessage
                  }
                >
                  {guardianEmailCheckMessage}
                </p>
              ) : isGuardianEmailChecked ? (
                <p style={successMessage}>사용 가능한 이메일입니다.</p>
              ) : null}
              <div style={passwordFieldWrapStyle}>
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder="비밀번호"
                  style={passwordInputStyle}
                  value={guardianAccount.password}
                  onChange={event =>
                    setGuardianAccount(prev => ({ ...prev, password: event.target.value }))
                  }
                />
                <button
                  type="button"
                  style={togglePasswordButtonStyle}
                  onClick={() => setIsPasswordVisible(prev => !prev)}
                >
                  {isPasswordVisible ? '숨기기' : '보기'}
                </button>
              </div>
              <div style={passwordFieldWrapStyle}>
                <input
                  type={isPasswordConfirmVisible ? 'text' : 'password'}
                  placeholder="비밀번호 확인"
                  style={passwordInputStyle}
                  value={guardianAccount.passwordConfirm}
                  onChange={event =>
                    setGuardianAccount(prev => ({
                      ...prev,
                      passwordConfirm: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  style={togglePasswordButtonStyle}
                  onClick={() => setIsPasswordConfirmVisible(prev => !prev)}
                >
                  {isPasswordConfirmVisible ? '숨기기' : '보기'}
                </button>
              </div>

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
                <button
                  type="button"
                  style={canGoToPreviousStep ? secondaryButton : { ...secondaryButton, opacity: 0.5 }}
                  onClick={goToPreviousStep}
                  disabled={!canGoToPreviousStep}
                >
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
            <p style={sectionDesc}>백엔드 루틴 API 기준으로 모든 시간대 입력이 필요합니다.</p>

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
                  보호자: {guardianAccount.name} ({normalizedGuardianEmail || guardianAccount.email})
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
                <button
                  type="button"
                  style={canGoToPreviousStep ? secondaryButton : { ...secondaryButton, opacity: 0.5 }}
                  onClick={goToPreviousStep}
                  disabled={!canGoToPreviousStep}
                >
                  이전
                </button>
                <button
                  type="button"
                  style={isSubmitting ? { ...primaryButton, opacity: 0.7 } : primaryButton}
                  onClick={() => void submitGuardianSignup()}
                  disabled={isSubmitting}
                >
                  {submitButtonLabel}
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
              보호자 계정 생성, 환자 기본 정보 저장, 루틴 설문 저장을 순차 처리하고 있습니다. 중복 제출을 막기 위해 버튼은 잠시 비활성화됩니다.
            </p>
          </div>
        ) : null}

        {currentStep === 'completed' && signupResult ? (
          <>
            <h2 style={sectionTitle}>4단계. 팀코드 생성 완료</h2>
            <p style={sectionDesc}>
              보호자 계정, 환자 기본 정보, 초기 루틴 설문 저장이 모두 완료되었습니다. 아래 팀코드를 환자에게 전달해주세요.
            </p>

            <div style={teamCodeBox}>
              <p style={{ margin: '0 0 6px', color: '#6d7f8f', fontSize: '12px' }}>생성된 팀코드</p>
              <p style={teamCodeValue}>{signupResult.teamCode}</p>
              <button type="button" style={secondaryButton} onClick={() => void copyTeamCode()}>
                팀코드 복사
              </button>
            </div>

            {copyMessage ? <p style={copyMessageStyle}>{copyMessage}</p> : null}

            <div style={buttonRow}>
              <button type="button" style={secondaryButton} onClick={goToPatientSignup}>
                환자 회원가입으로 이동
              </button>
              <button type="button" style={primaryButton} onClick={finishGuardianSignup}>
                로그인 하기
              </button>
            </div>
          </>
        ) : null}

        <div style={linkRow}>
          <Link
            to={loginEntryRoute.path}
            state={completedLoginState}
            style={textLink}
          >
            보호자 로그인
          </Link>
          <Link
            to={{
              pathname: ROUTE_PATHS.AUTH_ROLE,
              search: '?mode=signup',
            }}
            state={location.state}
            style={textLink}
          >
            역할 다시 선택
          </Link>
        </div>
      </div>
    </AuthPageFrame>
  )
}
