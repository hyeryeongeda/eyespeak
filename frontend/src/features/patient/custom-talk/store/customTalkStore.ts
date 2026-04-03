import { create } from 'zustand'
import type {
  ComposeStep,
  CustomTalkContextSummary,
  CustomTalkConversationLogItem,
  CustomTalkDraft,
  CustomTalkMockFlags,
  CustomTalkState,
  KeyboardRootMenu,
} from '../types'
import {
  fetchCustomTalkContext,
  getNextComposeStep,
  getPreviousComposeStep,
  initializeCustomTalkKeyboard,
} from '../services/customTalkMockService'
import {
  fetchComposeWords,
  fetchGeneratedCustomSentences,
  fetchRecommendedCustomSentences,
  fetchVisibleCustomCategories,
  playCustomTalkUtteranceTts,
  submitCustomTalkUtterance,
} from '../../../../services/recommendationService'
import type { AudioPlaybackHandle } from '../../../../types/tts'
import {
  getKeyboardCharPage,
  getKeyboardGroupPage,
  getKeyboardRootPage,
} from '../utils/keyboardNavigator'
import {
  createEmptyKeyboardComposition,
  applyKeyboardConsonantSelection,
  applyKeyboardVowelSelection,
  appendKeyboardText,
  deleteKeyboardInput,
  finalizeKeyboardComposition,
  hasPendingKeyboardComposition,
  resolveKeyboardManualInput,
} from '../utils/hangulComposer'
import {
  filterSelectableRecommendedSentences,
  isBlockedRecommendedSentence,
} from '../utils/recommendedSentenceGuards'

const composeStepKeyMap: Record<
  ComposeStep,
  keyof Pick<CustomTalkDraft, 'subject' | 'object' | 'predicate' | 'punctuation'>
> = {
  subject: 'subject',
  object: 'object',
  predicate: 'predicate',
  punctuation: 'punctuation',
}

const composeStepOrder: ComposeStep[] = ['subject', 'object', 'predicate', 'punctuation']

const initialMockFlags: CustomTalkMockFlags = {
  failCategoryLoadOnce: false,
  failRecommendedLoadOnce: false,
  failComposeLoadOnce: false,
  failComposeSaveOnce: false,
  failGeneratedLoadOnce: false,
  failKeyboardInitOnce: false,
  failSubmitOnce: false,
  keyboardFaceDetected: true,
  keyboardTrackingStable: true,
  keyboardUpperInterrupt: false,
}

const initialDraft: CustomTalkDraft = {
  manualInput: '',
}

const initialComposeOptions = {
  subject: [] as string[],
  object: [] as string[],
  predicate: [] as string[],
  punctuation: [] as string[],
}

const initialKeyboardComposition = createEmptyKeyboardComposition()

const composeRefreshCounts: Record<ComposeStep, number> = {
  subject: 0,
  object: 0,
  predicate: 0,
  punctuation: 0,
}

let refreshCategoryCount = 0
let activeCustomTalkAudioPlayback: AudioPlaybackHandle | null = null
const timestampFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeStyle: 'medium',
})

function stopActiveCustomTalkAudioPlayback() {
  activeCustomTalkAudioPlayback?.cleanup()
  activeCustomTalkAudioPlayback = null
}

function logCustomTalkTtsFailure(scope: 'recommended' | 'generated' | 'manual', error: unknown) {
  console.warn(`[custom-talk] ${scope} tts failed after successful submit`, error)
}

function normalizeContextMessage(value?: string | null) {
  const content = value?.trim()
  return content ? content : null
}

function parseContextConversationMessage(message: string) {
  const trimmedMessage = normalizeContextMessage(message)

  if (!trimmedMessage) {
    return null
  }

  const guardianMatch = trimmedMessage.match(/^guardian\s*:\s*(.+)$/i)
  if (guardianMatch) {
    return {
      sender: 'guardian' as const,
      content: guardianMatch[1].trim(),
    }
  }

  const patientMatch = trimmedMessage.match(/^patient\s*:\s*(.+)$/i)
  if (patientMatch) {
    return {
      sender: 'patient' as const,
      content: patientMatch[1].trim(),
    }
  }

  return {
    sender: 'system' as const,
    content: trimmedMessage,
  }
}

function buildConversationLog(context: CustomTalkContextSummary) {
  const logs: CustomTalkConversationLogItem[] = []

  context.recentMessages.forEach((message, index) => {
    const parsedMessage = parseContextConversationMessage(message)

    if (!parsedMessage) {
      return
    }

    logs.push({
      id: `custom-context-${index + 1}`,
      sender: parsedMessage.sender,
      content: parsedMessage.content,
      kind: 'context',
      createdAt: timestampFormatter.format(new Date()),
    })
  })

  const guardianMessage = normalizeContextMessage(context.guardianMessage)
  const latestContextLog = logs[logs.length - 1]

  if (
    guardianMessage &&
    !(
      latestContextLog?.sender === 'guardian' &&
      latestContextLog.content === guardianMessage
    )
  ) {
    logs.push({
      id: 'custom-guardian-current',
      sender: 'guardian',
      content: guardianMessage,
      kind: 'context',
      createdAt: timestampFormatter.format(new Date()),
    })
  }

  return logs
}

