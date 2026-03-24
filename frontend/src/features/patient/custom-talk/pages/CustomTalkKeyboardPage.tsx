import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import KeyboardSentenceDisplay from '../components/KeyboardSentenceDisplay'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import type {
  CustomTalkKeyboardOption,
  KeyboardRootMenu,
} from '../types'
import { usePatientIncomingChat } from '../../../../hooks/patientIncomingChatContext'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  height: '100%',
  padding: '18px',
  boxSizing: 'border-box',
}

type CustomTalkKeyboardTrackingId =
  | 'custom-talk-keyboard-option-1'
  | 'custom-talk-keyboard-option-2'
  | 'custom-talk-keyboard-option-3'
  | 'custom-talk-keyboard-option-4'
  | 'custom-talk-keyboard-action'
  | 'custom-talk-keyboard-back'

type KeyboardCardModel = {
  title: string
  description: string
  tone: 'sand' | 'sky' | 'mint' | 'slate'
  onSelect: () => void
  disabled?: boolean
  trackingId:
    | 'custom-talk-keyboard-option-1'
    | 'custom-talk-keyboard-option-2'
    | 'custom-talk-keyboard-option-3'
    | 'custom-talk-keyboard-option-4'
}

function createEmptyCard(
  trackingId: KeyboardCardModel['trackingId'],
): KeyboardCardModel {
  return {
    title: '선택 없음',
    description: '현재 표시할 항목이 없습니다.',
    tone: 'sand',
    onSelect: () => {},
    disabled: true,
    trackingId,
  }
}

