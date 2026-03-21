import { type CSSProperties, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import CustomTalkContextPanel from '../components/CustomTalkContextPanel'
import CustomTalkStageLayout from '../components/CustomTalkStageLayout'
import {
  customTalkErrorNoticeStyle,
  customTalkLoadingNoticeStyle,
  customTalkPanelStyle,
} from '../components/customTalkUi'
import type { ComposeStep } from '../types'
import { useCustomTalkStore } from '../store/customTalkStore'
import { buildCustomTalkDraftPreview } from '../utils/generateCustomSentences'

const composeStepLabelMap: Record<ComposeStep, string> = {
  subject: '1단계 주어 선택',
  object: '2단계 대상 선택',
  predicate: '3단계 표현 선택',
  punctuation: '4단계 끝표시 선택',
}

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

const previewStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '20px',
  backgroundColor: '#f6f9fc',
  border: '1px solid #dde7ed',
  color: '#44566d',
  fontSize: '15px',
  fontWeight: 800,
  lineHeight: 1.6,
}

function getVisibleComposeOptions(options: string[]) {
  const visible = options.filter(Boolean)
  return visible.slice(0, 2)
}

export default function CustomTalkComposePage() {
  const navigate = useNavigate()
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const draft = useCustomTalkStore(state => state.draft)
  const composeStep = useCustomTalkStore(state => state.composeStep)
  const composeOptions = useCustomTalkStore(state => state.composeOptions)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const refreshComposeStep = useCustomTalkStore(state => state.refreshComposeStep)
  const selectComposeWord = useCustomTalkStore(state => state.selectComposeWord)
  const skipComposeStep = useCustomTalkStore(state => state.skipComposeStep)
  const goBackComposeStep = useCustomTalkStore(state => state.goBackComposeStep)
  const hasCategoryKey = Boolean(draft.categoryKey)

  useEffect(() => {
    if (!hasCategoryKey || composeOptions[composeStep].length > 0) {
      return
    }

    void refreshComposeStep(composeStep)
  }, [composeOptions, composeStep, hasCategoryKey, refreshComposeStep])

  if (!hasCategoryKey) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  const visibleOptions = getVisibleComposeOptions(composeOptions[composeStep])

  const handleSelect = async (value: string) => {
    const completed = await selectComposeWord(composeStep, value)

    if (completed) {
      navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED)
    }
  }

  return (
    <CustomTalkStageLayout
      code="PAT-CUSTOM-003"
      title="단어 조합"
      description="가운데 채팅은 확인만 하고, 옆의 세 선택 버튼과 뒤로가기만 사용합니다."
      stepLabel={composeStepLabelMap[composeStep]}
      leftTop={{
        title: visibleOptions[0] ?? '추천 없음',
        description: `${composeStepLabelMap[composeStep]} 항목으로 선택합니다.`,
        tone: 'sky',
        onSelect: () => {
          if (visibleOptions[0]) {
            void handleSelect(visibleOptions[0])
          }
        },
        disabled: !visibleOptions[0],
      }}
      leftBottom={{
        title: visibleOptions[1] ?? '추천 없음',
        description: `${composeStepLabelMap[composeStep]} 항목으로 선택합니다.`,
        tone: 'sand',
        onSelect: () => {
          if (visibleOptions[1]) {
            void handleSelect(visibleOptions[1])
          }
        },
        disabled: !visibleOptions[1],
      }}
      rightTop={{
        title: '이 단계 건너뛰기',
        description: '현재 단계는 비우고 다음 단계로 넘어갑니다.',
        tone: 'mint',
        onSelect: async () => {
          const completed = await skipComposeStep(composeStep)

          if (completed) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_GENERATED)
          }
        },
      }}
      rightBottom={{
        title: '뒤로가기',
        description: '직전 단계로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => {
          const previousStep = goBackComposeStep()

          if (!previousStep) {
            navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK)
          }
        },
      }}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
            previewText={buildCustomTalkDraftPreview(draft)}
          />

          {(status === 'refreshing' || status === 'loading') ? (
            <div style={customTalkLoadingNoticeStyle}>
              {composeStepLabelMap[composeStep]} 항목을 준비하는 중입니다.
            </div>
          ) : null}
          {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}

          <section style={customTalkPanelStyle}>
            <h3 style={sectionTitleStyle}>{composeStepLabelMap[composeStep]}</h3>
            <p style={sectionTextStyle}>
              왼쪽 두 버튼은 추천 단어, 오른쪽 위는 건너뛰기, 오른쪽 아래는 뒤로가기입니다.
            </p>
            <div style={previewStyle}>
              현재 문장 미리보기: {buildCustomTalkDraftPreview(draft) || '아직 선택한 단어가 없습니다.'}
            </div>
          </section>
        </div>
      }
    />
  )
}
