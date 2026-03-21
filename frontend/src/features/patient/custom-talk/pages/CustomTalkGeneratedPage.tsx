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

const previewStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '20px',
  backgroundColor: '#eef8f1',
  border: '1px solid #cce4d2',
  color: '#3f6e4c',
  fontSize: '15px',
  fontWeight: 800,
  lineHeight: 1.6,
}

function getVisibleGeneratedSentences(sentences: string[]) {
  const fallbackSentences = ['조금만 쉬고 싶어요.', '지금은 괜찮아요.']
  const visible = [...sentences]

  fallbackSentences.forEach(sentence => {
    if (visible.length < 2 && !visible.includes(sentence)) {
      visible.push(sentence)
    }
  })

  return visible.slice(0, 2)
}

export default function CustomTalkGeneratedPage() {
  const navigate = useNavigate()
  const context = useCustomTalkStore(state => state.context)
  const conversationLog = useCustomTalkStore(state => state.conversationLog)
  const draft = useCustomTalkStore(state => state.draft)
  const generatedSentences = useCustomTalkStore(state => state.generatedSentences)
  const status = useCustomTalkStore(state => state.status)
  const errorMessage = useCustomTalkStore(state => state.errorMessage)
  const completionMessage = useCustomTalkStore(state => state.completionMessage)
  const buildGeneratedSentences = useCustomTalkStore(state => state.buildGeneratedSentences)
  const selectGeneratedSentence = useCustomTalkStore(state => state.selectGeneratedSentence)
  const openKeyboard = useCustomTalkStore(state => state.openKeyboard)

  const hasComposeValue = Boolean(
    draft.subject || draft.object || draft.predicate || draft.punctuation,
  )
  const hasCategoryKey = Boolean(draft.categoryKey)

  useEffect(() => {
    if (!hasCategoryKey || !hasComposeValue || generatedSentences.length > 0) {
      return
    }

    void buildGeneratedSentences()
  }, [buildGeneratedSentences, generatedSentences.length, hasCategoryKey, hasComposeValue])

  if (!hasCategoryKey) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK} replace />
  }

  if (!hasComposeValue) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE} replace />
  }

  const visibleGeneratedSentences = getVisibleGeneratedSentences(generatedSentences)

  return (
    <CustomTalkStageLayout
      code="PAT-CUSTOM-004"
      title="생성 문장 추천"
      description="이 단계도 환자 입력은 옆의 네 버튼으로만 처리합니다."
      stepLabel="생성 문장 / 키보드 / 뒤로가기"
      leftTop={{
        title: visibleGeneratedSentences[0] ?? '생성 문장 준비 중',
        description: '이 문장으로 바로 발화합니다.',
        tone: 'sky',
        onSelect: () => {
          if (visibleGeneratedSentences[0]) {
            void selectGeneratedSentence(visibleGeneratedSentences[0])
          }
        },
        disabled: !visibleGeneratedSentences[0],
      }}
      leftBottom={{
        title: visibleGeneratedSentences[1] ?? '생성 문장 준비 중',
        description: '이 문장으로 바로 발화합니다.',
        tone: 'sand',
        onSelect: () => {
          if (visibleGeneratedSentences[1]) {
            void selectGeneratedSentence(visibleGeneratedSentences[1])
          }
        },
        disabled: !visibleGeneratedSentences[1],
      }}
      rightTop={{
        title: '키보드 직접 입력',
        description: '생성 문장 대신 직접 입력 화면으로 이동합니다.',
        tone: 'mint',
        onSelect: () => {
          openKeyboard('generated')
          navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_KEYBOARD)
        },
      }}
      rightBottom={{
        title: '뒤로가기',
        description: '단어 조합 단계로 돌아갑니다.',
        tone: 'slate',
        onSelect: () => navigate(ROUTE_PATHS.PATIENT_CUSTOM_TALK_COMPOSE),
      }}
      centerChildren={
        <div style={centerStackStyle}>
          <CustomTalkContextPanel
            context={context}
            conversationLog={conversationLog}
            previewText={buildCustomTalkDraftPreview(draft)}
          />

          {status === 'loading' ? (
            <div style={customTalkLoadingNoticeStyle}>생성 문장을 준비하는 중입니다.</div>
          ) : null}
          {errorMessage ? <div style={customTalkErrorNoticeStyle}>{errorMessage}</div> : null}
          {completionMessage ? (
            <div style={customTalkSuccessNoticeStyle}>{completionMessage}</div>
          ) : null}

          <section style={customTalkPanelStyle}>
            <h3 style={sectionTitleStyle}>조합 결과 요약</h3>
            <p style={sectionTextStyle}>
              왼쪽 두 버튼은 생성 문장, 오른쪽 위는 키보드 입력, 오른쪽 아래는 뒤로가기입니다.
            </p>
            <div style={previewStyle}>
              현재 조합: {buildCustomTalkDraftPreview(draft) || '아직 조합된 문장이 없습니다.'}
            </div>
          </section>
        </div>
      }
    />
  )
}
