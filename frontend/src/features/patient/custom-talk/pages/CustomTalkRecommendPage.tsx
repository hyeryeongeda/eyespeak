import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import useReturnToTalkMainAfterDelay from '../../shared/hooks/useReturnToTalkMainAfterDelay'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import useAutoDismissCustomTalkError from '../hooks/useAutoDismissCustomTalkError'
import { useCustomTalkStore } from '../store/customTalkStore'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import usePatientNavigateWithFeedback from '../../input/hooks/usePatientNavigateWithFeedback'
import { filterSelectableRecommendedSentences } from '../utils/recommendedSentenceGuards'

function getVisibleSentences(sentences: string[]) {
  return filterSelectableRecommendedSentences(sentences).slice(0, 3)
}

type CustomTalkRecommendTrackingId =
  | 'custom-talk-recommend-option-1'
  | 'custom-talk-recommend-option-2'
  | 'custom-talk-recommend-option-3'
  | 'custom-talk-recommend-compose'
  | 'custom-talk-recommend-keyboard'
  | 'custom-talk-recommend-back'

export default function CustomTalkRecommendPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
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
  const openKeyboard = useCustomTalkStore(state => state.openKeyboard)
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
  useAutoDismissCustomTalkError(errorMessage)

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
  const centerStatusTone = isRecommendationLoading
    ? 'loading'
    : errorMessage
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
  const centerStatusMessage = isRecommendationLoading
    ? '추천 문장을 불러오는 중입니다.'
    : errorMessage || completionMessage || null

  const handleStartCompose = async () => {
    await startCompose()
    navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE)
  }

  const handleOpenKeyboard = () => {
    openKeyboard('recommend')
    navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
  }

  return (
    <CustomTalkEntryLayout
      title="추천문장"
      topLeft={{
        title: visibleSentences[0] ?? '추천 문장 준비 중',
        description: '',
        tone: 'sand',
        onSelect: () => {
          if (visibleSentences[0]) {
            void selectRecommendedSentence(visibleSentences[0])
          }
        },
        disabled: !visibleSentences[0] || isActionLocked,
        loading: isRecommendationLoading && !visibleSentences[0],
        loadingLabel: 'AI 추천 생성 중',
        trackingId: 'custom-talk-recommend-option-1',
        confirmUntilTts: true,
      }}
      topCenter={{
        title: visibleSentences[1] ?? '추천 문장 준비 중',
        description: '',
        tone: 'sky',
        onSelect: () => {
          if (visibleSentences[1]) {
            void selectRecommendedSentence(visibleSentences[1])
          }
        },
        disabled: !visibleSentences[1] || isActionLocked,
        loading: isRecommendationLoading && !visibleSentences[1],
        loadingLabel: 'AI 추천 생성 중',
        trackingId: 'custom-talk-recommend-option-2',
        confirmUntilTts: true,
      }}
      topRight={{
        title: visibleSentences[2] ?? '추천 문장 준비 중',
        description: '',
        tone: 'slate',
        onSelect: () => {
          if (visibleSentences[2]) {
            void selectRecommendedSentence(visibleSentences[2])
          }
        },
        disabled: !visibleSentences[2] || isActionLocked,
        loading: isRecommendationLoading && !visibleSentences[2],
        loadingLabel: 'AI 추천 생성 중',
        trackingId: 'custom-talk-recommend-option-3',
        confirmUntilTts: true,
      }}
      bottomLeft={{
        title: '형태소 말하기',
        description: '',
        tone: 'sand',
        onSelect: () => {
          void handleStartCompose()
        },
        disabled: isActionLocked,
        trackingId: 'custom-talk-recommend-compose',
      }}
      bottomCenter={{
        title: '직접 말해요',
        description: '',
        tone: 'mint',
        onSelect: handleOpenKeyboard,
        disabled: isActionLocked,
        trackingId: 'custom-talk-recommend-keyboard',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '카테고리 선택 화면으로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK),
        trackingId: 'custom-talk-recommend-back',
      }}
      dwellFeedback={dwellFeedback}
      gridTemplateRows="minmax(0, 1fr) minmax(72px, 0.28fr) minmax(0, 1fr)"
      centerChildren={
        <CustomTalkContextPanel
          context={context}
          conversationLog={conversationLog}
          mode="entry"
          statusLabel={centerStatusLabel}
          statusMessage={centerStatusMessage}
          statusTone={centerStatusTone}
        />
      }
    />
  )
}
