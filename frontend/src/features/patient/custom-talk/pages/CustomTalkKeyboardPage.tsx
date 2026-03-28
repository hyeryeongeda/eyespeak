import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { usePatientIncomingChat } from '../../../../hooks/patientIncomingChatContext'
import useReturnToTalkMainAfterDelay from '../../../../hooks/useReturnToTalkMainAfterDelay'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import KeyboardSentenceDisplay from '../components/KeyboardSentenceDisplay'
import useAutoDismissCustomTalkError from '../hooks/useAutoDismissCustomTalkError'
import { useCustomTalkStore } from '../store/customTalkStore'
import type {
  CustomTalkKeyboardOption,
  KeyboardCompositionState,
  KeyboardNavigationState,
  KeyboardRootMenu,
} from '../types'
import {
  hasPendingKeyboardComposition,
  resolveKeyboardManualInput,
} from '../utils/hangulComposer'

const centerStackStyle: CSSProperties = {
  minHeight: 0,
  height: '100%',
  padding: '12px',
  boxSizing: 'border-box',
}

const sentenceSlotStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
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

const CARD_TRACKING_IDS = [
  'custom-talk-keyboard-option-1',
  'custom-talk-keyboard-option-2',
  'custom-talk-keyboard-option-3',
  'custom-talk-keyboard-option-4',
] as const

function createEmptyCard(trackingId: KeyboardCardModel['trackingId']): KeyboardCardModel {
  return {
    title: '\ub2e4\uc2dc \uc900\ube44',
    description: '\ud604\uc7ac \uc790\ub9ac\uc5d0 \ub123\uc744 \uae30\ub2a5\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.',
    tone: 'sand',
    onSelect: () => {},
    disabled: true,
    trackingId,
  }
}

function createUtilityCard(
  trackingId: KeyboardCardModel['trackingId'],
  config: Omit<KeyboardCardModel, 'trackingId'>,
): KeyboardCardModel {
  return {
    ...config,
    trackingId,
  }
}

function getKeyboardHelperText(
  keyboardComposition: KeyboardCompositionState,
  currentRootMenu?: KeyboardRootMenu,
) {
  if (keyboardComposition.stage === 'vowel' && keyboardComposition.initialConsonant) {
    return '\ucd08\uc131\uc744 \uace8\ub790\uc2b5\ub2c8\ub2e4. \ub2e4\uc74c \ubaa8\uc74c\uc744 \uc120\ud0dd\ud574 \uc74c\uc808\uc744 \ub9cc\ub4dc\uc138\uc694.'
  }

  if (
    keyboardComposition.stage === 'final_consonant' &&
    keyboardComposition.finalConsonant
  ) {
    return '\ubc1b\uce68\uc774 \uc784\uc2dc\ub85c \uc870\ud569\ub41c \uc0c1\ud0dc\uc785\ub2c8\ub2e4. \uc790\uc74c\uc744 \ud55c \ubc88 \ub354 \ub204\ub974\uba74 \uacb9\ubc1b\uce68\uc73c\ub85c \ud655\uc7a5\ud560 \uc218 \uc788\uace0, \ubaa8\uc74c\uc744 \ub204\ub974\uba74 \ud544\uc694\ud55c \ub9cc\ud07c \ubd84\ud574\ub418\uc5b4 \ub2e4\uc74c \uc74c\uc808\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.'
  }

  if (keyboardComposition.stage === 'final_consonant') {
    return '\ubc1b\uce68\uc744 \uace0\ub974\uac70\ub098 \ubaa8\uc74c\uc744 \ud55c \ubc88 \ub354 \ub20c\ub7ec \ubcf5\ud569 \ubaa8\uc74c\uc73c\ub85c \ud655\uc7a5\ud558\uc138\uc694. \ubc1b\uce68 \uc0c1\ud0dc\uc5d0\uc11c\ub294 \uc790\uc74c\uc744 \ud55c \ubc88 \ub354 \ub20c\ub7ec \uacb9\ubc1b\uce68\uc744 \ub9cc\ub4e4 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'
  }

  if (currentRootMenu === 'ending') {
    return '\ub744\uc5b4\uc4f0\uae30\uc640 \ubb38\uc7a5\ubd80\ud638\ub97c \ubc14\ub85c \uc785\ub825\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'
  }

  if (currentRootMenu === 'number') {
    return '\uc22b\uc790\ub97c \ubc14\ub85c \ubd99\uc5ec \uc785\ub825\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'
  }

  if (currentRootMenu === 'vowel') {
    return '\ubcf5\ud569 \ubaa8\uc74c \ud398\uc774\uc9c0\uc5d0\uc11c \u3158, \u3159, \u315a, \u315d, \u315e, \u315f, \u3162\ub97c \ubc14\ub85c \uace0\ub97c \uc218 \uc788\uc2b5\ub2c8\ub2e4.'
  }

  return '\uc790\uc74c\uc744 \uace0\ub974\uace0 \ubaa8\uc74c\uc744 \uc774\uc5b4\uc11c \uc870\ud569\ud558\uc138\uc694. \ubcf5\ud569 \ubaa8\uc74c\uc740 \ubaa8\uc74c\uc744 \ud55c \ubc88 \ub354 \ub204\ub974\uac70\ub098 \ubc14\ub85c \uc120\ud0dd\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'
}