function mergeContext(
  current: CustomTalkContextSummary | null,
  next: CustomTalkContextSummary,
): CustomTalkContextSummary {
  return {
    ...next,
    frequentExpressions: next.frequentExpressions ?? current?.frequentExpressions ?? [],
    recentUsedExpressions: next.recentUsedExpressions ?? current?.recentUsedExpressions ?? [],
  }
}

function getKeyboardRootOptions() {
  const rootPage = getKeyboardRootPage()

  return rootPage.options
}

function getKeyboardGroupPageForMenu(
  rootMenu: Exclude<KeyboardRootMenu, 'ending'>,
  page: number,
  keyboardComposition: CustomTalkState['keyboardComposition'],
) {
  return getKeyboardGroupPage(rootMenu, page, {
    composition: keyboardComposition,
  })
}

function getKeyboardCharPageForMenu(
  rootMenu: KeyboardRootMenu,
  groupId: string | undefined,
  page: number,
  keyboardComposition: CustomTalkState['keyboardComposition'],
) {
  return getKeyboardCharPage(rootMenu, groupId, page, {
    composition: keyboardComposition,
  })
}

function getRootKeyboardState() {
  return {
    keyboardStatus: 'root' as const,
    keyboardNavigation: {
      currentPage: 0,
      canGoNext: false,
    },
    keyboardOptions: getKeyboardRootOptions(),
    keyboardErrorMessage: null,
  }
}

function getRootKeyboardStateWithEntrySource(
  entrySource?: CustomTalkState['keyboardNavigation']['entrySource'],
) {
  const rootKeyboardState = getRootKeyboardState()

  return {
    ...rootKeyboardState,
    keyboardNavigation: {
      ...rootKeyboardState.keyboardNavigation,
      entrySource,
    },
  }
}

function buildVowelSelectionState(
  state: Pick<CustomTalkState, 'keyboardNavigation'>,
  keyboardCompositionOrInitial: CustomTalkState['keyboardComposition'] | string,
) {
  const keyboardComposition =
    typeof keyboardCompositionOrInitial === 'string'
      ? {
          stage: 'vowel' as const,
          initialConsonant: keyboardCompositionOrInitial,
          medialVowel: null,
          finalConsonant: null,
          vowel: null,
        }
      : keyboardCompositionOrInitial
  const nextPage = getKeyboardGroupPage('vowel', 0, {
    composition: keyboardComposition,
  })

  return {
    keyboardStatus: 'group_select' as const,
    keyboardNavigation: {
      ...state.keyboardNavigation,
      currentRootMenu: 'vowel' as const,
      currentGroupId: undefined,
      currentPage: 0,
      canGoNext: nextPage.canGoNext,
    },
    keyboardOptions: nextPage.options,
    keyboardComposition,
    keyboardErrorMessage: null,
  }
}

function buildFinalConsonantSelectionState(
  state: Pick<CustomTalkState, 'keyboardNavigation'>,
  keyboardCompositionOrInitial: CustomTalkState['keyboardComposition'] | string,
  medialVowel?: string,
) {
  const keyboardComposition =
    typeof keyboardCompositionOrInitial === 'string'
      ? {
          stage: 'final_consonant' as const,
          initialConsonant: keyboardCompositionOrInitial,
          medialVowel: medialVowel ?? null,
          finalConsonant: null,
          vowel: medialVowel ?? null,
        }
      : keyboardCompositionOrInitial
  const nextPage = getKeyboardGroupPageForMenu('consonant', 0, keyboardComposition)

  return {
    keyboardStatus: 'group_select' as const,
    keyboardNavigation: {
      ...state.keyboardNavigation,
      currentRootMenu: 'consonant' as const,
      currentGroupId: undefined,
      currentPage: 0,
      canGoNext: nextPage.canGoNext,
    },
    keyboardOptions: nextPage.options,
    keyboardComposition,
    keyboardErrorMessage: null,
  }
}

function buildKeyboardStateFromComposition(
  state: Pick<CustomTalkState, 'keyboardNavigation'>,
  keyboardComposition: CustomTalkState['keyboardComposition'],
) {
  if (
    keyboardComposition.stage === 'vowel' &&
    keyboardComposition.initialConsonant
  ) {
    return buildVowelSelectionState(state, keyboardComposition)
  }

  if (
    keyboardComposition.stage === 'final_consonant' &&
    keyboardComposition.initialConsonant &&
    keyboardComposition.medialVowel
  ) {
    return buildFinalConsonantSelectionState(state, keyboardComposition)
  }

  return {
    ...getRootKeyboardStateWithEntrySource(state.keyboardNavigation.entrySource),
    keyboardComposition,
  }
}

