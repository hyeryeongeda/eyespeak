import { type CSSProperties, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { usePatientIncomingChat } from '../../../../hooks/patientIncomingChatContext'
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
import type { CustomCategoryKey } from '../types'
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
  const visible = sentences.filter(Boolean)

  if (visible.length >= 2) {
    return visible.slice(0, 2)
  }

  return [...visible, '지금 바로 답하고 싶어요.', '조금 더 구체적으로 말해 주세요.'].slice(0, 2)
}

function pickCategory(
  visibleCategoryKeys: CustomCategoryKey[],
  candidates: CustomCategoryKey[],
  fallback: CustomCategoryKey,
) {
  return candidates.find(key => visibleCategoryKeys.includes(key)) ?? fallback
}

export default function CustomTalkRecommendPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const visibleCategoryKeys = useCustomTalkStore(state => state.visibleCategoryKeys)
  const draft = useCustomTalkStore(state => state.draft)
  const recommendedSentences = useCustomTalkStore(state => state.recommendedSentences)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const initializeCustomTalk = useCustomTalkStore(state => state.initializeCustomTalk)
  const selectCategory = useCustomTalkStore(state => state.selectCategory)
  const loadRecommendedSentences = useCustomTalkStore(state => state.loadRecommendedSentences)
  const selectRecommendedSentence = useCustomTalkStore(state => state.selectRecommendedSentence)
  const startCompose = useCustomTalkStore(state => state.startCompose)
  const categoryKey =
    draft.categoryKey ?? pickCategory(visibleCategoryKeys, ['mood', 'schedule'], 'mood')
  const isActionLocked =
    status === 'loading' || status === 'refreshing' || status === 'submitting'

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

  useEffect(() => {
    if (draft.categoryKey) {
      return
    }

    selectCategory(categoryKey)
  }, [categoryKey, draft.categoryKey, selectCategory])

  useEffect(() => {
    if (recommendedSentences.length > 0) {
      return
    }

    void loadRecommendedSentences(categoryKey)
  }, [categoryKey, loadRecommendedSentences, recommendedSentences.length])

  const categoryLabel =
    CUSTOM_TALK_CATEGORY_POOL.find(item => item.key === categoryKey)?.title ?? '추천 응답'
  const visibleSentences = getVisibleSentences(recommendedSentences)

  return (
    <CustomTalkStageLayout
      code="PAT-CUSTOM-002"
      title="추천 응답"
      description="보호자 메시지를 바탕으로 바로 답할 수 있는 문장을 준비했습니다."
      stepLabel={`${categoryLabel} 추천 응답`}
      leftTop={{
        title: visibleSentences[0] ?? '추천 응답을 불러오는 중입니다.',
        description: '선택하면 바로 환자 응답으로 전송됩니다.',
        tone: 'sky',
        onSelect: () => {
          if (visibleSentences[0]) {
            void selectRecommendedSentence(visibleSentences[0])
          }
        },
        disabled: !visibleSentences[0] || isActionLocked,
      }}
      leftBottom={{
        title: visibleSentences[1] ?? '추천 응답을 불러오는 중입니다.',
        description: '선택하면 바로 환자 응답으로 전송됩니다.',
        tone: 'sand',
        onSelect: () => {
          if (visibleSentences[1]) {
            void selectRecommendedSentence(visibleSentences[1])
          }
        },
        disabled: !visibleSentences[1] || isActionLocked,
      }}
      rightTop={{
        title: '단어 조합으로 답하기',
        description: '추천 문장이 맞지 않으면 단어를 조합해서 새 문장을 만듭니다.',
        tone: 'mint',
        onSelect: async () => {
          await startCompose()
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE)
        },
        disabled: isActionLocked,
      }}
      rightBottom={{
        title: '추천응답 처음으로',
        description: '추천응답 첫 화면으로 돌아갑니다.',
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
            <div style={customTalkLoadingNoticeStyle}>추천 응답을 불러오는 중입니다.</div>
          ) : null}
          {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}

          <section style={customTalkPanelStyle}>
            <h3 style={sectionTitleStyle}>{categoryLabel} 추천 응답</h3>
            <p style={sectionTextStyle}>
              보호자 선발화가 들어오면 이 화면에서 바로 응답 후보를 고를 수 있습니다.
            </p>
            {draft.selectedRecommendedSentence ? (
              <div style={selectedSentenceStyle}>{draft.selectedRecommendedSentence}</div>
            ) : (
              <div style={customTalkLoadingNoticeStyle}>
                아직 선택한 추천 응답이 없습니다.
              </div>
            )}
          </section>
        </div>
      }
    />
  )
}
