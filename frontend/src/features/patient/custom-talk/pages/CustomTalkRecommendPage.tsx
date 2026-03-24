import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const noticeStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

function getVisibleSentences(sentences: string[]) {
  const fallbackSentences = [
    '추천 문장을 다시 준비하고 있습니다.',
    '잠시 후 다시 선택해 주세요.',
    '원하는 문장이 없으면 형태소 조합으로 이어갈 수 있습니다.',
  ]
  const visible = [...sentences]

  fallbackSentences.forEach(sentence => {
    if (visible.length < 3 && !visible.includes(sentence)) {
      visible.push(sentence)
    }
  })

  return visible.slice(0, 3)
}

type CustomTalkRecommendTrackingId =
  | 'custom-talk-recommend-option-1'
  | 'custom-talk-recommend-option-2'
  | 'custom-talk-recommend-option-3'
  | 'custom-talk-recommend-compose'
  | 'custom-talk-recommend-refresh'
  | 'custom-talk-recommend-back'

export default function CustomTalkRecommendPage() {
  const navigate = useNavigate()
  const dwellFeedback = useDwellFeedback<CustomTalkRecommendTrackingId>({
    enabled: true,
  })
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const draft = useCustomTalkStore(state => state.draft)
  const recommendedSentences = useCustomTalkStore(state => state.recommendedSentences)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const loadRecommendedSentences = useCustomTalkStore(state => state.loadRecommendedSentences)
  const selectRecommendedSentence = useCustomTalkStore(state => state.selectRecommendedSentence)
  const startCompose = useCustomTalkStore(state => state.startCompose)
  const hasCategoryKey = Boolean(draft.categoryKey)
  const isActionLocked =
    status === 'loading' || status === 'refreshing' || status === 'submitting'

  useEffect(() => {
    if (!hasCategoryKey || recommendedSentences.length > 0) {
      return
    }

    void loadRecommendedSentences(draft.categoryKey)
  }, [draft.categoryKey, hasCategoryKey, loadRecommendedSentences, recommendedSentences.length])

  if (!hasCategoryKey) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  const visibleSentences = getVisibleSentences(recommendedSentences)

  return (
    <CustomTalkEntryLayout
      title="추천 문장 선택"
      topLeft={{
        title: visibleSentences[0] ?? '추천 문장 준비 중',
        description: '이 문장으로 바로 답변합니다.',
        tone: 'sky',
        onSelect: () => {
          if (visibleSentences[0]) {
            void selectRecommendedSentence(visibleSentences[0])
          }
        },
        disabled: !visibleSentences[0] || isActionLocked,
        trackingId: 'custom-talk-recommend-option-1',
      }}
      topCenter={{
        title: visibleSentences[1] ?? '추천 문장 준비 중',
        description: '이 문장으로 바로 답변합니다.',
        tone: 'sand',
        onSelect: () => {
          if (visibleSentences[1]) {
            void selectRecommendedSentence(visibleSentences[1])
          }
        },
        disabled: !visibleSentences[1] || isActionLocked,
        trackingId: 'custom-talk-recommend-option-2',
      }}
      topRight={{
        title: visibleSentences[2] ?? '추천 문장 준비 중',
        description: '이 문장으로 바로 답변합니다.',
        tone: 'mint',
        onSelect: () => {
          if (visibleSentences[2]) {
            void selectRecommendedSentence(visibleSentences[2])
          }
        },
        disabled: !visibleSentences[2] || isActionLocked,
        trackingId: 'custom-talk-recommend-option-3',
      }}
      bottomLeft={{
        title: '형태소로 표현하기',
        description: '추천 대신 형태소를 조합해 문장을 만듭니다.',
        tone: 'mint',
        onSelect: async () => {
          await startCompose()
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE)
        },
        disabled: isActionLocked,
        trackingId: 'custom-talk-recommend-compose',
      }}
      bottomCenter={{
        title: '다시 추천받기',
        description: '같은 카테고리에서 추천 문장을 다시 불러옵니다.',
        tone: 'sky',
        onSelect: () => {
          void loadRecommendedSentences(draft.categoryKey)
        },
        disabled: isActionLocked,
        trackingId: 'custom-talk-recommend-refresh',
      }}
      bottomRight={{
        title: '이전으로',
        description: '카테고리 선택 화면으로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK),
        trackingId: 'custom-talk-recommend-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
          />

          {status === 'loading' || errorMessage || completionMessage ? (
            <div style={noticeStackStyle}>
              {status === 'loading' ? (
                <div style={customTalkLoadingNoticeStyle}>
                  추천 문장을 불러오는 중입니다.
                </div>
              ) : null}
              {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}
              {completionMessage ? (
                <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      }
    />
  )
}