function buildKeyboardCharSelectionUpdate(
  state: CustomTalkState,
  value: string,
) {
  const currentRootMenu = state.keyboardNavigation.currentRootMenu

  if (!currentRootMenu) {
    return state
  }

  const currentInput = {
    confirmedText: state.draft.manualInput,
    composition: state.keyboardComposition,
  }

  if (currentRootMenu === 'consonant') {
    const nextInput = applyKeyboardConsonantSelection(currentInput, value)

    if (
      nextInput.composition.stage === 'vowel' &&
      nextInput.composition.initialConsonant
    ) {
      return {
        draft: {
          ...state.draft,
          manualInput: nextInput.confirmedText,
        },
        ...buildVowelSelectionState(state, nextInput.composition),
      }
    }

    return {
      draft: {
        ...state.draft,
        manualInput: nextInput.confirmedText,
      },
      ...buildKeyboardStateFromComposition(state, nextInput.composition),
      keyboardErrorMessage: null,
    }
  }

  if (currentRootMenu === 'vowel') {
    const nextInput = applyKeyboardVowelSelection(currentInput, value)

    return {
      draft: {
        ...state.draft,
        manualInput: nextInput.confirmedText,
      },
      ...buildKeyboardStateFromComposition(state, nextInput.composition),
      keyboardErrorMessage: null,
    }
  }

  const nextInput = appendKeyboardText(currentInput, value)

  return {
    draft: {
      ...state.draft,
      manualInput: nextInput.confirmedText,
    },
    ...getRootKeyboardStateWithEntrySource(state.keyboardNavigation.entrySource),
    keyboardComposition: nextInput.composition,
    keyboardErrorMessage: null,
  }
}

function buildSkipKeyboardFinalConsonantUpdate(state: CustomTalkState) {
  if (
    state.keyboardComposition.stage !== 'final_consonant' ||
    !state.keyboardComposition.initialConsonant ||
    !state.keyboardComposition.medialVowel ||
    state.keyboardComposition.finalConsonant
  ) {
    return state
  }

  const nextInput = finalizeKeyboardComposition({
    confirmedText: state.draft.manualInput,
    composition: state.keyboardComposition,
  })

  return {
    draft: {
      ...state.draft,
      manualInput: nextInput.confirmedText,
    },
    ...getRootKeyboardStateWithEntrySource(state.keyboardNavigation.entrySource),
    keyboardComposition: nextInput.composition,
    keyboardErrorMessage: null,
  }
}

function buildDeleteLastManualCharUpdate(state: CustomTalkState) {
  const nextInput = deleteKeyboardInput({
    confirmedText: state.draft.manualInput,
    composition: state.keyboardComposition,
  })

  if (hasPendingKeyboardComposition(nextInput.composition)) {
    return {
      draft: {
        ...state.draft,
        manualInput: nextInput.confirmedText,
      },
      ...buildKeyboardStateFromComposition(state, nextInput.composition),
      keyboardErrorMessage: null,
    }
  }

  if (hasPendingKeyboardComposition(state.keyboardComposition)) {
    return {
      draft: {
        ...state.draft,
        manualInput: nextInput.confirmedText,
      },
      ...getRootKeyboardStateWithEntrySource(state.keyboardNavigation.entrySource),
      keyboardComposition: nextInput.composition,
      keyboardErrorMessage: null,
    }
  }

  return {
    draft: {
      ...state.draft,
      manualInput: nextInput.confirmedText,
    },
    keyboardComposition: nextInput.composition,
    keyboardStatus: 'editing' as const,
    keyboardErrorMessage: null,
  }
}

function appendConversationLog(
  logs: CustomTalkConversationLogItem[],
  sender: CustomTalkConversationLogItem['sender'],
  content: string,
  kind: CustomTalkConversationLogItem['kind'],
) {
  return [
    ...logs,
    {
      id: `custom-log-${logs.length + 1}`,
      sender,
      content,
      kind,
      createdAt: timestampFormatter.format(new Date()),
    },
  ]
}

function buildSelectedWordsForStep(draft: CustomTalkDraft, step: ComposeStep) {
  const subject = draft.subject?.trim()
  const object = draft.object?.trim()

  if (step === 'object') {
    if (!subject) {
      return undefined
    }

    return {
      subject,
    }
  }

  if (step === 'predicate') {
    const selectedWords: {
      subject?: string
      object?: string
    } = {}

    if (subject) {
      selectedWords.subject = subject
    }

    if (object) {
      selectedWords.object = object
    }

    if (selectedWords.subject === undefined && selectedWords.object === undefined) {
      return undefined
    }

    return selectedWords
  }

  return undefined
}