function isVowelMainPage(keyboardNavigation: KeyboardNavigationState) {
  return keyboardNavigation.currentRootMenu === 'vowel' && !keyboardNavigation.currentGroupId
}

function isComplexVowelTailPage(keyboardNavigation: KeyboardNavigationState) {
  return (
    keyboardNavigation.currentRootMenu === 'vowel' &&
    keyboardNavigation.currentGroupId === 'vowel-complex' &&
    !keyboardNavigation.canGoNext
  )
}

export default function CustomTalkKeyboardPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const dwellFeedback = useDwellFeedback<CustomTalkKeyboardTrackingId>({
    enabled: true,
  })
  const draft = useCustomTalkStore(state => state.draft)
  const keyboardStatus = useCustomTalkStore(state => state.keyboardStatus)
  const keyboardNavigation = useCustomTalkStore(state => state.keyboardNavigation)
  const keyboardComposition = useCustomTalkStore(state => state.keyboardComposition)
  const keyboardOptions = useCustomTalkStore(state => state.keyboardOptions)
  const keyboardErrorMessage = useCustomTalkStore(state => state.keyboardErrorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const mockFlags = useCustomTalkStore(state => state.mockFlags)
  const initializeKeyboard = useCustomTalkStore(state => state.initializeKeyboard)
  const selectKeyboardRootMenu = useCustomTalkStore(state => state.selectKeyboardRootMenu)
  const selectKeyboardGroup = useCustomTalkStore(state => state.selectKeyboardGroup)
  const selectKeyboardChar = useCustomTalkStore(state => state.selectKeyboardChar)
  const skipKeyboardFinalConsonant = useCustomTalkStore(
    state => state.skipKeyboardFinalConsonant,
  )
  const goKeyboardNextPage = useCustomTalkStore(state => state.goKeyboardNextPage)
  const goKeyboardBack = useCustomTalkStore(state => state.goKeyboardBack)
  const deleteLastManualChar = useCustomTalkStore(state => state.deleteLastManualChar)
  const submitManualInput = useCustomTalkStore(state => state.submitManualInput)
  const resetCustomTalkSession = useCustomTalkStore(state => state.resetCustomTalkSession)
  const hasEntrySource = Boolean(keyboardNavigation.entrySource)

  useReturnToTalkMainAfterDelay(Boolean(completionMessage), {
    onAfterNavigate: resetCustomTalkSession,
  })
  useAutoDismissCustomTalkError(keyboardErrorMessage)

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

  const displayedSentence = resolveKeyboardManualInput(
    draft.manualInput,
    keyboardComposition,
  )
  const helperText = getKeyboardHelperText(
    keyboardComposition,
    keyboardNavigation.currentRootMenu,
  )
  const hasPendingComposition = hasPendingKeyboardComposition(keyboardComposition)
  const centerStatusTone = keyboardStatus === 'loading'
    ? 'loading'
    : keyboardErrorMessage
      ? 'error'
      : completionMessage
        ? 'success'
        : 'default'
  const centerStatusLabel =
    centerStatusTone === 'loading'
      ? '불러오는 중'
      : centerStatusTone === 'error'
        ? '안내'
        : centerStatusTone === 'success'
          ? '완료'
          : undefined
  const centerStatusMessage =
    centerStatusTone === 'loading'
      ? '직접 말하기 키보드를 준비하고 있습니다.'
      : keyboardErrorMessage || completionMessage || null

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

  const handleAppendSpace = () => {
    handleSelectOption({
      id: 'keyboard-space',
      label: '\ub744\uc5b4\uc4f0\uae30',
      value: ' ',
      description: '\uacf5\ubc31\uc744 \uc785\ub825\ud569\ub2c8\ub2e4.',
      kind: 'char',
    })
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

  const isKeyboardLocked =
    keyboardStatus === 'loading' ||
    keyboardStatus === 'submitting' ||
    keyboardStatus === 'completed'
  const canSubmit =
    !isKeyboardLocked && displayedSentence.trim().length > 0 && !isInputBlocked
  const canDelete =
    !isKeyboardLocked && (draft.manualInput.length > 0 || hasPendingComposition)
  const canSkipFinalConsonant =
    !isKeyboardLocked &&
    !isInputBlocked &&
    keyboardComposition.stage === 'final_consonant' &&
    Boolean(keyboardComposition.initialConsonant) &&
    Boolean(keyboardComposition.medialVowel) &&
    !keyboardComposition.finalConsonant

  const deleteCard = createUtilityCard(CARD_TRACKING_IDS[0], {
    title: '\uc9c0\uc6b0\uae30',
    description: '\ub9c8\uc9c0\ub9c9 \uc785\ub825 \ub610\ub294 \uc870\ud569 \ub2e8\uacc4\ub97c \ub418\ub3cc\ub9bd\ub2c8\ub2e4.',
    tone: 'sky',
    onSelect: deleteLastManualChar,
    disabled: !canDelete,
  })
  const skipCard = createUtilityCard(CARD_TRACKING_IDS[0], {
    title: '\ubc1b\uce68 \uc5c6\uc774',
    description: '\ud604\uc7ac \uc74c\uc808\uc744 \ubc1b\uce68 \uc5c6\uc774 \ud655\uc815\ud569\ub2c8\ub2e4.',
    tone: 'mint',
    onSelect: skipKeyboardFinalConsonant,
    disabled: !canSkipFinalConsonant,
  })
  const submitCard = createUtilityCard(CARD_TRACKING_IDS[0], {
    title: '\ubb38\uc7a5 \ud655\uc815',
    description: '\ud604\uc7ac \uc785\ub825\ud55c \ubb38\uc7a5\uc744 \ubc14\ub85c \ubcf4\ub0c5\ub2c8\ub2e4.',
    tone: 'mint',
    onSelect: () => void submitManualInput(),
    disabled: !canSubmit,
  })

  const optionCards: KeyboardCardModel[] = keyboardOptions.map((option, index) => ({
    title: option.label,
    description: option.description ?? '\ud604\uc7ac \uc120\ud0dd\uc9c0\uc785\ub2c8\ub2e4.',
    tone: 'sand',
    onSelect: () => handleSelectOption(option),
    disabled: isKeyboardLocked || isInputBlocked || !option.value,
    trackingId: CARD_TRACKING_IDS[index] ?? CARD_TRACKING_IDS[CARD_TRACKING_IDS.length - 1],
  }))

  const utilityCards: KeyboardCardModel[] = []

  if (isVowelMainPage(keyboardNavigation)) {
    utilityCards.push(deleteCard)
  }

  if (isComplexVowelTailPage(keyboardNavigation)) {
    utilityCards.push(deleteCard)
  }

  if (
    canSkipFinalConsonant &&
    !utilityCards.some(card => card.title === skipCard.title)
  ) {
    utilityCards.push(skipCard)
  }

  if (
    !utilityCards.some(card => card.title === deleteCard.title) &&
    (canDelete || optionCards.length === 3)
  ) {
    utilityCards.push(deleteCard)
  }

  if (!utilityCards.some(card => card.title === submitCard.title) && canSubmit) {
    utilityCards.push(submitCard)
  }

  const mixedCards = [...optionCards]

  utilityCards.forEach(card => {
    if (mixedCards.length < 4) {
      mixedCards.push({
        ...card,
        trackingId: CARD_TRACKING_IDS[mixedCards.length],
      })
    }
  })

  while (mixedCards.length < 4) {
    mixedCards.push(createEmptyCard(CARD_TRACKING_IDS[mixedCards.length]))
  }

  const visibleCards = mixedCards.slice(0, 4).map((card, index) => ({
    ...card,
    trackingId: CARD_TRACKING_IDS[index],
  }))

  const actionCard =
    keyboardStatus === 'completed'
      ? {
          title: '\uc804\uc1a1 \uc644\ub8cc',
          description: '\uace7 \ub300\ud654 \ud654\uba74\uc73c\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4.',
          tone: 'mint' as const,
          onSelect: () => {},
          disabled: true,
        }
      : isVowelMainPage(keyboardNavigation)
        ? {
            title: '\ub744\uc5b4\uc4f0\uae30',
            description: '\ud604\uc7ac \uc870\ud569\uc744 \ud655\uc815\ud558\uace0 \uacf5\ubc31\uc744 \uc785\ub825\ud569\ub2c8\ub2e4.',
            tone: 'mint' as const,
            onSelect: handleAppendSpace,
            disabled: isKeyboardLocked || isInputBlocked,
          }
        : keyboardNavigation.canGoNext
          ? {
              title: '\ub2e4\uc74c',
              description: '\ub2e4\uc74c \uc120\ud0dd\uc9c0\ub97c \ubcf4\uc5ec\uc90d\ub2c8\ub2e4.',
              tone: 'mint' as const,
              onSelect: goKeyboardNextPage,
              disabled: isKeyboardLocked || isInputBlocked,
            }
          : isComplexVowelTailPage(keyboardNavigation)
            ? {
                title: '\uc9c0\uc6b0\uae30',
                description: '\ub9c8\uc9c0\ub9c9 \uc785\ub825 \ub610\ub294 \uc870\ud569 \ub2e8\uacc4\ub97c \ub418\ub3cc\ub9bd\ub2c8\ub2e4.',
                tone: 'sky' as const,
                onSelect: deleteLastManualChar,
                disabled: !canDelete,
              }
            : canSubmit
              ? {
                  title: '\ubb38\uc7a5 \ud655\uc815',
                  description: '\ud604\uc7ac \uc785\ub825\ud55c \ubb38\uc7a5\uc744 \ubc14\ub85c \ubcf4\ub0c5\ub2c8\ub2e4.',
                  tone: 'mint' as const,
                  onSelect: () => void submitManualInput(),
                  disabled: false,
                }
              : {
                  title: '\ub2e4\uc2dc \uc900\ube44',
                  description: '\ucc98\uc74c \uc120\ud0dd\uc9c0\ubd80\ud130 \ub2e4\uc2dc \ubd88\ub7ec\uc635\ub2c8\ub2e4.',
                  tone: 'mint' as const,
                  onSelect: () => void initializeKeyboard(),
                  disabled: isKeyboardLocked,
                }

  return (
    <CustomTalkEntryLayout
      title="\uc9c1\uc811 \ub9d0\ud558\uae30"
      topLeft={visibleCards[0]}
      topCenter={visibleCards[1]}
      topRight={visibleCards[2]}
      bottomLeft={visibleCards[3]}
      bottomCenter={{
        ...actionCard,
        trackingId: 'custom-talk-keyboard-action',
      }}
      bottomRight={{
        title: '\ub4a4\ub85c\uac00\uae30',
        description: '\uc774\uc804 \ub2e8\uacc4 \ub610\ub294 \ubb38\uc7a5 \ud654\uba74\uc73c\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4.',
        tone: 'slate',
        onSelect: handleBack,
        disabled: isKeyboardLocked,
        trackingId: 'custom-talk-keyboard-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <div style={sentenceSlotStyle}>
            <KeyboardSentenceDisplay
              sentence={displayedSentence}
              helperText={helperText}
              statusLabel={centerStatusLabel}
              statusMessage={centerStatusMessage}
              statusTone={centerStatusTone}
            />
          </div>
        </div>
      }
    />
  )
}
