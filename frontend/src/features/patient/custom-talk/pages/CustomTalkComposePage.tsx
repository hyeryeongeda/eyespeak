import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import type { ComposeStep } from '../types'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import { polishSentence } from '../utils/polishSentence'

const composeStepLabelMap: Record<ComposeStep, string> = {
  subject: '주어',
  object: '목적어',
  predicate: '서술어',
  punctuation: '종결부호',
}

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  height: '100%',
  padding: '18px',
  boxSizing: 'border-box',
  justifyContent: 'center',
}

const sentenceDisplayStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  backgroundColor: '#ffffff',
  boxShadow: '0 18px 40px rgba(63, 86, 111, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 24px',
  textAlign: 'center',
}

const sentenceTextStyle: CSSProperties = {
  margin: 0,
  color: '#111827',
  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
  fontWeight: 900,
  lineHeight: 1.35,
  wordBreak: 'keep-all',
}

type CustomTalkComposeTrackingId =
  | 'custom-talk-compose-option-1'
  | 'custom-talk-compose-option-2'
  | 'custom-talk-compose-option-3'
  | 'custom-talk-compose-skip'
  | 'custom-talk-compose-refresh'
  | 'custom-talk-compose-keyboard'
  | 'custom-talk-compose-complete'
  | 'custom-talk-compose-back'

function getVisibleComposeOptions(options: string[]) {
  return options.filter(Boolean).slice(0, 3)
}

function buildComposedText(input: {
  subject?: string
  object?: string
  predicate?: string
  punctuation?: '.' | '!' | '?' | ''
}) {
  return polishSentence(
    [input.subject, input.object, input.predicate].filter(Boolean).join(' '),
    input.punctuation ?? '',
  )
}

export default function CustomTalkComposePage() {
  const navigate = useNavigate()
  const dwellFeedback = useDwellFeedback<CustomTalkComposeTrackingId>({
    enabled: true,
  })
  const draft = useCustomTalkStore(state => state.draft)
  const composeStep = useCustomTalkStore(state => state.composeStep)
  const composeOptions = useCustomTalkStore(state => state.composeOptions)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const refreshComposeStep = useCustomTalkStore(state => state.refreshComposeStep)
  const selectComposeWord = useCustomTalkStore(state => state.selectComposeWord)
  const skipComposeStep = useCustomTalkStore(state => state.skipComposeStep)
  const goBackComposeStep = useCustomTalkStore(state => state.goBackComposeStep)
  const submitComposedSentence = useCustomTalkStore(state => state.submitComposedSentence)
  const openKeyboard = useCustomTalkStore(state => state.openKeyboard)
  const hasCategoryKey = Boolean(draft.categoryKey)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'
  const visibleOptions = getVisibleComposeOptions(composeOptions[composeStep])
  const composedText = buildComposedText(draft)
  const isPunctuationStep = composeStep === 'punctuation'

  useEffect(() => {
    if (!hasCategoryKey || composeOptions[composeStep].length > 0) {
      return
    }

    void refreshComposeStep(composeStep)
  }, [composeOptions, composeStep, hasCategoryKey, refreshComposeStep])

  if (!hasCategoryKey) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  return (
    <CustomTalkEntryLayout
      title="직접말하기"
      topLeft={{
        title: visibleOptions[0] ?? composeStepLabelMap[composeStep],
        description: '',
        tone: 'sky',
        onSelect: () => {
          if (visibleOptions[0]) {
            void selectComposeWord(composeStep, visibleOptions[0])
          }
        },
        disabled: !visibleOptions[0] || isBusy,
        trackingId: 'custom-talk-compose-option-1',
      }}
      topCenter={{
        title: visibleOptions[1] ?? composeStepLabelMap[composeStep],
        description: '',
        tone: 'sand',
        onSelect: () => {
          if (visibleOptions[1]) {
            void selectComposeWord(composeStep, visibleOptions[1])
          }
        },
        disabled: !visibleOptions[1] || isBusy,
        trackingId: 'custom-talk-compose-option-2',
      }}
      topRight={{
        title: visibleOptions[2] ?? composeStepLabelMap[composeStep],
        description: '',
        tone: 'mint',
        onSelect: () => {
          if (visibleOptions[2]) {
            void selectComposeWord(composeStep, visibleOptions[2])
          }
        },
        disabled: !visibleOptions[2] || isBusy,
        trackingId: 'custom-talk-compose-option-3',
      }}
      bottomLeft={{
        title: isPunctuationStep ? '문장 끝' : '건너뛰기',
        description: '',
        tone: 'sand',
        onSelect: () => {
          if (isPunctuationStep) {
            void submitComposedSentence()
            return
          }

          void skipComposeStep(composeStep)
        },
        disabled: isBusy,
        trackingId: isPunctuationStep
          ? 'custom-talk-compose-complete'
          : 'custom-talk-compose-skip',
      }}
      bottomCenter={{
        title: isPunctuationStep ? '키보드' : '새로고침',
        description: '',
        tone: 'sky',
        onSelect: () => {
          if (isPunctuationStep) {
            openKeyboard('compose', composedText)
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
            return
          }

          void refreshComposeStep(composeStep)
        },
        disabled: isBusy,
        trackingId: isPunctuationStep
          ? 'custom-talk-compose-keyboard'
          : 'custom-talk-compose-refresh',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '',
        tone: 'slate',
        onSelect: () => {
          const previousStep = goBackComposeStep()

          if (!previousStep) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK)
          }
        },
        disabled: status === 'submitting',
        trackingId: 'custom-talk-compose-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <div style={sentenceDisplayStyle}>
            <p style={sentenceTextStyle}>{composedText || '입력한 단어'}</p>
          </div>

          {status === 'loading' || status === 'refreshing' ? (
            <div style={customTalkLoadingNoticeStyle}>
              {composeStepLabelMap[composeStep]} 추천을 불러오는 중입니다.
            </div>
          ) : null}
          {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}
        </div>
      }
    />
  )
}
