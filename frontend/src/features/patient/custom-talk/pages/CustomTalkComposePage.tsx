import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import useAutoDismissCustomTalkError from '../hooks/useAutoDismissCustomTalkError'
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
  height: '100%',
  minHeight: 0,
  padding: '18px',
  boxSizing: 'border-box',
}

const sentenceDisplayStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  backgroundColor: '#ffffff',
  boxShadow: '0 18px 40px rgba(63, 86, 111, 0.08)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  gap: '10px',
  padding: '20px 24px',
  textAlign: 'center',
  transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
}

const sentenceLabelStyle: CSSProperties = {
  margin: 0,
  color: '#6d7f95',
  fontSize: '0.85rem',
  fontWeight: 800,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const sentenceTextStyle: CSSProperties = {
  margin: 0,
  color: '#111827',
  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
  fontWeight: 900,
  lineHeight: 1.35,
  wordBreak: 'keep-all',
  whiteSpace: 'pre-wrap',
}

type CustomTalkComposeTrackingId =
  | 'custom-talk-compose-option-1'
  | 'custom-talk-compose-option-2'
  | 'custom-talk-compose-option-3'
  | 'custom-talk-compose-skip'
  | 'custom-talk-compose-refresh'
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
  const refreshComposeStep = useCustomTalkStore(state => state.refreshComposeStep)
  const selectComposeWord = useCustomTalkStore(state => state.selectComposeWord)
  const skipComposeStep = useCustomTalkStore(state => state.skipComposeStep)
  const goBackComposeStep = useCustomTalkStore(state => state.goBackComposeStep)
  const hasCategoryKey = Boolean(draft.categoryKey)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'
  const visibleOptions = getVisibleComposeOptions(composeOptions[composeStep])
  const composedText = buildComposedText(draft)

  useEffect(() => {
    if (!hasCategoryKey || composeOptions[composeStep].length > 0) {
      return
    }

    void refreshComposeStep(composeStep)
  }, [composeOptions, composeStep, hasCategoryKey, refreshComposeStep])
  useAutoDismissCustomTalkError(errorMessage)

  if (!hasCategoryKey) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  const centerTone = status === 'loading' || status === 'refreshing' ? 'loading' : errorMessage ? 'error' : 'default'
  const centerLabel =
    centerTone === 'loading'
      ? '불러오는 중'
      : centerTone === 'error'
        ? '안내'
        : composedText
          ? undefined
          : '문장 미리보기'
  const centerText =
    centerTone === 'loading'
      ? `${composeStepLabelMap[composeStep]} 추천을 불러오는 중입니다.`
      : errorMessage || composedText || '입력한 단어'
  const centerToneStyle: CSSProperties =
    centerTone === 'loading'
      ? {
          borderColor: '#d7e4ef',
          backgroundColor: '#f7fbff',
          boxShadow: '0 18px 40px rgba(91, 122, 155, 0.1)',
        }
      : centerTone === 'error'
        ? {
            borderColor: '#efc8c8',
            backgroundColor: '#fff5f5',
            boxShadow: '0 18px 40px rgba(178, 77, 77, 0.08)',
          }
        : {}
  const centerTextToneStyle: CSSProperties =
    centerTone === 'loading'
      ? { color: '#5f738a', fontSize: 'clamp(1.25rem, 2.4vw, 2rem)' }
      : centerTone === 'error'
        ? { color: '#a54f4f', fontSize: 'clamp(1.2rem, 2.2vw, 1.8rem)' }
        : {}
  const centerLabelToneStyle: CSSProperties =
    centerTone === 'loading'
      ? { color: '#5f738a' }
      : centerTone === 'error'
        ? { color: '#a54f4f' }
        : {}

  return (
    <CustomTalkEntryLayout
      title="직접말하기"
      topLeft={{
        title: visibleOptions[0] ?? composeStepLabelMap[composeStep],
        description: '',
        tone: 'sky',
        onSelect: async () => {
          if (!visibleOptions[0]) {
            return
          }

          const completed = await selectComposeWord(composeStep, visibleOptions[0])

          if (completed) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED)
          }
        },
        disabled: !visibleOptions[0] || isBusy,
        trackingId: 'custom-talk-compose-option-1',
      }}
      topCenter={{
        title: visibleOptions[1] ?? composeStepLabelMap[composeStep],
        description: '',
        tone: 'sand',
        onSelect: async () => {
          if (!visibleOptions[1]) {
            return
          }

          const completed = await selectComposeWord(composeStep, visibleOptions[1])

          if (completed) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED)
          }
        },
        disabled: !visibleOptions[1] || isBusy,
        trackingId: 'custom-talk-compose-option-2',
      }}
      topRight={{
        title: visibleOptions[2] ?? composeStepLabelMap[composeStep],
        description: '',
        tone: 'mint',
        onSelect: async () => {
          if (!visibleOptions[2]) {
            return
          }

          const completed = await selectComposeWord(composeStep, visibleOptions[2])

          if (completed) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED)
          }
        },
        disabled: !visibleOptions[2] || isBusy,
        trackingId: 'custom-talk-compose-option-3',
      }}
      bottomLeft={{
        title: '건너뛰기',
        description: '',
        tone: 'sand',
        onSelect: async () => {
          const completed = await skipComposeStep(composeStep)

          if (completed) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED)
          }
        },
        disabled: isBusy,
        trackingId: 'custom-talk-compose-skip',
      }}
      bottomCenter={{
        title: '새로고침',
        description: '',
        tone: 'sky',
        onSelect: () => {
          void refreshComposeStep(composeStep)
        },
        disabled: isBusy,
        trackingId: 'custom-talk-compose-refresh',
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
          <div style={{ ...sentenceDisplayStyle, ...centerToneStyle }} aria-live="polite">
            {centerLabel ? (
              <p style={{ ...sentenceLabelStyle, ...centerLabelToneStyle }}>
                {centerLabel}
              </p>
            ) : null}
            <p style={{ ...sentenceTextStyle, ...centerTextToneStyle }}>{centerText}</p>
          </div>
        </div>
      }
    />
  )
}
