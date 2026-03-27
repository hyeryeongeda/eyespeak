import { type CSSProperties, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkGuardianPromptLayout from '../components/CustomTalkGuardianPromptLayout'
import { useCellMapping } from '../../input/hooks/useCellMapping'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import {
  getCustomTalkNoticeStyle,
  customTalkLoadingNoticeStyle,
} from '../components/customTalkUi'
import { createGuardianPromptCellMapping } from '../utils/customTalkGazeMapping'
import type { CustomTalkCategoryOption } from '../types'
import { usePatientIncomingChat } from '../../../../hooks/patientIncomingChatContext'
import { useCustomTalkStore } from '../store/customTalkStore'
import type { PatientChatMessage } from '../../../../types/chat'

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

type CustomTalkDirectionTrackingId =
  | 'custom-talk-direction-recommendation-1'
  | 'custom-talk-direction-recommendation-2'
  | 'custom-talk-direction-recommendation-3'
  | 'custom-talk-direction-back'

type CategoryCardModel = {
  title: string
  tone: 'sky' | 'sand' | 'mint'
  disabled: boolean
  trackingId:
    | 'custom-talk-direction-recommendation-1'
    | 'custom-talk-direction-recommendation-2'
    | 'custom-talk-direction-recommendation-3'
  category: CustomTalkCategoryOption | null
}

const CUSTOM_TALK_RECENT_MESSAGE_LIMIT = 4

function getLatestGuardianMessage(messages: PatientChatMessage[]) {
  return [...messages].reverse().find(message => message.sender === 'guardian') ?? null
}

function formatRecentMessage(message: PatientChatMessage) {
  const content = message.content.trim()

  if (!content) {
    return null
  }

  return `${message.sender}: ${content}`
}

function buildRecentMessages(
  messages: PatientChatMessage[],
  currentGuardianMessageId: string | null,
) {
  return messages
    .filter(message => message.id !== currentGuardianMessageId)
    .slice(-CUSTOM_TALK_RECENT_MESSAGE_LIMIT)
    .map(formatRecentMessage)
    .filter((message): message is string => Boolean(message))
}

function buildCategoryCards(visibleCategories: CustomTalkCategoryOption[]): CategoryCardModel[] {
  const tones = ['sky', 'mint', 'sand'] as const
  const trackingIds = [
    'custom-talk-direction-recommendation-1',
    'custom-talk-direction-recommendation-2',
    'custom-talk-direction-recommendation-3',
  ] as const

  return trackingIds.map((trackingId, index) => {
    const category = visibleCategories[index]

    if (!category) {
      return {
        title: '카테고리 준비 중',
        tone: tones[index],
        disabled: true,
        trackingId,
        category: null,
      }
    }

    return {
      title: category.title,
      tone: tones[index],
      disabled: false,
      trackingId,
      category,
    }
  })
}

export default function CustomTalkDirectionPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const dwellFeedback = useDwellFeedback<CustomTalkDirectionTrackingId>({
    enabled: true,
  })
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const visibleCategories = useCustomTalkStore(state => state.visibleCategories)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
  const currentGuardianMessage =
    chat.latestUnresolvedMessage ??
    (chat.activeMessage?.sender === 'guardian' ? chat.activeMessage : null) ??
    getLatestGuardianMessage(chat.state.messages)
  const guardianMessage = currentGuardianMessage?.content.trim() ?? ''
  const recentMessages = useMemo(
    () =>
      buildRecentMessages(
        chat.state.messages,
        currentGuardianMessage?.id ?? null,
      ),
    [chat.state.messages, currentGuardianMessage?.id],
  )

  useEffect(() => {
    void initializeCustomTalk({
      guardianMessage,
      recentMessages,
    })
  }, [
    guardianMessage,
    initializeCustomTalk,
    recentMessages,
  ])

  const categoryCards = buildCategoryCards(visibleCategories)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'
  const cellMapping = useMemo(
    () =>
      createGuardianPromptCellMapping({
        topLeft: categoryCards[0].category ? categoryCards[0].trackingId : null,
        topRight: categoryCards[1].category ? categoryCards[1].trackingId : null,
        bottomLeft: categoryCards[2].category ? categoryCards[2].trackingId : null,
        bottomRight: 'custom-talk-direction-back',
        namespace: 'custom-talk-direction',
      }),
    [categoryCards],
  )

  useCellMapping(cellMapping)

  const handleSelectCategory = (category: CustomTalkCategoryOption | null) => {
    if (!category) {
      return
    }

    selectCategory(category.key)
    navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_RECOMMEND)
  }

  return (
    <CustomTalkGuardianPromptLayout
      title="보호자 선발화-카테고리"
      topLeft={{
        title: categoryCards[0].title,
        tone: categoryCards[0].tone,
        onSelect: () => handleSelectCategory(categoryCards[0].category),
        disabled: categoryCards[0].disabled,
        commitDisabled: isBusy,
        trackingId: categoryCards[0].trackingId,
      }}
      topRight={{
        title: categoryCards[1].title,
        tone: categoryCards[1].tone,
        onSelect: () => handleSelectCategory(categoryCards[1].category),
        disabled: categoryCards[1].disabled,
        commitDisabled: isBusy,
        trackingId: categoryCards[1].trackingId,
      }}
      bottomLeft={{
        title: categoryCards[2].title,
        tone: categoryCards[2].tone,
        onSelect: () => handleSelectCategory(categoryCards[2].category),
        disabled: categoryCards[2].disabled,
        commitDisabled: isBusy,
        trackingId: categoryCards[2].trackingId,
      }}
      bottomRight={{
        title: '뒤로가기',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_TALK_MAIN),
        trackingId: 'custom-talk-direction-back',
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

          {status === 'loading' || status === 'refreshing' || errorMessage ? (
            <div style={noticeStackStyle}>
              {status === 'loading' || status === 'refreshing' ? (
                <div style={customTalkLoadingNoticeStyle}>
                  맞춤대화 카테고리를 불러오는 중입니다.
                </div>
              ) : null}
              {errorMessage ? (
                <div style={getCustomTalkNoticeStyle(errorMessage)}>{errorMessage}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      }
    />
  )
}
