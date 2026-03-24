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
  saveComposeSelection,
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
import { polishSentence } from '../utils/polishSentence'

const composeStepKeyMap: Record<
  ComposeStep,
  keyof Pick<CustomTalkDraft, 'subject' | 'object' | 'predicate' | 'punctuation'>
> = {
  subject: 'subject',
  object: 'object',
  predicate: 'predicate',
  punctuation: 'punctuation',
}

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

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function buildConversationLog(context: CustomTalkContextSummary) {
  const logs: CustomTalkConversationLogItem[] = []

  if (context.guardianMessage) {
    logs.push({
      id: 'custom-guardian-current',
      sender: 'guardian',
      content: context.guardianMessage,
      kind: 'context',
      createdAt: timestampFormatter.format(new Date()),
    })
  }

  context.recentMessages.forEach((message, index) => {
    logs.push({
      id: `custom-context-${index + 1}`,
      sender: message.startsWith('환자') ? 'patient' : 'guardian',
      content: message,
      kind: 'context',
      createdAt: timestampFormatter.format(new Date()),
    })
  })

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
  if (step === 'object') {
    if (draft.subject === undefined) {
      return undefined
    }

    return {
      subject: draft.subject,
    }
  }

  if (step === 'predicate') {
    const selectedWords: {
      subject?: string
      object?: string
    } = {}

    if (draft.subject !== undefined) {
      selectedWords.subject = draft.subject
    }

    if (draft.object !== undefined) {
      selectedWords.object = draft.object
    }

    if (selectedWords.subject === undefined && selectedWords.object === undefined) {
      return undefined
    }

    return selectedWords
  }

  return undefined
}

function buildComposedSentence(draft: CustomTalkDraft) {
  return polishSentence(
    [draft.subject, draft.object, draft.predicate].filter(Boolean).join(' '),
    draft.punctuation ?? '',
  )
}