function resetComposeRefreshCounts() {
  composeRefreshCounts.subject = 0
  composeRefreshCounts.object = 0
  composeRefreshCounts.predicate = 0
  composeRefreshCounts.punctuation = 0
}

function resetComposeRefreshCountsFrom(step: ComposeStep) {
  const startIndex = composeStepOrder.indexOf(step)

  composeStepOrder.slice(startIndex).forEach(composeStep => {
    composeRefreshCounts[composeStep] = 0
  })
}

function buildDraftWithComposeSelection(
  draft: CustomTalkDraft,
  step: ComposeStep,
  value?: string,
): CustomTalkDraft {
  const stepIndex = composeStepOrder.indexOf(step)
  const normalizedValue = value?.trim()
  const punctuationValue =
    normalizedValue === '.' || normalizedValue === '!' || normalizedValue === '?'
      ? normalizedValue
      : undefined
  const nextDraft: CustomTalkDraft = {
    ...draft,
    selectedGeneratedSentence: undefined,
  }

  composeStepOrder.slice(stepIndex).forEach(composeStep => {
    nextDraft[composeStepKeyMap[composeStep]] = undefined
  })

  if (step === 'punctuation') {
    nextDraft.punctuation = punctuationValue
  } else {
    nextDraft[composeStepKeyMap[step] as 'subject' | 'object' | 'predicate'] = normalizedValue
  }

  return nextDraft
}

function buildComposeOptionsAfterSelection(
  composeOptions: Record<ComposeStep, string[]>,
  step: ComposeStep,
) {
  const stepIndex = composeStepOrder.indexOf(step)
  const nextOptions = {
    ...composeOptions,
  }

  composeStepOrder.slice(stepIndex + 1).forEach(composeStep => {
    nextOptions[composeStep] = []
  })

  return nextOptions
}

