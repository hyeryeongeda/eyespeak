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
import type { CustomTalkCategoryOption } from '../types'
import { usePatientIncomingChat } from '../../../../hooks/patientIncomingChatContext'
import { useCustomTalkStore } from '../store/customTalkStore'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
  height: '100%',
  padding: '16px',
  boxSizing: 'border-box',
  justifyContent: 'center',
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

type CategoryCardModel = {
  title: string
  description: string
  tone: 'sand' | 'sky' | 'mint'
  disabled: boolean
  trackingId:
    | 'custom-talk-direction-recommendation-1'
    | 'custom-talk-direction-recommendation-2'
    | 'custom-talk-direction-recommendation-3'
    | 'custom-talk-direction-recommendation-4'
  category: CustomTalkCategoryOption | null
}

function buildCategoryCards(visibleCategories: CustomTalkCategoryOption[]): CategoryCardModel[] {
  const tones = ['sand', 'sky', 'mint', 'sand'] as const
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
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
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

  const categoryCards = buildCategoryCards(visibleCategories)
  const isBusy =
    status === 'loading' || status === 'refreshing' || status === 'submitting'

  const handleSelectCategory = (category: CustomTalkCategoryOption | null) => {
    if (!category) {
      return
    }

    selectCategory(category.key)
    navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_RECOMMEND)
  }

  return (
    <CustomTalkEntryLayout
      title="맞춤 카테고리"
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
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
        },
        disabled: status === 'submitting',
        trackingId: 'custom-talk-direction-keyboard',
      }}
      bottomRight={{
        title: '뒤로가기',
        description: '대화 메인 화면으로 돌아갑니다.',
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
                  맞춤대화 카테고리를 불러오는 중입니다.
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
