import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkKeyboardGrid from '../components/CustomTalkKeyboardGrid'
import CustomTalkStageLayout from '../components/CustomTalkStageLayout'
import KeyboardSentenceDisplay from '../components/KeyboardSentenceDisplay'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkPanelStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import type {
  CustomTalkKeyboardOption,
  KeyboardRootMenu,
} from '../types'
import { usePatientIncomingChat } from '../../../../hooks/usePatientIncomingChat'
import { useCustomTalkStore } from '../store/customTalkStore'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: '#223247',
  fontSize: '18px',
  fontWeight: 900,
}

const sectionTextStyle: CSSProperties = {
  margin: 0,
  color: '#65778f',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.6,
}

const statusTextStyle: CSSProperties = {
  padding: '14px 16px',
  borderRadius: '18px',
  backgroundColor: '#f6f9fc',
  border: '1px solid #dde7ed',
  color: '#44566d',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1.6,
}

export default function CustomTalkKeyboardPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const draft = useCustomTalkStore(state => state.draft)
  const keyboardStatus = useCustomTalkStore(state => state.keyboardStatus)
  const keyboardNavigation = useCustomTalkStore(state => state.keyboardNavigation)
  const keyboardOptions = useCustomTalkStore(state => state.keyboardOptions)
  const keyboardErrorMessage = useCustomTalkStore(state => state.keyboardErrorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const mockFlags = useCustomTalkStore(state => state.mockFlags)
  const initializeKeyboard = useCustomTalkStore(state => state.initializeKeyboard)
  const selectKeyboardRootMenu = useCustomTalkStore(state => state.selectKeyboardRootMenu)
  const selectKeyboardGroup = useCustomTalkStore(state => state.selectKeyboardGroup)
  const selectKeyboardChar = useCustomTalkStore(state => state.selectKeyboardChar)
  const goKeyboardNextPage = useCustomTalkStore(state => state.goKeyboardNextPage)
  const goKeyboardBack = useCustomTalkStore(state => state.goKeyboardBack)
  const deleteLastManualChar = useCustomTalkStore(state => state.deleteLastManualChar)
  const submitManualInput = useCustomTalkStore(state => state.submitManualInput)

  if (!keyboardNavigation.entrySource) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  useEffect(() => {
    if (keyboardStatus === 'idle') {
      void initializeKeyboard()
    }
  }, [initializeKeyboard, keyboardStatus])

  const hasGlobalInterrupt = chat.shouldShowInterruptOverlay || chat.shouldShowReplyOverlay
  const isInputBlocked =
    !mockFlags.keyboardFaceDetected ||
    !mockFlags.keyboardTrackingStable ||
    mockFlags.keyboardUpperInterrupt ||
    hasGlobalInterrupt

  const helperText = !mockFlags.keyboardFaceDetected
    ? '얼굴이 감지되지 않아 입력이 잠시 멈춰 있습니다.'
    : !mockFlags.keyboardTrackingStable
      ? '시선 추적이 불안정해 새 입력을 잠시 멈췄습니다.'
      : mockFlags.keyboardUpperInterrupt || hasGlobalInterrupt
        ? '상위 인터럽트가 표시되어 입력이 일시 중단되었습니다.'
        : '가운데 6분할 키보드에서 4개 선택지와 다음, 뒤로를 클릭해 문장을 만듭니다.'

  const handleSelectOption = (option: CustomTalkKeyboardOption) => {
    if (isInputBlocked) {
      return
    }

    if (option.kind === 'root') {
      selectKeyboardRootMenu(option.value as KeyboardRootMenu)
      return
    }

    if (option.kind === 'group') {
      selectKeyboardGroup(option.value)
      return
    }

    selectKeyboardChar(option.value)
  }

  const handleBack = () => {
    const result = goKeyboardBack()

    if (!result.shouldExit) {
      return
    }

    navigate(
      result.entrySource === 'generated'
        ? ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED
        : ROUTE_PATHS.PATIENT_CUSTOM_TALK,
    )
  }

  return (
    <CustomTalkStageLayout
      code="PAT-CUSTOM-005"
      title="키보드 직접 입력"
      description="이 단계도 오른쪽 아래는 항상 뒤로가기입니다."
      stepLabel="6분할 시선 키보드"
      leftTop={{
        title: '한 글자 지우기',
        description: '입력 문장의 마지막 글자를 삭제합니다.',
        tone: 'sky',
        onSelect: deleteLastManualChar,
        disabled: draft.manualInput.length === 0 || keyboardStatus === 'submitting',
      }}
      leftBottom={{
        title: '문장 확정',
        description: '현재 입력한 문장을 발화로 확정합니다.',
        tone: 'sand',
        onSelect: () => void submitManualInput(),
        disabled: keyboardStatus === 'loading' || keyboardStatus === 'submitting',
      }}
      rightTop={{
        title: '키보드 다시 준비',
        description: '입력이 꼬였을 때 현재 키보드 상태를 다시 초기화합니다.',
        tone: 'mint',
        onSelect: () => void initializeKeyboard(),
        disabled: keyboardStatus === 'loading',
      }}
      rightBottom={{
        title: '뒤로가기',
        description: '이전 맞춤대화 단계로 돌아갑니다.',
        tone: 'slate',
        onSelect: handleBack,
      }}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
            previewText={draft.manualInput || '아직 입력한 문장이 없습니다.'}
          />

          <KeyboardSentenceDisplay sentence={draft.manualInput} helperText={helperText} />

          {keyboardStatus === 'loading' ? (
            <div style={customTalkLoadingNoticeStyle}>키보드 입력 화면을 준비하는 중입니다.</div>
          ) : null}
          {keyboardErrorMessage ? (
            <div style={customTalkErrorNoticeStyle}>{keyboardErrorMessage}</div>
          ) : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}

          <section style={customTalkPanelStyle}>
            <h3 style={sectionTitleStyle}>6분할 키보드</h3>
            <p style={sectionTextStyle}>
              오른쪽 위는 항상 다음, 오른쪽 아래는 항상 뒤로입니다. 나머지 4칸이 현재 단계의 선택지입니다.
            </p>
            <CustomTalkKeyboardGrid
              options={keyboardOptions}
              canGoNext={keyboardNavigation.canGoNext}
              disabled={keyboardStatus === 'loading' || keyboardStatus === 'submitting' || isInputBlocked}
              onSelectOption={handleSelectOption}
              onNext={goKeyboardNextPage}
              onBack={handleBack}
            />
          </section>

          <div style={statusTextStyle}>
            현재 상태: {keyboardStatus}
            <br />
            현재 루트: {keyboardNavigation.currentRootMenu ?? '루트 선택'}
            <br />
            현재 그룹: {keyboardNavigation.currentGroupId ?? '없음'}
            <br />
            현재 페이지: {keyboardNavigation.currentPage + 1}
          </div>
        </div>
      }
    />
  )
}