export const useCustomTalkStore = create<CustomTalkState>((set, get) => ({
  isInitialized: false,
  context: null,
  conversationLog: [],
  visibleCategories: [],
  visibleCategoryKeys: [],
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
      conversationLog:
        state.conversationLog.length > 0
          ? state.conversationLog
          : buildConversationLog(mergedContext),
      visibleCategories,
      visibleCategoryKeys: visibleCategories.map(category => category.key),
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
        visibleCategoryKeys: visibleCategories.map(category => category.key),
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
    set(state => ({
      draft: {
        ...state.draft,
        categoryKey,
        selectedRecommendedSentence: undefined,
        selectedGeneratedSentence: undefined,
      },
      recommendedSentences: [],
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

      set(currentState => ({
        recommendedSentences,
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

      let ttsErrorMessage: string | null = null

      try {
        activeCustomTalkAudioPlayback = await playCustomTalkUtteranceTts({
          text: normalizedText,
        })
      } catch (error) {
        ttsErrorMessage = toErrorMessage(
          error,
          '문장 전송은 완료됐지만 음성 재생에 실패했습니다.',
        )
      }

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
        errorMessage: ttsErrorMessage,
        completionMessage: `추천 문장 발화를 반영했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

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
    set({
      composeStep: 'subject',
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
    const state = get()
    set({
      status: 'selecting',
      errorMessage: null,
    })

    try {
      await saveComposeSelection({
        step,
        value,
        shouldFail: state.mockFlags.failComposeSaveOnce,
      })

      const draftKey = composeStepKeyMap[step]
      const nextStep = getNextComposeStep(step)

      set(currentState => ({
        draft: {
          ...currentState.draft,
          [draftKey]: value,
        },
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
    } catch (error) {
      set(currentState => ({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '선택 내용을 저장하지 못했습니다.',
        mockFlags: {
          ...currentState.mockFlags,
          failComposeSaveOnce: false,
        },
      }))
      return false
    }
  },

  skipComposeStep: async step => {
    return get().selectComposeWord(step, '')
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

      let ttsErrorMessage: string | null = null

      try {
        activeCustomTalkAudioPlayback = await playCustomTalkUtteranceTts({
          text: normalizedText,
        })
      } catch (error) {
        ttsErrorMessage = toErrorMessage(
          error,
          '문장 전송은 완료됐지만 음성 재생에 실패했습니다.',
        )
      }

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
        errorMessage: ttsErrorMessage,
        completionMessage: `생성 문장 발화를 반영했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

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

  submitComposedSentence: async () => {
    const state = get()
    const text = buildComposedSentence(state.draft)

    if (state.status === 'submitting' || state.status === 'loading') {
      return false
    }

    if (!text) {
      set({
        status: 'error',
        errorMessage: '조합한 문장이 아직 없습니다. 주어, 목적어, 서술어를 먼저 선택해 주세요.',
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
        text,
        source: 'generated',
        shouldFail: state.mockFlags.failSubmitOnce,
      })

      let ttsErrorMessage: string | null = null

      try {
        activeCustomTalkAudioPlayback = await playCustomTalkUtteranceTts({
          text,
        })
      } catch (error) {
        ttsErrorMessage = toErrorMessage(
          error,
          '문장 전송은 완료됐지만 음성 재생에는 실패했습니다.',
        )
      }

      set(currentState => ({
        draft: {
          ...currentState.draft,
          selectedGeneratedSentence: text,
        },
        conversationLog: appendConversationLog(
          currentState.conversationLog,
          'patient',
          text,
          'utterance',
        ),
        status: 'completed',
        errorMessage: ttsErrorMessage,
        completionMessage: `조합한 문장을 발화했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

      return true
    } catch (error) {
      set(currentState => ({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : '조합한 문장 발화에 실패했습니다.',
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
        ...getRootKeyboardState(),
        keyboardNavigation: {
          ...getRootKeyboardState().keyboardNavigation,
          entrySource: currentState.keyboardNavigation.entrySource,
        },
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
      const nextPage = getKeyboardCharPage(menu, undefined, 0)

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

    const nextPage = getKeyboardGroupPage(menu, 0)

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
    const { currentRootMenu } = get().keyboardNavigation

    if (!currentRootMenu || currentRootMenu === 'ending') {
      set({
        keyboardStatus: 'error',
        keyboardErrorMessage: '문자 그룹 선택 상태가 올바르지 않습니다. 루트 메뉴로 돌아가세요.',
      })
      return
    }

    const nextPage = getKeyboardCharPage(currentRootMenu, groupId, 0)

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
    const { keyboardNavigation } = get()

    set(state => ({
      draft: {
        ...state.draft,
        manualInput: `${state.draft.manualInput}${value}`,
      },
      keyboardStatus: 'typing',
      keyboardErrorMessage: null,
    }))

    if (keyboardNavigation.currentRootMenu === 'ending') {
      // TODO: 끝표시 입력 후 루트 복귀 / 직전 상태 유지 정책 확정
      set(state => ({
        ...getRootKeyboardState(),
        keyboardNavigation: {
          ...getRootKeyboardState().keyboardNavigation,
          entrySource: state.keyboardNavigation.entrySource,
        },
      }))
    }
  },

  goKeyboardNextPage: () => {
    const { keyboardNavigation } = get()
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
        ? getKeyboardCharPage(
            keyboardNavigation.currentRootMenu,
            keyboardNavigation.currentGroupId,
            nextPageIndex,
          )
        : getKeyboardGroupPage(
            keyboardNavigation.currentRootMenu as Exclude<KeyboardRootMenu, 'ending'>,
            nextPageIndex,
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
    const { keyboardNavigation } = get()

    if (keyboardNavigation.currentGroupId) {
      const currentRootMenu = keyboardNavigation.currentRootMenu as Exclude<
        KeyboardRootMenu,
        'ending'
      >
      const nextPage = getKeyboardGroupPage(currentRootMenu, 0)

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
        ...getRootKeyboardState(),
        keyboardNavigation: {
          ...getRootKeyboardState().keyboardNavigation,
          entrySource: state.keyboardNavigation.entrySource,
        },
      }))
      return { shouldExit: false }
    }

    return {
      shouldExit: true,
      entrySource: keyboardNavigation.entrySource,
    }
  },

  deleteLastManualChar: () => {
    set(state => ({
      draft: {
        ...state.draft,
        manualInput: state.draft.manualInput.slice(0, -1),
      },
      keyboardStatus: 'editing',
      keyboardErrorMessage: null,
    }))
  },

  submitManualInput: async () => {
    const { draft, mockFlags, keyboardStatus } = get()
    const text = draft.manualInput.trim()

    if (keyboardStatus === 'loading' || keyboardStatus === 'submitting') {
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

      let ttsErrorMessage: string | null = null

      try {
        activeCustomTalkAudioPlayback = await playCustomTalkUtteranceTts({
          text,
        })
      } catch (error) {
        ttsErrorMessage = toErrorMessage(
          error,
          '문장 전송은 완료됐지만 음성 재생에 실패했습니다.',
        )
      }

      set(currentState => ({
        conversationLog: appendConversationLog(
          currentState.conversationLog,
          'patient',
          text,
          'utterance',
        ),
        keyboardStatus: 'completed',
        keyboardErrorMessage: ttsErrorMessage,
        completionMessage: `직접 입력 발화를 반영했습니다: ${text}`,
        mockFlags: {
          ...currentState.mockFlags,
          failSubmitOnce: false,
        },
      }))

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
    composeRefreshCounts.subject = 0
    composeRefreshCounts.object = 0
    composeRefreshCounts.predicate = 0
    composeRefreshCounts.punctuation = 0
    stopActiveCustomTalkAudioPlayback()

    set({
      isInitialized: false,
      context: null,
      conversationLog: [],
      visibleCategories: [],
      visibleCategoryKeys: [],
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
