import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkStageLayout from '../components/CustomTalkStageLayout'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkPanelStyle,
  customTalkSuccessNoticeStyle,
} from '../components/customTalkUi'
import { CUSTOM_TALK_CATEGORY_POOL } from '../mocks/customCategoryPool.mock'
import { useCustomTalkStore } from '../store/customTalkStore'
import { buildCustomTalkDraftPreview } from '../utils/generateCustomSentences'

const centerStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: '#223247',
  fontSize: '18px',
  fontWeight: 900,
}

const sectionTextStyle: CSSProperties = {
  margin: 0,
  color: '#65778f',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.6,
}

const selectedSentenceStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '20px',
  backgroundColor: '#eef8f1',
  border: '1px solid #cce4d2',
  color: '#3f6e4c',
  fontSize: '15px',
  fontWeight: 800,
  lineHeight: 1.6,
}

function getVisibleSentences(sentences: string[]) {
  const fallbackSentences = [
    '지금은 잘 모르겠어요.',
    '조금만 기다려 주세요.',
  ]
  const visible = [...sentences]

  fallbackSentences.forEach(sentence => {
    if (visible.length < 2 && !visible.includes(sentence)) {
      visible.push(sentence)
    }
  })

  return visible.slice(0, 2)
}

export default function CustomTalkRecommendPage() {
  const navigate = useNavigate()
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

  const categoryLabel =
    CUSTOM_TALK_CATEGORY_POOL.find(item => item.key === draft.categoryKey)?.title ?? '맞춤대화'
  const visibleSentences = getVisibleSentences(recommendedSentences)

  return (
    <CustomTalkStageLayout
      code="PAT-CUSTOM-002"
      title="추천 문장 선택"
      description="가운데 채팅은 확인만 하고, 양쪽 네 버튼으로만 선택합니다."
      stepLabel={`${categoryLabel} 추천 문장`}
      leftTop={{
        title: visibleSentences[0] ?? '추천 문장 준비 중',
        description: '이 문장으로 바로 답변합니다.',
        tone: 'sky',
        onSelect: () => {
          if (visibleSentences[0]) {
            void selectRecommendedSentence(visibleSentences[0])
          }
        },
        disabled: !visibleSentences[0] || isActionLocked,
      }}
      leftBottom={{
        title: visibleSentences[1] ?? '추천 문장 준비 중',
        description: '이 문장으로 바로 답변합니다.',
        tone: 'sand',
        onSelect: () => {
          if (visibleSentences[1]) {
            void selectRecommendedSentence(visibleSentences[1])
          }
        },
        disabled: !visibleSentences[1] || isActionLocked,
      }}
      rightTop={{
        title: '단어로 표현하기',
        description: '추천 문장 대신 단어를 조합해서 표현합니다.',
        tone: 'mint',
        onSelect: async () => {
          await startCompose()
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE)
        },
        disabled: isActionLocked,
      }}
      rightBottom={{
        title: '뒤로가기',
        description: '맞춤대화 첫 화면으로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK),
      }}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
            previewText={buildCustomTalkDraftPreview(draft)}
          />

          {status === 'loading' ? (
            <div style={customTalkLoadingNoticeStyle}>추천 문장을 준비하는 중입니다.</div>
          ) : null}
          {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}

          <section style={customTalkPanelStyle}>
            <h3 style={sectionTitleStyle}>{categoryLabel} 기준 추천 문장</h3>
            <p style={sectionTextStyle}>
              이 화면에서는 가운데를 누르지 않고, 왼쪽 두 버튼 또는 오른쪽 위 버튼만 사용합니다.
            </p>
            {draft.selectedRecommendedSentence ? (
              <div style={selectedSentenceStyle}>{draft.selectedRecommendedSentence}</div>
            ) : (
              <div style={customTalkLoadingNoticeStyle}>
                아직 선택한 문장이 없습니다.
              </div>
            )}
          </section>
        </div>
      }
    />
  )
}
