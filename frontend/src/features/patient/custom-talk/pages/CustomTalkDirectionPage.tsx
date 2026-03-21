import { type CSSProperties, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
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

  return ensureSentence(normalized.startsWith('지금은') ? normalized : `지금은 ${normalized}`)
}

function buildQuickReplySentences(
  context: CustomTalkContextSummary | null,
  recommendedSentences: string[],
) {
  const candidates = [
    recommendedSentences[1],
    recommendedSentences[0],
    context?.frequentExpressions?.find(item => item.includes('불편')),
    buildMoodSentence(context?.todayMood),
    context?.recentUsedExpressions?.[0],
    '조금만 도와주세요.',
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
    .slice(0, 2)
}

function buildTodayCardDescription(context: CustomTalkContextSummary | null) {
  const tokens = [context?.todayMood, context?.todaySchedule].filter(
    (item): item is string => Boolean(item),
  )

  if (tokens.length === 0) {
    return '오늘 기분과 일정을 기준으로 바로 답할 문장을 추천합니다.'
  }

  return `${tokens.join(' · ')} 기준으로 추천합니다.`
}

export default function CustomTalkDirectionPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const visibleCategoryKeys = useCustomTalkStore(state => state.visibleCategoryKeys)
  const recommendedSentences = useCustomTalkStore(state => state.recommendedSentences)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const loadRecommendedSentences = useCustomTalkStore(state => state.loadRecommendedSentences)
  const refreshCategories = useCustomTalkStore(state => state.refreshCategories)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
  const selectRecommendedSentence = useCustomTalkStore(state => state.selectRecommendedSentence)
  const openKeyboard = useCustomTalkStore(state => state.openKeyboard)

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
  const quickReplies = buildQuickReplySentences(context, recommendedSentences)
  const primaryQuickReply = quickReplies[0] ?? '몸이 조금 불편해요.'
  const secondaryQuickReply = quickReplies[1] ?? '지금은 조금 피곤해요.'
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'

  useEffect(() => {
    selectCategory(todayCategory)
    void loadRecommendedSentences(todayCategory)
  }, [loadRecommendedSentences, selectCategory, todayCategory])

  return (
    <CustomTalkEntryLayout
      title="맞춤대화"
      topLeft={{
        title: '오늘 이야기',
        description: buildTodayCardDescription(context),
        tone: 'sky',
        onSelect: () => {
          selectCategory(todayCategory)
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_RECOMMEND)
        },
        disabled: isBusy,
      }}
      topCenter={{
        title: primaryQuickReply,
        description: '이 문장으로 바로 답변합니다.',
        tone: 'sand',
        onSelect: async () => {
          selectCategory(todayCategory)
          await selectRecommendedSentence(primaryQuickReply)
        },
        disabled: isBusy || !primaryQuickReply,
      }}
      topRight={{
        title: secondaryQuickReply,
        description: '이 문장으로 바로 답변합니다.',
        tone: 'sky',
        onSelect: async () => {
          selectCategory(todayCategory)
          await selectRecommendedSentence(secondaryQuickReply)
        },
        disabled: isBusy || !secondaryQuickReply,
      }}
      bottomLeft={{
        title: '키보드 직접 입력',
        description: '생성 문장 대신 직접 입력 화면으로 이동합니다.',
        tone: 'mint',
        onSelect: () => {
          openKeyboard('custom_entry')
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
        },
        disabled: status === 'submitting',
      }}
      bottomCenter={{
        title: '새로고침',
        description: '추천 방향과 맥락을 다시 불러옵니다.',
        tone: 'sand',
        onSelect: async () => {
          await refreshCategories()
          await loadRecommendedSentences(todayCategory)
        },
        disabled: isBusy,
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '대화하기 메인으로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_TALK_MAIN),
      }}
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
                  맞춤대화 맥락과 추천 문장을 불러오는 중입니다.
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