export const useCustomTalkStore = create<CustomTalkState>((set, get) => ({
  isInitialized: false,
  context: null,
  conversationLog: [],
  visibleCategories: [],
  recommendedSentences: [],
  composeStep: 'subject',
  composeOptions: initialComposeOptions,
  draft: initialDraft,
  generatedSentences: [],
  keyboardStatus: 'idle',
  keyboardNavigation: {
    currentPage: 0,
    canGoNext: false,
  },
  keyboardComposition: initialKeyboardComposition,
  keyboardOptions: [],
  status: 'idle',
  errorMessage: null,
  keyboardErrorMessage: null,
  completionMessage: null,
  mockFlags: initialMockFlags,

  initializeCustomTalk: async contextOverride => {
    const state = get()
    set({
      status: 'loading',
      errorMessage: null,
    })

    const nextContext = await fetchCustomTalkContext(
      contextOverride ?? state.context ?? undefined,
    )
    const mergedContext = mergeContext(state.context, nextContext)
    const visibleCategories = await fetchVisibleCustomCategories({
      refreshCount: refreshCategoryCount,
      context: mergedContext,
    })

    set({
      isInitialized: true,
      context: mergedContext,
      conversationLog: buildConversationLog(mergedContext),
      visibleCategories,
      status: 'visible',
      errorMessage: null,
    })
  },

  refreshCategories: async () => {
    const { context, mockFlags } = get()
    refreshCategoryCount += 1

    set({
      status: 'refreshing',
      errorMessage: null,
    })

    try {
      const visibleCategories = await fetchVisibleCustomCategories({
        refreshCount: refreshCategoryCount,
        context,
        shouldFail: mockFlags.failCategoryLoadOnce,
      })

      set(state => ({
        visibleCategories,
        status: 'visible',
        errorMessage: null,
        mockFlags: {
          ...state.mockFlags,
          failCategoryLoadOnce: false,
        },
      }))
    } catch (error) {
      set(state => ({
        status: 'error',
        errorMessage:
          error instanceof Error
            ? error.message
            : '추천 카테고리를 다시 불러오지 못했습니다.',
        mockFlags: {
          ...state.mockFlags,
          failCategoryLoadOnce: false,
        },
      }))
    }
  },

  selectCategory: categoryKey => {
    resetComposeRefreshCounts()

    set(() => ({
      draft: {
        categoryKey,
        subject: undefined,
        object: undefined,
        predicate: undefined,
        punctuation: undefined,
        selectedRecommendedSentence: undefined,
        selectedGeneratedSentence: undefined,
        manualInput: '',
      },
      recommendedSentences: [],
      composeStep: 'subject',
      composeOptions: initialComposeOptions,
      generatedSentences: [],
      completionMessage: null,
      errorMessage: null,
    }))
  },

  loadRecommendedSentences: async categoryKey => {
    const state = get()
    const resolvedCategory = categoryKey ?? state.draft.categoryKey

    if (!resolvedCategory) {
      set({
        status: 'error',
        errorMessage: '추천 카테고리를 먼저 선택해 주세요.',
      })
      return
    }

    set({
      status: 'loading',
      errorMessage: null,
    })

    try {
      const recommendedSentences = await fetchRecommendedCustomSentences({
        categoryKey: resolvedCategory,
        shouldFail: state.mockFlags.failRecommendedLoadOnce,
        context: state.context,
      })
      const selectableRecommendedSentences =
        filterSelectableRecommendedSentences(recommendedSentences)

      set(currentState => ({
        recommendedSentences: selectableRecommendedSentences,
        status: 'visible',
        errorMessage: null,
        mockFlags: {
          ...currentState.mockFlags,
          failRecommendedLoadOnce: false,
        },
      }))
    } catch (error) {
      set(currentState => ({
        recommendedSentences: [],
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '추천 문장을 불러오지 못했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failRecommendedLoadOnce: false,
        },
      }))
    }
  },

  selectRecommendedSentence: async text => {
    const state = get()
    const normalizedText = text.trim()

    if (state.status === 'submitting' || state.status === 'loading') {
      return false
    }

    if (!normalizedText) {
      set({
        status: 'error',
        errorMessage: '전송할 문장이 비어 있습니다.',
      })
      return false
    }

    if (isBlockedRecommendedSentence(normalizedText)) {
      set({
        status: 'visible',
        errorMessage: '추천 문장이 아직 준비되지 않았습니다. 다시 추천받기 또는 형태소로 표현하기를 선택해 주세요.',
      })
      return false
    }

    set({
      status: 'submitting',
      errorMessage: null,
    })

    try {
      stopActiveCustomTalkAudioPlayback()

      await submitCustomTalkUtterance({
        text: normalizedText,
        source: 'recommended',
        shouldFail: state.mockFlags.failSubmitOnce,
      })

      set(currentState => ({
        draft: {
          ...currentState.draft,
          selectedRecommendedSentence: normalizedText,
        },
        conversationLog: appendConversationLog(
          currentState.conversationLog,
          'patient',
          normalizedText,
          'utterance',
        ),
        status: 'completed',
        errorMessage: null,
        completionMessage: `추천 문장을 발화했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      void playCustomTalkUtteranceTts({
        text: normalizedText,
      })
        .then(handle => {
          activeCustomTalkAudioPlayback = handle
        })
        .catch(error => {
          logCustomTalkTtsFailure('recommended', error)
        })

      return true
    } catch (error) {
      set(currentState => ({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '추천 문장 발화에 실패했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      return false
    }
  },

  startCompose: async () => {
    const state = get()
    resetComposeRefreshCounts()

    set({
      draft: {
        ...state.draft,
        subject: undefined,
        object: undefined,
        predicate: undefined,
        punctuation: undefined,
        selectedGeneratedSentence: undefined,
      },
      composeStep: 'subject',
      composeOptions: initialComposeOptions,
      generatedSentences: [],
      completionMessage: null,
      status: 'loading',
      errorMessage: null,
    })

    try {
      const subjectOptions = await fetchComposeWords({
        categoryKey: state.draft.categoryKey,
        step: 'subject',
        refreshCount: composeRefreshCounts.subject,
        shouldFail: state.mockFlags.failComposeLoadOnce,
      })

      set(currentState => ({
        composeOptions: {
          ...currentState.composeOptions,
          subject: subjectOptions,
        },
        status: 'visible',
        errorMessage: null,
        mockFlags: {
          ...currentState.mockFlags,
          failComposeLoadOnce: false,
        },
      }))
    } catch (error) {
      set(currentState => ({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '단어 조합 단계를 준비하지 못했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failComposeLoadOnce: false,
        },
      }))
    }
  },

  refreshComposeStep: async step => {
    const state = get()
    composeRefreshCounts[step] += 1

    set({
      status: 'refreshing',
      errorMessage: null,
    })

    try {
      const options = await fetchComposeWords({
        categoryKey: state.draft.categoryKey,
        step,
        refreshCount: composeRefreshCounts[step],
        selectedWords: buildSelectedWordsForStep(state.draft, step),
        shouldFail: state.mockFlags.failComposeLoadOnce,
      })

      set(currentState => ({
        composeOptions: {
          ...currentState.composeOptions,
          [step]: options,
        },
        status: 'visible',
        errorMessage: null,
        mockFlags: {
          ...currentState.mockFlags,
          failComposeLoadOnce: false,
        },
      }))
    } catch (error) {
      set(currentState => ({
        status: 'error',
        errorMessage:
          error instanceof Error
            ? error.message
            : '현재 단계 추천 단어를 다시 불러오지 못했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failComposeLoadOnce: false,
        },
      }))
    }
  },

  selectComposeWord: async (step, value) => {
    resetComposeRefreshCountsFrom(step)
    const nextStep = getNextComposeStep(step)

    set({
      status: 'selecting',
      errorMessage: null,
    })

    set(currentState => ({
      draft: buildDraftWithComposeSelection(currentState.draft, step, value),
      composeOptions: buildComposeOptionsAfterSelection(currentState.composeOptions, step),
      generatedSentences: [],
      completionMessage: null,
      composeStep: nextStep ?? currentState.composeStep,
      status: 'visible',
      errorMessage: null,
      mockFlags: {
        ...currentState.mockFlags,
        failComposeSaveOnce: false,
      },
    }))

    if (nextStep && get().composeOptions[nextStep].length === 0) {
      await get().refreshComposeStep(nextStep)
    }

    return nextStep === null
  },

  skipComposeStep: async step => {
    resetComposeRefreshCountsFrom(step)
    const nextStep = getNextComposeStep(step)

    set(currentState => ({
      draft: buildDraftWithComposeSelection(currentState.draft, step),
      composeOptions: buildComposeOptionsAfterSelection(currentState.composeOptions, step),
      generatedSentences: [],
      completionMessage: null,
      composeStep: nextStep ?? currentState.composeStep,
      status: 'visible',
      errorMessage: null,
      mockFlags: {
        ...currentState.mockFlags,
        failComposeSaveOnce: false,
      },
    }))

    if (nextStep && get().composeOptions[nextStep].length === 0) {
      await get().refreshComposeStep(nextStep)
    }

    return nextStep === null
  },

  goBackComposeStep: () => {
    const previousStep = getPreviousComposeStep(get().composeStep)

    if (!previousStep) {
      return null
    }

    set({
      composeStep: previousStep,
      status: 'visible',
      errorMessage: null,
    })

    return previousStep
  },

  buildGeneratedSentences: async () => {
    const state = get()
    const hasComposeValue = Boolean(
      state.draft.subject ||
        state.draft.object ||
        state.draft.predicate ||
        state.draft.punctuation,
    )

    if (!hasComposeValue) {
      set({
        status: 'error',
        errorMessage: '단어 조합 결과가 없어 생성 문장을 만들 수 없습니다.',
      })
      return
    }

    set({
      status: 'loading',
      errorMessage: null,
    })

    try {
      const generatedSentences = await fetchGeneratedCustomSentences({
        draft: state.draft,
        shouldFail: state.mockFlags.failGeneratedLoadOnce,
        context: state.context,
      })

      set(currentState => ({
        generatedSentences,
        status: 'visible',
        errorMessage: null,
        mockFlags: {
          ...currentState.mockFlags,
          failGeneratedLoadOnce: false,
        },
      }))
    } catch (error) {
      set(currentState => ({
        generatedSentences: [],
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '생성 문장을 만들지 못했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failGeneratedLoadOnce: false,
        },
      }))
    }
  },

  selectGeneratedSentence: async text => {
    const state = get()
    const normalizedText = text.trim()

    if (state.status === 'submitting' || state.status === 'loading') {
      return false
    }

    if (!normalizedText) {
      set({
        status: 'error',
        errorMessage: '전송할 문장이 비어 있습니다.',
      })
      return false
    }

    set({
      status: 'submitting',
      errorMessage: null,
    })

    try {
      stopActiveCustomTalkAudioPlayback()

      await submitCustomTalkUtterance({
        text: normalizedText,
        source: 'generated',
        shouldFail: state.mockFlags.failSubmitOnce,
      })

      set(currentState => ({
        draft: {
          ...currentState.draft,
          selectedGeneratedSentence: normalizedText,
        },
        conversationLog: appendConversationLog(
          currentState.conversationLog,
          'patient',
          normalizedText,
          'utterance',
        ),
        status: 'completed',
        errorMessage: null,
        completionMessage: `생성 문장을 발화했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      void playCustomTalkUtteranceTts({
        text: normalizedText,
      })
        .then(handle => {
          activeCustomTalkAudioPlayback = handle
        })
        .catch(error => {
          logCustomTalkTtsFailure('generated', error)
        })

      return true
    } catch (error) {
      set(currentState => ({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '생성 문장 발화에 실패했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      return false
    }
  },

  openKeyboard: (entrySource, seedText) => {
    set(state => ({
      draft: {
        ...state.draft,
        manualInput: seedText ?? '',
      },
      keyboardStatus: 'idle',
      keyboardNavigation: {
        entrySource,
        currentPage: 0,
        canGoNext: false,
      },
      keyboardComposition: initialKeyboardComposition,
      keyboardOptions: [],
      keyboardErrorMessage: null,
      completionMessage: null,
    }))
  },

  initializeKeyboard: async () => {
    const state = get()
    set({
      keyboardStatus: 'loading',
      keyboardErrorMessage: null,
    })

    try {
      await initializeCustomTalkKeyboard({
        shouldFail: state.mockFlags.failKeyboardInitOnce,
      })

      set(currentState => ({
        ...getRootKeyboardStateWithEntrySource(currentState.keyboardNavigation.entrySource),
        keyboardComposition: initialKeyboardComposition,
        mockFlags: {
          ...currentState.mockFlags,
          failKeyboardInitOnce: false,
        },
      }))
    } catch (error) {
      set(currentState => ({
        keyboardStatus: 'error',
        keyboardErrorMessage:
          error instanceof Error ? error.message : '키보드를 초기화하지 못했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failKeyboardInitOnce: false,
        },
      }))
    }
  },

  selectKeyboardRootMenu: menu => {
    if (menu === 'ending') {
      const nextPage = getKeyboardCharPageForMenu(menu, undefined, 0, get().keyboardComposition)

      if (!nextPage) {
        set({
          keyboardStatus: 'error',
          keyboardErrorMessage: '끝표시 메뉴를 열지 못했습니다.',
        })
        return
      }

      set(state => ({
        keyboardStatus: 'char_select',
        keyboardNavigation: {
          ...state.keyboardNavigation,
          currentRootMenu: menu,
          currentGroupId: undefined,
          currentPage: 0,
          canGoNext: nextPage.canGoNext,
        },
        keyboardOptions: nextPage.options,
        keyboardErrorMessage: null,
      }))
      return
    }

    const nextPage = getKeyboardGroupPageForMenu(menu, 0, get().keyboardComposition)

    set(state => ({
      keyboardStatus: 'group_select',
      keyboardNavigation: {
        ...state.keyboardNavigation,
        currentRootMenu: menu,
        currentGroupId: undefined,
        currentPage: 0,
        canGoNext: nextPage.canGoNext,
      },
      keyboardOptions: nextPage.options,
      keyboardErrorMessage: null,
    }))
  },

  selectKeyboardGroup: groupId => {
    const { keyboardComposition, keyboardNavigation } = get()
    const { currentRootMenu } = keyboardNavigation

    if (!currentRootMenu || currentRootMenu === 'ending') {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '문자 그룹 선택 상태가 올바르지 않습니다. 루트 메뉴로 돌아가세요.',
      })
      return
    }

    const nextPage = getKeyboardCharPageForMenu(
      currentRootMenu,
      groupId,
      0,
      keyboardComposition,
    )

    if (!nextPage) {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '문자 그룹 정보를 찾지 못했습니다. 다시 선택해 주세요.',
      })
      return
    }

    set(state => ({
      keyboardStatus: 'char_select',
      keyboardNavigation: {
        ...state.keyboardNavigation,
        currentGroupId: groupId,
        currentPage: 0,
        canGoNext: nextPage.canGoNext,
      },
      keyboardOptions: nextPage.options,
      keyboardErrorMessage: null,
    }))
  },

  selectKeyboardChar: value => {
    set(state => buildKeyboardCharSelectionUpdate(state, value))
  },

  skipKeyboardFinalConsonant: () => {
    set(state => buildSkipKeyboardFinalConsonantUpdate(state))
  },

  goKeyboardNextPage: () => {
    const { keyboardComposition, keyboardNavigation } = get()
    const nextPageIndex = keyboardNavigation.currentPage + 1

    if (!keyboardNavigation.currentRootMenu) {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '다음으로 이동할 메뉴가 없습니다.',
      })
      return
    }

    const nextPage =
      keyboardNavigation.currentGroupId || keyboardNavigation.currentRootMenu === 'ending'
        ? getKeyboardCharPageForMenu(
            keyboardNavigation.currentRootMenu,
            keyboardNavigation.currentGroupId,
            nextPageIndex,
            keyboardComposition,
          )
        : getKeyboardGroupPageForMenu(
            keyboardNavigation.currentRootMenu as Exclude<KeyboardRootMenu, 'ending'>,
            nextPageIndex,
            keyboardComposition,
          )

    if (!nextPage || nextPage.options.length === 0) {
      return
    }

    set(state => ({
      keyboardOptions: nextPage.options,
      keyboardNavigation: {
        ...state.keyboardNavigation,
        currentPage: nextPageIndex,
        canGoNext: nextPage.canGoNext,
      },
      keyboardStatus:
        keyboardNavigation.currentGroupId || keyboardNavigation.currentRootMenu === 'ending'
          ? 'char_select'
          : 'group_select',
    }))
  },

  goKeyboardBack: () => {
    const { keyboardComposition, keyboardNavigation } = get()

    if (keyboardNavigation.currentGroupId) {
      const currentRootMenu = keyboardNavigation.currentRootMenu as Exclude<
        KeyboardRootMenu,
        'ending'
      >
      const nextPage = getKeyboardGroupPageForMenu(
        currentRootMenu,
        0,
        keyboardComposition,
      )

      set(state => ({
        keyboardStatus: 'group_select',
        keyboardNavigation: {
          ...state.keyboardNavigation,
          currentGroupId: undefined,
          currentPage: 0,
          canGoNext: nextPage.canGoNext,
        },
        keyboardOptions: nextPage.options,
        keyboardErrorMessage: null,
      }))

      return { shouldExit: false }
    }

    if (keyboardNavigation.currentRootMenu) {
      set(state => ({
        ...getRootKeyboardStateWithEntrySource(state.keyboardNavigation.entrySource),
      }))
      return { shouldExit: false }
    }

    return {
      shouldExit: true,
      entrySource: keyboardNavigation.entrySource,
    }
  },

  deleteLastManualChar: () => {
    set(state => buildDeleteLastManualCharUpdate(state))
  },

  submitManualInput: async () => {
    const { draft, keyboardComposition, mockFlags, keyboardStatus } = get()
    const resolvedManualInput = resolveKeyboardManualInput(draft.manualInput, keyboardComposition)
    const text = resolvedManualInput.trim()

    if (
      keyboardStatus === 'loading' ||
      keyboardStatus === 'submitting' ||
      keyboardStatus === 'completed'
    ) {
      return false
    }

    if (!text) {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '입력 문장이 비어 있습니다. 먼저 문장을 입력해 주세요.',
      })
      return false
    }

    if (!mockFlags.keyboardFaceDetected) {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '얼굴이 감지되지 않아 입력을 잠시 멈춥니다.',
      })
      return false
    }

    if (!mockFlags.keyboardTrackingStable) {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '추적이 불안정해 새로운 입력을 잠시 중단합니다.',
      })
      return false
    }

    if (mockFlags.keyboardUpperInterrupt) {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '상위 인터럽트가 표시 중이라 입력을 확정할 수 없습니다.',
      })
      return false
    }

    set({
      keyboardStatus: 'submitting',
      keyboardErrorMessage: null,
    })

    try {
      stopActiveCustomTalkAudioPlayback()

      await submitCustomTalkUtterance({
        text,
        source: 'manual',
        shouldFail: mockFlags.failSubmitOnce,
      })

      set(currentState => ({
        conversationLog: appendConversationLog(
          currentState.conversationLog,
          'patient',
          text,
          'utterance',
        ),
        draft: {
          ...currentState.draft,
          manualInput: resolvedManualInput,
        },
        keyboardStatus: 'completed',
        keyboardComposition: initialKeyboardComposition,
        keyboardErrorMessage: null,
        completionMessage: `직접 입력 문장을 발화했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      void playCustomTalkUtteranceTts({
        text,
      })
        .then(handle => {
          activeCustomTalkAudioPlayback = handle
        })
        .catch(error => {
          logCustomTalkTtsFailure('manual', error)
        })

      // TODO: persist history / favorites candidate
      return true
    } catch (error) {
      set(currentState => ({
        keyboardStatus: 'error',
        keyboardErrorMessage:
          error instanceof Error ? error.message : '직접 입력 발화에 실패했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      return false
    }
  },

  clearCompletionMessage: () => {
    set({
      completionMessage: null,
    })
  },

  clearErrorMessage: () => {
    set({
      errorMessage: null,
      keyboardErrorMessage: null,
    })
  },

  resetCustomTalkSession: () => {
    refreshCategoryCount = 0
    resetComposeRefreshCounts()
    stopActiveCustomTalkAudioPlayback()

    set({
      isInitialized: false,
      context: null,
      conversationLog: [],
      visibleCategories: [],
      recommendedSentences: [],
      composeStep: 'subject',
      composeOptions: initialComposeOptions,
      draft: initialDraft,
      generatedSentences: [],
      keyboardStatus: 'idle',
      keyboardNavigation: {
        currentPage: 0,
        canGoNext: false,
      },
      keyboardOptions: [],
      status: 'idle',
      errorMessage: null,
      keyboardErrorMessage: null,
      completionMessage: null,
      mockFlags: initialMockFlags,
    })
  },

  triggerMockFailure: key => {
    set(state => ({
      mockFlags: {
        ...state.mockFlags,
        [key]: true,
      },
    }))
  },

  setKeyboardFaceDetected: value => {
    set(state => ({
      mockFlags: {
        ...state.mockFlags,
        keyboardFaceDetected: value,
      },
    }))
  },

  setKeyboardTrackingStable: value => {
    set(state => ({
      mockFlags: {
        ...state.mockFlags,
        keyboardTrackingStable: value,
      },
    }))
  },

  setKeyboardUpperInterrupt: value => {
    set(state => ({
      mockFlags: {
        ...state.mockFlags,
        keyboardUpperInterrupt: value,
      },
    }))
  },
}))
