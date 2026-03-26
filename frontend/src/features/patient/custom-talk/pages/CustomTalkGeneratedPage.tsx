import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import {
  getCustomTalkNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import { buildCustomTalkDraftPreview } from '../utils/generateCustomSentences'

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
  fontSize: 'clamp(1.2rem, 2.3vw, 2rem)',
  fontWeight: 900,
  lineHeight: 1.45,
  wordBreak: 'keep-all',
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
  const navigate = useNavigate()
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
  const hasComposeValue = Boolean(
    draft.subject || draft.object || draft.predicate || draft.punctuation,
  )
  const hasCategoryKey = Boolean(draft.categoryKey)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'
  const previewText = buildCustomTalkDraftPreview(draft)

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
        trackingId: 'custom-talk-generated-option-1',
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
        trackingId: 'custom-talk-generated-option-2',
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
        trackingId: 'custom-talk-generated-option-3',
      }}
      bottomLeft={{
        title: '키보드',
        description: '',
        tone: 'mint',
        onSelect: () => {
          openKeyboard('generated', previewText)
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
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
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE),
        disabled: isBusy,
        trackingId: 'custom-talk-generated-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <div style={sentenceDisplayStyle}>
            <p style={sentenceTextStyle}>{previewText || '조합한 문장이 여기에 표시됩니다.'}</p>
          </div>

          {status === 'loading' ? (
            <div style={customTalkLoadingNoticeStyle}>생성 문장을 준비하는 중입니다.</div>
          ) : null}
          {errorMessage ? (
            <div style={getCustomTalkNoticeStyle(errorMessage)}>{errorMessage}</div>
          ) : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}
        </div>
      }
    />
  )
}