export default function CustomTalkKeyboardPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const dwellFeedback = useDwellFeedback<CustomTalkKeyboardTrackingId>({
    enabled: true,
  })
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
  const hasEntrySource = Boolean(keyboardNavigation.entrySource)

  useEffect(() => {
    if (!hasEntrySource || keyboardStatus !== 'idle') {
      return
    }

    void initializeKeyboard()
  }, [hasEntrySource, initializeKeyboard, keyboardStatus])

  if (!hasEntrySource) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  const hasGlobalInterrupt = chat.shouldShowInterruptOverlay || chat.shouldShowReplyOverlay
  const isInputBlocked =
    !mockFlags.keyboardFaceDetected ||
    !mockFlags.keyboardTrackingStable ||
    mockFlags.keyboardUpperInterrupt ||
    hasGlobalInterrupt

  const helperText = !mockFlags.keyboardFaceDetected
    ? '얼굴이 감지되지 않아 입력이 잠시 멈춰 있습니다.'
    : !mockFlags.keyboardTrackingStable
      ? '시선 추적이 불안정해 입력이 잠시 멈췄습니다.'
      : mockFlags.keyboardUpperInterrupt || hasGlobalInterrupt
        ? '상위 인터럽트가 표시되어 입력이 일시 중단되었습니다.'
        : '큰 버튼 4개에서 글자나 그룹을 고르고, 아래 가운데 버튼으로 다음 또는 완료를 진행합니다.'

  const handleSelectOption = (option: CustomTalkKeyboardOption) => {
    if (isInputBlocked || !option.value) {
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
        : result.entrySource === 'compose'
          ? ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE
          : ROUTE_PATHS.PATIENT_CUSTOM_TALK,
    )
  }

  const isKeyboardBusy = keyboardStatus === 'loading' || keyboardStatus === 'submitting'
  const canSubmit = !isKeyboardBusy && draft.manualInput.trim().length > 0 && !isInputBlocked
  const canDelete = !isKeyboardBusy && draft.manualInput.length > 0

  const utilityCards: KeyboardCardModel[] = []

  if (canDelete) {
    utilityCards.push({
      title: '한 글자 지우기',
      description: '입력 문장의 마지막 글자를 삭제합니다.',
      tone: 'sky',
      onSelect: deleteLastManualChar,
      trackingId: 'custom-talk-keyboard-option-1',
    })
  }

  if (canSubmit) {
    utilityCards.push({
      title: '문장 확정',
      description: '현재 입력 문장을 바로 말합니다.',
      tone: 'mint',
      onSelect: () => void submitManualInput(),
      trackingId: 'custom-talk-keyboard-option-1',
    })
  }

  const optionCards: KeyboardCardModel[] = keyboardOptions.map((option, index) => ({
    title: option.label,
    description: option.description ?? '현재 선택지입니다.',
    tone: 'sand',
    onSelect: () => handleSelectOption(option),
    disabled: isKeyboardBusy || isInputBlocked || !option.value,
    trackingId: (
      [
        'custom-talk-keyboard-option-1',
        'custom-talk-keyboard-option-2',
        'custom-talk-keyboard-option-3',
        'custom-talk-keyboard-option-4',
      ] as const
    )[index] ?? 'custom-talk-keyboard-option-4',
  }))

  const mixedCards = [...optionCards]

  utilityCards.forEach(card => {
    if (mixedCards.length < 4) {
      mixedCards.push(card)
    }
  })

  while (mixedCards.length < 4) {
    mixedCards.push(
      createEmptyCard(
        (
          [
            'custom-talk-keyboard-option-1',
            'custom-talk-keyboard-option-2',
            'custom-talk-keyboard-option-3',
            'custom-talk-keyboard-option-4',
          ] as const
        )[mixedCards.length] ?? 'custom-talk-keyboard-option-4',
      ),
    )
  }

  const visibleCards = mixedCards.slice(0, 4).map((card, index) => ({
    ...card,
    trackingId: (
      [
        'custom-talk-keyboard-option-1',
        'custom-talk-keyboard-option-2',
        'custom-talk-keyboard-option-3',
        'custom-talk-keyboard-option-4',
      ] as const
    )[index],
  }))

  const actionCard = keyboardNavigation.canGoNext
    ? {
        title: '다음',
        description: '다음 선택지 4개를 보여줍니다.',
        tone: 'mint' as const,
        onSelect: goKeyboardNextPage,
        disabled: isKeyboardBusy || isInputBlocked,
      }
    : canSubmit
      ? {
          title: '문장 확정',
          description: '현재 입력 문장을 바로 말합니다.',
          tone: 'mint' as const,
          onSelect: () => void submitManualInput(),
          disabled: false,
        }
      : {
          title: '다시 준비',
          description: '키보드 선택지를 처음부터 다시 불러옵니다.',
          tone: 'mint' as const,
          onSelect: () => void initializeKeyboard(),
          disabled: isKeyboardBusy,
        }

  return (
    <CustomTalkEntryLayout
      title="직접말해요"
      topLeft={{
        title: visibleCards[0].title,
        description: visibleCards[0].description,
        tone: visibleCards[0].tone,
        onSelect: visibleCards[0].onSelect,
        disabled: visibleCards[0].disabled,
        trackingId: visibleCards[0].trackingId,
      }}
      topCenter={{
        title: visibleCards[1].title,
        description: visibleCards[1].description,
        tone: visibleCards[1].tone,
        onSelect: visibleCards[1].onSelect,
        disabled: visibleCards[1].disabled,
        trackingId: visibleCards[1].trackingId,
      }}
      topRight={{
        title: visibleCards[2].title,
        description: visibleCards[2].description,
        tone: visibleCards[2].tone,
        onSelect: visibleCards[2].onSelect,
        disabled: visibleCards[2].disabled,
        trackingId: visibleCards[2].trackingId,
      }}
      bottomLeft={{
        title: visibleCards[3].title,
        description: visibleCards[3].description,
        tone: visibleCards[3].tone,
        onSelect: visibleCards[3].onSelect,
        disabled: visibleCards[3].disabled,
        trackingId: visibleCards[3].trackingId,
      }}
      bottomCenter={{
        ...actionCard,
        trackingId: 'custom-talk-keyboard-action',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '이전 단계 또는 맞춤문장 화면으로 돌아갑니다.',
        tone: 'slate',
        onSelect: handleBack,
        disabled: isKeyboardBusy,
        trackingId: 'custom-talk-keyboard-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
            mode="entry"
          />

          <KeyboardSentenceDisplay
            sentence={draft.manualInput}
            helperText={helperText}
          />

          {keyboardStatus === 'loading' ? (
            <div style={customTalkLoadingNoticeStyle}>
              직접말하기 키보드를 준비하는 중입니다.
            </div>
          ) : null}
          {keyboardErrorMessage ? (
            <div style={customTalkErrorNoticeStyle}>{keyboardErrorMessage}</div>
          ) : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}
        </div>
      }
    />
  )
}
