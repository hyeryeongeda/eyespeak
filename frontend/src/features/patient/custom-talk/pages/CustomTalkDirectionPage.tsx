import { type CSSProperties, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkStageLayout from '../components/CustomTalkStageLayout'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import type { CustomCategoryKey } from '../types'
import { usePatientIncomingChat } from '../../../../hooks/usePatientIncomingChat'
import { useCustomTalkStore } from '../store/customTalkStore'
import { buildCustomTalkDraftPreview } from '../utils/generateCustomSentences'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  minHeight: 0,
}

const helperCardStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '20px',
  border: '1px solid #dde7ed',
  backgroundColor: '#f6f9fc',
  color: '#44566d',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1.6,
}

function pickCategory(
  visibleCategoryKeys: CustomCategoryKey[],
  candidates: CustomCategoryKey[],
  fallback: CustomCategoryKey,
) {
  return candidates.find(key => visibleCategoryKeys.includes(key)) ?? fallback
}

export default function CustomTalkDirectionPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const visibleCategoryKeys = useCustomTalkStore(state => state.visibleCategoryKeys)
  const draft = useCustomTalkStore(state => state.draft)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const refreshCategories = useCustomTalkStore(state => state.refreshCategories)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
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
  const expressionCategory = pickCategory(
    visibleCategoryKeys,
    ['frequent', 'recent'],
    'frequent',
  )

  return (
    <CustomTalkStageLayout
      code="PAT-CUSTOM-001"
      title="맞춤대화"
      description="가운데 채팅을 보면서 필요한 방향을 고릅니다."
      stepLabel="오늘 관련 / 표현 관련 / 새로고침 / 뒤로가기"
      leftTop={{
        title: '오늘 이야기',
        description:
          context?.todaySchedule || context?.todayMood
            ? `${context.todayMood ?? '오늘 상태'} · ${context.todaySchedule ?? '오늘 일정'} 기준으로 추천합니다.`
            : '오늘 기분과 오늘 일정 중심으로 문장을 추천합니다.',
        tone: 'sky',
        onSelect: () => {
          selectCategory(todayCategory)
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_RECOMMEND)
        },
      }}
      rightTop={{
        title: '표현 고르기',
        description:
          context?.recentUsedExpressions?.[0] ?? '자주 쓰는 표현과 최근 표현을 기준으로 추천합니다.',
        tone: 'mint',
        onSelect: async () => {
          selectCategory(expressionCategory)
          await startCompose()
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE)
        },
      }}
      leftBottom={{
        title: '새로고침',
        description: '추천 방향과 맥락을 다시 불러옵니다.',
        tone: 'sand',
        onSelect: () => void refreshCategories(),
        disabled: status === 'loading' || status === 'refreshing',
      }}
      rightBottom={{
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
            previewText={buildCustomTalkDraftPreview(draft)}
          />

          {status === 'loading' ? (
            <div style={customTalkLoadingNoticeStyle}>
              맞춤대화 맥락과 추천 방향을 불러오는 중입니다.
            </div>
          ) : null}
          {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}

          <div style={helperCardStyle}>
            왼쪽 위는 오늘과 관련된 답변, 오른쪽 위는 자주 쓰는 표현 중심 답변입니다.
            <br />
            왼쪽 아래는 새로고침, 오른쪽 아래는 항상 뒤로가기입니다.
            <br />
            키보드 직접 입력은 다음 단계에서 이어서 열 수 있게 유지하겠습니다.
          </div>
        </div>
      }
    />
  )
}
