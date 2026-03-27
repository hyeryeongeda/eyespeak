import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import useReturnToTalkMainAfterDelay from '../../../../hooks/useReturnToTalkMainAfterDelay'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkGuardianPromptLayout from '../components/CustomTalkGuardianPromptLayout'
import {
  getCustomTalkNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import { filterSelectableRecommendedSentences } from '../utils/recommendedSentenceGuards'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  height: '100%',
}

const promptPanelSlotStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
}

const noticeStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  flexShrink: 0,
}

function getVisibleSentences(sentences: string[]) {
  return filterSelectableRecommendedSentences(sentences).slice(0, 3)
}

type CustomTalkRecommendTrackingId =
  | 'custom-talk-recommend-option-1'
  | 'custom-talk-recommend-option-2'
  | 'custom-talk-recommend-option-3'
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
  const resetCustomTalkSession = useCustomTalkStore(state => state.resetCustomTalkSession)
  const hasCategoryKey = Boolean(draft.categoryKey)
  const isActionLocked =
    status === 'loading' ||
    status === 'refreshing' ||
    status === 'submitting' ||
    status === 'completed'
  const isRecommendationLoading = status === 'loading' || status === 'refreshing'

  useReturnToTalkMainAfterDelay(Boolean(completionMessage), {
    onAfterNavigate: resetCustomTalkSession,
  })

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
    <CustomTalkGuardianPromptLayout
      title="보호자 선발화-답변"
      topLeft={{
        title: visibleSentences[0] ?? '추천 문장 준비 중',
        tone: 'sky',
        onSelect: () => {
          if (visibleSentences[0]) {
            void selectRecommendedSentence(visibleSentences[0])
          }
        },
        disabled: !visibleSentences[0] || isActionLocked,
        loading: isRecommendationLoading && !visibleSentences[0],
        loadingLabel: 'AI 추천 생성 중',
        trackingId: 'custom-talk-recommend-option-1',
      }}
      topRight={{
        title: visibleSentences[1] ?? '추천 문장 준비 중',
        tone: 'mint',
        onSelect: () => {
          if (visibleSentences[1]) {
            void selectRecommendedSentence(visibleSentences[1])
          }
        },
        disabled: !visibleSentences[1] || isActionLocked,
        loading: isRecommendationLoading && !visibleSentences[1],
        loadingLabel: 'AI 추천 생성 중',
        trackingId: 'custom-talk-recommend-option-2',
      }}
      bottomLeft={{
        title: visibleSentences[2] ?? '추천 문장 준비 중',
        tone: 'sand',
        onSelect: () => {
          if (visibleSentences[2]) {
            void selectRecommendedSentence(visibleSentences[2])
          }
        },
        disabled: !visibleSentences[2] || isActionLocked,
        loading: isRecommendationLoading && !visibleSentences[2],
        loadingLabel: 'AI 추천 생성 중',
        trackingId: 'custom-talk-recommend-option-3',
      }}
      bottomRight={{
        title: '뒤로가기',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK),
        trackingId: 'custom-talk-recommend-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <div style={promptPanelSlotStyle}>
            <CustomTalkContextPanel
              context={context}
              conversationLog={conversationLog}
              mode="entry"
            />
          </div>

          {status === 'loading' || errorMessage || completionMessage ? (
            <div style={noticeStackStyle}>
              {status === 'loading' ? (
                <div style={customTalkLoadingNoticeStyle}>
                  추천 문장을 불러오는 중입니다.
                </div>
              ) : null}
              {errorMessage ? (
                <div style={getCustomTalkNoticeStyle(errorMessage)}>{errorMessage}</div>
              ) : null}
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
