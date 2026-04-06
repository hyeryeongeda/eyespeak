import { type CSSProperties, useEffect } from 'react'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkEntryLayout from '../components/CustomTalkEntryLayout'
import { useDwellFeedback } from '../../input/hooks/useDwellFeedback'
import usePatientNavigateWithFeedback from '../../input/hooks/usePatientNavigateWithFeedback'
import useAutoDismissCustomTalkError from '../hooks/useAutoDismissCustomTalkError'
import type { CustomTalkCategoryOption } from '../types'
import { usePatientIncomingChat } from '../../chat/context/patientIncomingChatContext'
import { useCustomTalkStore } from '../store/customTalkStore'
import type { PatientChatMessage } from '../../../../types/chat'

const promptPanelStyle: CSSProperties = {
  minHeight: 0,
  height: '100%',
  borderRadius: '22px',
  border: '1px solid rgba(220, 228, 237, 0.96)',
  backgroundColor: '#ffffff',
  boxShadow: '0 14px 32px rgba(72, 96, 124, 0.08)',
  padding: '16px 22px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
}

const promptContentStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  minHeight: 0,
}

const promptLabelStyle: CSSProperties = {
  margin: 0,
  color: '#6d7f95',
  fontSize: '0.85rem',
  fontWeight: 800,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const promptTextStyle: CSSProperties = {
  margin: 0,
  color: '#2f3742',
  fontSize: 'clamp(1rem, 1.45vw, 1.3rem)',
  fontWeight: 800,
  lineHeight: 1.45,
  wordBreak: 'keep-all',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

type CustomTalkDirectionTrackingId =
  | 'custom-talk-direction-recommendation-1'
  | 'custom-talk-direction-recommendation-2'
  | 'custom-talk-direction-recommendation-3'
  | 'custom-talk-direction-recommendation-4'
  | 'custom-talk-direction-keyboard'
  | 'custom-talk-direction-back'

type CategoryCardModel = {
  title: string
  description: string
  tone: 'sand' | 'sky' | 'slate'
  disabled: boolean
  trackingId:
    | 'custom-talk-direction-recommendation-1'
    | 'custom-talk-direction-recommendation-2'
    | 'custom-talk-direction-recommendation-3'
    | 'custom-talk-direction-recommendation-4'
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
  const tones = ['sand', 'sky', 'slate', 'sand'] as const
  const trackingIds = [
    'custom-talk-direction-recommendation-1',
    'custom-talk-direction-recommendation-2',
    'custom-talk-direction-recommendation-3',
    'custom-talk-direction-recommendation-4',
  ] as const

  return trackingIds.map((trackingId, index) => {
    const category = visibleCategories[index]

    if (!category) {
      return {
        title: '카테고리 준비 중',
        description: '추천 카테고리를 불러오고 있습니다.',
        tone: tones[index],
        disabled: true,
        trackingId,
        category: null,
      }
    }

    return {
      title: category.title,
      description: category.hint?.trim() || category.description,
      tone: tones[index],
      disabled: false,
      trackingId,
      category,
    }
  })
}

export default function CustomTalkDirectionPage() {
  const navigateWithFeedback = usePatientNavigateWithFeedback()
  const chat = usePatientIncomingChat()
  const dwellFeedback = useDwellFeedback<CustomTalkDirectionTrackingId>({
    enabled: true,
  })
  const context = useCustomTalkStore(state => state.context)
  const visibleCategories = useCustomTalkStore(state => state.visibleCategories)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
  const openKeyboard = useCustomTalkStore(state => state.openKeyboard)
  const currentGuardianMessage =
    chat.latestUnresolvedMessage ??
    (chat.activeMessage?.sender === 'guardian' ? chat.activeMessage : null) ??
    getLatestGuardianMessage(chat.state.messages)
  const guardianMessage = currentGuardianMessage?.content.trim() ?? ''
  const recentMessages = buildRecentMessages(
    chat.state.messages,
    currentGuardianMessage?.id ?? null,
  )
  const recentMessagesSignature = recentMessages.join('\n')

  useEffect(() => {
    void initializeCustomTalk({
      guardianMessage,
      recentMessages,
    })
  }, [guardianMessage, initializeCustomTalk, recentMessagesSignature])
  useAutoDismissCustomTalkError(errorMessage)

  const categoryCards = buildCategoryCards(visibleCategories)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'
  const promptText =
    guardianMessage || context?.guardianMessage?.trim() || '대화 내용을 불러오는 중입니다.'
  const isCategoryNoticeVisible = status === 'loading' || status === 'refreshing'
  const promptTone = isCategoryNoticeVisible ? 'loading' : errorMessage ? 'error' : 'default'
  const promptHeading =
    promptTone === 'loading'
      ? '불러오는 중'
      : promptTone === 'error'
        ? '안내'
        : '보호자 메시지'
  const promptDisplayText = isCategoryNoticeVisible
    ? '맞춤문장 카테고리를 불러오는 중입니다.'
    : errorMessage || promptText
  const promptPanelToneStyle: CSSProperties =
    promptTone === 'loading'
      ? {
          borderColor: '#d7e4ef',
          backgroundColor: '#f7fbff',
          boxShadow: '0 14px 32px rgba(91, 122, 155, 0.1)',
        }
      : promptTone === 'error'
        ? {
            borderColor: '#efc8c8',
            backgroundColor: '#fff5f5',
            boxShadow: '0 14px 32px rgba(178, 77, 77, 0.08)',
          }
        : {}
  const promptTextToneStyle: CSSProperties =
    promptTone === 'loading'
      ? { color: '#5f738a' }
      : promptTone === 'error'
        ? { color: '#a54f4f' }
        : {}

  const handleSelectCategory = (category: CustomTalkCategoryOption | null) => {
    if (!category) {
      return
    }

    selectCategory(category.key)
    navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK_RECOMMEND)
  }

  return (
    <CustomTalkEntryLayout
      title="맞춤문장"
      topLeft={{
        title: categoryCards[0].title,
        description: categoryCards[0].description,
        tone: categoryCards[0].tone,
        onSelect: () => handleSelectCategory(categoryCards[0].category),
        disabled: isBusy || categoryCards[0].disabled,
        trackingId: categoryCards[0].trackingId,
      }}
      topCenter={{
        title: categoryCards[1].title,
        description: categoryCards[1].description,
        tone: categoryCards[1].tone,
        onSelect: () => handleSelectCategory(categoryCards[1].category),
        disabled: isBusy || categoryCards[1].disabled,
        trackingId: categoryCards[1].trackingId,
      }}
      topRight={{
        title: categoryCards[2].title,
        description: categoryCards[2].description,
        tone: categoryCards[2].tone,
        onSelect: () => handleSelectCategory(categoryCards[2].category),
        disabled: isBusy || categoryCards[2].disabled,
        trackingId: categoryCards[2].trackingId,
      }}
      bottomLeft={{
        title: categoryCards[3].title,
        description: categoryCards[3].description,
        tone: categoryCards[3].tone,
        onSelect: () => handleSelectCategory(categoryCards[3].category),
        disabled: isBusy || categoryCards[3].disabled,
        trackingId: categoryCards[3].trackingId,
      }}
      bottomCenter={{
        title: '직접말해요',
        description: '추천을 건너뛰고 키보드로 바로 문장을 입력합니다.',
        tone: 'mint',
        onSelect: () => {
          openKeyboard('custom_entry')
          navigateWithFeedback(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
        },
        disabled: status === 'submitting',
        trackingId: 'custom-talk-direction-keyboard',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '대화 메인 화면으로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigateWithFeedback(ROUTE_PATHS.PATIENT_TALK_MAIN),
        trackingId: 'custom-talk-direction-back',
      }}
      dwellFeedback={dwellFeedback}
      centerChildren={
        <section
          style={{ ...promptPanelStyle, ...promptPanelToneStyle }}
          aria-label="보호자 선발화"
          aria-live="polite"
        >
          <div style={promptContentStyle}>
            <p style={promptLabelStyle}>{promptHeading}</p>
            <p style={{ ...promptTextStyle, ...promptTextToneStyle }}>{promptDisplayText}</p>
          </div>
        </section>
      }
    />
  )
}
