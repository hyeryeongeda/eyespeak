import { type CSSProperties, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import useReturnToTalkMainAfterDelay from '../../shared/hooks/useReturnToTalkMainAfterDelay'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import useAutoDismissCustomTalkError from '../hooks/useAutoDismissCustomTalkError'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import usePatientNavigateWithFeedback from '../../input/hooks/usePatientNavigateWithFeedback'
import { buildCustomTalkDraftPreview } from '../utils/generateCustomSentences'

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
  fontSize: 'clamp(1.2rem, 2.3vw, 2rem)',
  fontWeight: 900,
  lineHeight: 1.45,
  wordBreak: 'keep-all',
  whiteSpace: 'pre-wrap',
}

type CustomTalkGeneratedTrackingId =
  | 'custom-talk-generated-option-1'
  | 'custom-talk-generated-option-2'
  | 'custom-talk-generated-option-3'
  | 'custom-talk-generated-keyboard'
  | 'custom-talk-generated-refresh'
  | 'custom-talk-generated-back'

function getVisibleGeneratedSentences(sentences: string[]) {
  return sentences.filter(Boolean).slice(0, 3)
}

export default function CustomTalkGeneratedPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
  const dwellFeedback = useDwellFeedback<CustomTalkGeneratedTrackingId>({
    enabled: true,
  })
  const draft = useCustomTalkStore(state => state.draft)
  const generatedSentences = useCustomTalkStore(state => state.generatedSentences)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const buildGeneratedSentences = useCustomTalkStore(state => state.buildGeneratedSentences)
  const selectGeneratedSentence = useCustomTalkStore(state => state.selectGeneratedSentence)
  const openKeyboard = useCustomTalkStore(state => state.openKeyboard)
  const resetCustomTalkSession = useCustomTalkStore(state => state.resetCustomTalkSession)
  const hasComposeValue = Boolean(
    draft.subject || draft.object || draft.predicate || draft.punctuation,
  )
  const hasCategoryKey = Boolean(draft.categoryKey)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'
  const isGeneratedLoading = status === 'loading' || status === 'refreshing'
  const previewText = draft.selectedGeneratedSentence?.trim() || buildCustomTalkDraftPreview(draft)

  useReturnToTalkMainAfterDelay(Boolean(completionMessage), {
    onAfterNavigate: resetCustomTalkSession,
  })
  useAutoDismissCustomTalkError(errorMessage)

  useEffect(() => {
    if (!hasCategoryKey || !hasComposeValue || generatedSentences.length > 0) {
      return
    }

    void buildGeneratedSentences()
  }, [buildGeneratedSentences, generatedSentences.length, hasCategoryKey, hasComposeValue])

  if (!hasCategoryKey) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  if (!hasComposeValue) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE} replace />
  }

  const visibleGeneratedSentences = getVisibleGeneratedSentences(generatedSentences)
  const centerTone = isGeneratedLoading
    ? 'loading'
    : errorMessage
      ? 'error'
      : completionMessage
        ? 'success'
        : 'default'
  const centerLabel =
    centerTone === 'loading'
      ? '불러오는 중'
      : centerTone === 'error'
        ? '안내'
        : centerTone === 'success'
          ? '완료'
          : previewText
            ? undefined
            : '문장 미리보기'
  const centerText =
    centerTone === 'loading'
      ? '생성 문장을 준비하는 중입니다.'
      : errorMessage || completionMessage || previewText || '조합한 문장이 여기에 표시됩니다.'
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
        : centerTone === 'success'
          ? {
              borderColor: '#cce4d2',
              backgroundColor: '#eef8f1',
              boxShadow: '0 18px 40px rgba(63, 110, 76, 0.08)',
            }
          : {}
  const centerLabelToneStyle: CSSProperties =
    centerTone === 'loading'
      ? { color: '#5f738a' }
      : centerTone === 'error'
        ? { color: '#a54f4f' }
        : centerTone === 'success'
          ? { color: '#3f6e4c' }
          : {}
  const centerTextToneStyle: CSSProperties =
    centerTone === 'loading'
      ? { color: '#5f738a', fontSize: 'clamp(1.2rem, 2.2vw, 1.8rem)' }
      : centerTone === 'error'
        ? { color: '#a54f4f', fontSize: 'clamp(1.15rem, 2vw, 1.65rem)' }
        : centerTone === 'success'
          ? { color: '#3f6e4c', fontSize: 'clamp(1.15rem, 2vw, 1.7rem)' }
          : {}

  return (
    <CustomTalkEntryLayout
      title="생성 문장 선택"
      topLeft={{
        title: visibleGeneratedSentences[0] ?? '생성 문장 준비 중',
        description: '',
        tone: 'sky',
        onSelect: () => {
          if (visibleGeneratedSentences[0]) {
            void selectGeneratedSentence(visibleGeneratedSentences[0])
          }
        },
        disabled: !visibleGeneratedSentences[0] || isBusy,
        loading: isGeneratedLoading && !visibleGeneratedSentences[0],
        loadingLabel: 'AI 문장 생성 중',
        trackingId: 'custom-talk-generated-option-1',
        confirmUntilTts: true,
      }}
      topCenter={{
        title: visibleGeneratedSentences[1] ?? '생성 문장 준비 중',
        description: '',
        tone: 'sand',
        onSelect: () => {
          if (visibleGeneratedSentences[1]) {
            void selectGeneratedSentence(visibleGeneratedSentences[1])
          }
        },
        disabled: !visibleGeneratedSentences[1] || isBusy,
        loading: isGeneratedLoading && !visibleGeneratedSentences[1],
        loadingLabel: 'AI 문장 생성 중',
        trackingId: 'custom-talk-generated-option-2',
        confirmUntilTts: true,
      }}
      topRight={{
        title: visibleGeneratedSentences[2] ?? '생성 문장 준비 중',
        description: '',
        tone: 'mint',
        onSelect: () => {
          if (visibleGeneratedSentences[2]) {
            void selectGeneratedSentence(visibleGeneratedSentences[2])
          }
        },
        disabled: !visibleGeneratedSentences[2] || isBusy,
        loading: isGeneratedLoading && !visibleGeneratedSentences[2],
        loadingLabel: 'AI 문장 생성 중',
        trackingId: 'custom-talk-generated-option-3',
        confirmUntilTts: true,
      }}
      bottomLeft={{
        title: '키보드',
        description: '',
        tone: 'mint',
        onSelect: () => {
          openKeyboard('generated', previewText)
          navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
        },
        disabled: isBusy,
        trackingId: 'custom-talk-generated-keyboard',
      }}
      bottomCenter={{
        title: '새로고침',
        description: '',
        tone: 'sky',
        onSelect: () => {
          void buildGeneratedSentences()
        },
        disabled: isBusy,
        trackingId: 'custom-talk-generated-refresh',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '',
        tone: 'slate',
        onSelect: () => navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE),
        disabled: isBusy,
        trackingId: 'custom-talk-generated-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <div style={{ ...sentenceDisplayStyle, ...centerToneStyle }} aria-live="polite">
            {centerLabel ? (
              <p style={{ ...sentenceLabelStyle, ...centerLabelToneStyle }}>{centerLabel}</p>
            ) : null}
            <p style={{ ...sentenceTextStyle, ...centerTextToneStyle }}>{centerText}</p>
          </div>
        </div>
      }
    />
  )
}
