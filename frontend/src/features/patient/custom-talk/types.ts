export type CustomCategoryKey = 'mood' | 'schedule' | 'frequent' | 'recent'

export type ComposeStep = 'subject' | 'object' | 'predicate' | 'punctuation'

export type KeyboardRootMenu = 'consonant' | 'vowel' | 'ending' | 'number'

export type KeyboardCompositionStage =
  | 'idle'
  | 'initial_consonant'
  | 'vowel'
  | 'final_consonant'

export type KeyboardStatus =
  | 'idle'
  | 'loading'
  | 'visible'
  | 'root'
  | 'group_select'
  | 'char_select'
  | 'typing'
  | 'editing'
  | 'submitting'
  | 'completed'
  | 'error'

export type CustomTalkStatus =
  | 'idle'
  | 'loading'
  | 'visible'
  | 'refreshing'
  | 'selecting'
  | 'typing'
  | 'submitting'
  | 'completed'
  | 'error'

export type KeyboardEntrySource = 'custom_entry' | 'compose' | 'generated'

export interface CustomTalkContextSummary {
  guardianMessage?: string
  recentMessages: string[]
  todayMood?: string
  todaySchedule?: string
  frequentExpressions?: string[]
  recentUsedExpressions?: string[]
}

export interface CustomTalkDraft {
  categoryKey?: CustomCategoryKey
  subject?: string
  object?: string
  predicate?: string
  punctuation?: '.' | '!' | '?' | ''
  selectedRecommendedSentence?: string
  selectedGeneratedSentence?: string
  manualInput: string
}

export interface KeyboardNavigationState {
  entrySource?: KeyboardEntrySource
  currentRootMenu?: KeyboardRootMenu
  currentGroupId?: string
  currentPage: number
  canGoNext: boolean
}

export interface KeyboardCompositionState {
  stage: KeyboardCompositionStage
  initialConsonant: string | null
  vowel: string | null
}

export interface CustomTalkCategoryOption {
  key: CustomCategoryKey
  title: string
  description: string
  hint: string
}

export interface CustomTalkConversationLogItem {
  id: string
  sender: 'guardian' | 'patient' | 'system'
  content: string
  kind: 'context' | 'utterance' | 'feedback'
  createdAt: string
}

export interface CustomTalkKeyboardOption {
  id: string
  label: string
  value: string
  description?: string
  kind: 'root' | 'group' | 'char'
}

export interface CustomTalkKeyboardGroup {
  id: string
  rootMenu: Exclude<KeyboardRootMenu, 'ending'>
  label: string
  description: string
  values: string[]
}

export interface CustomTalkKeyboardPageResult {
  options: CustomTalkKeyboardOption[]
  canGoNext: boolean
}

export interface CustomTalkMockFlags {
  failCategoryLoadOnce: boolean
  failRecommendedLoadOnce: boolean
  failComposeLoadOnce: boolean
  failComposeSaveOnce: boolean
  failGeneratedLoadOnce: boolean
  failKeyboardInitOnce: boolean
  failSubmitOnce: boolean
  keyboardFaceDetected: boolean
  keyboardTrackingStable: boolean
  keyboardUpperInterrupt: boolean
}

export interface CustomTalkState {
  isInitialized: boolean
  context: CustomTalkContextSummary | null
  conversationLog: CustomTalkConversationLogItem[]
  visibleCategories: CustomTalkCategoryOption[]
  recommendedSentences: string[]
  composeStep: ComposeStep
  composeOptions: Record<ComposeStep, string[]>
  draft: CustomTalkDraft
  generatedSentences: string[]
  keyboardStatus: KeyboardStatus
  keyboardNavigation: KeyboardNavigationState
  keyboardComposition: KeyboardCompositionState
  keyboardOptions: CustomTalkKeyboardOption[]
  status: CustomTalkStatus
  errorMessage: string | null
  keyboardErrorMessage: string | null
  completionMessage: string | null
  mockFlags: CustomTalkMockFlags
  initializeCustomTalk: (contextOverride?: Partial<CustomTalkContextSummary>) => Promise<void>
  refreshCategories: () => Promise<void>
  selectCategory: (categoryKey: CustomCategoryKey) => void
  loadRecommendedSentences: (categoryKey?: CustomCategoryKey) => Promise<void>
  selectRecommendedSentence: (text: string) => Promise<boolean>
  startCompose: () => Promise<void>
  refreshComposeStep: (step: ComposeStep) => Promise<void>
  selectComposeWord: (step: ComposeStep, value: string) => Promise<boolean>
  skipComposeStep: (step: ComposeStep) => Promise<boolean>
  goBackComposeStep: () => ComposeStep | null
  buildGeneratedSentences: () => Promise<void>
  selectGeneratedSentence: (text: string) => Promise<boolean>
  openKeyboard: (entrySource: KeyboardEntrySource, seedText?: string) => void
  initializeKeyboard: () => Promise<void>
  selectKeyboardRootMenu: (menu: KeyboardRootMenu) => void
  selectKeyboardGroup: (groupId: string) => void
  selectKeyboardChar: (value: string) => void
  skipKeyboardFinalConsonant: () => void
  goKeyboardNextPage: () => void
  goKeyboardBack: () => { shouldExit: boolean; entrySource?: KeyboardEntrySource }
  deleteLastManualChar: () => void
  submitManualInput: () => Promise<boolean>
  clearCompletionMessage: () => void
  clearErrorMessage: () => void
  resetCustomTalkSession: () => void
  triggerMockFailure: (key: keyof Pick<
    CustomTalkMockFlags,
    | 'failCategoryLoadOnce'
    | 'failRecommendedLoadOnce'
    | 'failComposeLoadOnce'
    | 'failComposeSaveOnce'
    | 'failGeneratedLoadOnce'
    | 'failKeyboardInitOnce'
    | 'failSubmitOnce'
  >) => void
  setKeyboardFaceDetected: (value: boolean) => void
  setKeyboardTrackingStable: (value: boolean) => void
  setKeyboardUpperInterrupt: (value: boolean) => void
}
