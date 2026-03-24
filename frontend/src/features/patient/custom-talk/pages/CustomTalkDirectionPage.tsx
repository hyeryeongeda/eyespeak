import { type CSSProperties, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import type { CustomCategoryKey, CustomTalkContextSummary } from '../types'
import { usePatientIncomingChat } from '../../../../hooks/patientIncomingChatContext'
import { useCustomTalkStore } from '../store/customTalkStore'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  height: '100%',
  padding: '18px',
  boxSizing: 'border-box',
}

const noticeStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

type CustomTalkDirectionTrackingId =
  | 'custom-talk-direction-recommendation-1'
  | 'custom-talk-direction-recommendation-2'
  | 'custom-talk-direction-recommendation-3'
  | 'custom-talk-direction-recommendation-4'
  | 'custom-talk-direction-keyboard'
  | 'custom-talk-direction-back'

function pickCategory(
  visibleCategoryKeys: CustomCategoryKey[],
  candidates: CustomCategoryKey[],
  fallback: CustomCategoryKey,
) {
  return candidates.find(key => visibleCategoryKeys.includes(key)) ?? fallback
}

function ensureSentence(text?: string) {
  if (!text) {
    return undefined
  }

  const trimmed = text.trim()

  if (!trimmed) {
    return undefined
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function buildMoodSentence(todayMood?: string) {
  if (!todayMood) {
    return undefined
  }

  const normalized = todayMood.trim()

  if (!normalized) {
    return undefined
  }

  return ensureSentence(normalized.startsWith('지금') ? normalized : `지금 ${normalized}`)
}

function buildEntryRecommendationSentences(
  context: CustomTalkContextSummary | null,
  recommendedSentences: string[],
) {
  const candidates = [
    recommendedSentences[0],
    recommendedSentences[1],
    recommendedSentences[2],
    context?.frequentExpressions?.[0],
    context?.frequentExpressions?.[1],
    buildMoodSentence(context?.todayMood),
    context?.recentUsedExpressions?.[0],
    context?.recentUsedExpressions?.[1],
    '조금만 기다려 주세요.',
    '지금 조금 먹고 싶어요.',
  ]

  const seen = new Set<string>()

  return candidates
    .map(item => ensureSentence(item))
    .filter((item): item is string => Boolean(item))
    .filter(item => {
      if (seen.has(item)) {
        return false
      }

      seen.add(item)
      return true
    })
    .slice(0, 4)
}

export default function CustomTalkDirectionPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const dwellFeedback = useDwellFeedback<CustomTalkDirectionTrackingId>({
    enabled: true,
  })
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const visibleCategoryKeys = useCustomTalkStore(state => state.visibleCategoryKeys)
  const recommendedSentences = useCustomTalkStore(state => state.recommendedSentences)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const loadRecommendedSentences = useCustomTalkStore(state => state.loadRecommendedSentences)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
  const selectRecommendedSentence = useCustomTalkStore(state => state.selectRecommendedSentence)
  const startCompose = useCustomTalkStore(state => state.startCompose)

  useEffect(() => {
    void initializeCustomTalk({
      guardianMessage:
        chat.latestUnresolvedMessage?.content ?? chat.activeMessage?.content ?? undefined,
    })
  }, [
    chat.activeMessage?.content,
    chat.latestUnresolvedMessage?.content,
    initializeCustomTalk,
  ])

  const todayCategory = pickCategory(visibleCategoryKeys, ['mood', 'schedule'], 'mood')
  const entryRecommendations = buildEntryRecommendationSentences(context, recommendedSentences)
  const recommendationCards = [
    {
      sentence: entryRecommendations[0] ?? '몸이 조금 불편해요.',
      trackingId: 'custom-talk-direction-recommendation-1' as const,
    },
    {
      sentence: entryRecommendations[1] ?? '지금 조금 쉬고 싶어요.',
      trackingId: 'custom-talk-direction-recommendation-2' as const,
    },
    {
      sentence: entryRecommendations[2] ?? '조금만 물을 주세요.',
      trackingId: 'custom-talk-direction-recommendation-3' as const,
    },
    {
      sentence: entryRecommendations[3] ?? '지금 조금 먹고 싶어요.',
      trackingId: 'custom-talk-direction-recommendation-4' as const,
    },
  ]
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'

  useEffect(() => {
    selectCategory(todayCategory)
    void loadRecommendedSentences(todayCategory)
  }, [loadRecommendedSentences, selectCategory, todayCategory])

  return (
    <CustomTalkEntryLayout
      title="맞춤문장"
      topLeft={{
        title: recommendationCards[0].sentence,
        description: '추천문장으로 바로 말합니다.',
        tone: 'sand',
        onSelect: async () => {
          selectCategory(todayCategory)
          await selectRecommendedSentence(recommendationCards[0].sentence)
        },
        disabled: isBusy,
        trackingId: recommendationCards[0].trackingId,
      }}
      topCenter={{
        title: recommendationCards[1].sentence,
        description: '추천문장으로 바로 말합니다.',
        tone: 'sand',
        onSelect: async () => {
          selectCategory(todayCategory)
          await selectRecommendedSentence(recommendationCards[1].sentence)
        },
        disabled: isBusy,
        trackingId: recommendationCards[1].trackingId,
      }}
      topRight={{
        title: recommendationCards[2].sentence,
        description: '추천문장으로 바로 말합니다.',
        tone: 'sand',
        onSelect: async () => {
          selectCategory(todayCategory)
          await selectRecommendedSentence(recommendationCards[2].sentence)
        },
        disabled: isBusy,
        trackingId: recommendationCards[2].trackingId,
      }}
      bottomLeft={{
        title: recommendationCards[3].sentence,
        description: '추천문장으로 바로 말합니다.',
        tone: 'sand',
        onSelect: async () => {
          selectCategory(todayCategory)
          await selectRecommendedSentence(recommendationCards[3].sentence)
        },
        disabled: isBusy,
        trackingId: recommendationCards[3].trackingId,
      }}
      bottomCenter={{
        title: '직접말해요',
        description: '주어부터 차례로 조합해서 문장을 만듭니다.',
        tone: 'mint',
        onSelect: async () => {
          selectCategory(todayCategory)
          await startCompose()
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE)
        },
        disabled: status === 'submitting',
        trackingId: 'custom-talk-direction-keyboard',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '대화하기 메인으로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_TALK_MAIN),
        trackingId: 'custom-talk-direction-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
            mode="entry"
          />

          {status === 'loading' || status === 'refreshing' || errorMessage || completionMessage ? (
            <div style={noticeStackStyle}>
              {status === 'loading' || status === 'refreshing' ? (
                <div style={customTalkLoadingNoticeStyle}>
                  맞춤문장 대화 내용과 추천 문장을 불러오는 중입니다.
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
