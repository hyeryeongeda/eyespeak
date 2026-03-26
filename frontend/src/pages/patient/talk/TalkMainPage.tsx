import { useMemo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import ChatMessageList from '../../../components/patient/chat/ChatMessageList'
import DwellFeedbackBadge from '../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
} from '../../../features/patient/input/hooks/useDwellFeedback'
import { usePatientIncomingChat } from '../../../hooks/patientIncomingChatContext'
import { useCellMapping } from '../../../features/patient/input/hooks/useCellMapping'

type TalkMainTrackingId =
  | 'talk-main-body-mind'
  | 'talk-main-favorites'
  | 'talk-main-custom-talk'
  | 'talk-main-back-main'

const pageWrap: CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  padding: '16px',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const threeColLayout: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: '1fr 2fr 1fr',
  gridTemplateRows: '1fr 1fr',
  gap: '12px',
  gridTemplateAreas: `
    "left-top center right-top"
    "left-bottom center right-bottom"
  `,
}

const cardBase: CSSProperties = {
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  padding: '20px 18px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '#ffffff',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  position: 'relative',
}

const cardLeftTop: CSSProperties = {
  ...cardBase,
  gridArea: 'left-top',
  background: 'linear-gradient(135deg, #edf1ff 0%, #e5ebff 100%)',
}

const cardLeftBottom: CSSProperties = {
  ...cardBase,
  gridArea: 'left-bottom',
  background: 'linear-gradient(135deg, #fff6d7 0%, #fff1bf 100%)',
}

const cardRightTop: CSSProperties = {
  ...cardBase,
  gridArea: 'right-top',
  background: 'linear-gradient(135deg, #eff7f0 0%, #ebf8f6 100%)',
}

const cardRightBottom: CSSProperties = {
  ...cardBase,
  gridArea: 'right-bottom',
  background: 'linear-gradient(135deg, #f5f5f8 0%, #eef0f5 100%)',
  border: '1px solid #d4dfe7',
}

const cardTitle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(3.5rem, 6vw, 4.75rem)',
  fontWeight: 800,
  color: '#203042',
  textAlign: 'center',
  lineHeight: 1.3,
}

const cardSub: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 'clamp(1rem, 1.4vw, 1.12rem)',
  fontWeight: 600,
  color: '#708191',
  textAlign: 'center',
}

const centerArea: CSSProperties = {
  gridArea: 'center',
  display: 'flex',
  minHeight: 0,
  borderRadius: '24px',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  backgroundColor: '#ffffff',
  overflow: 'hidden',
}

const cardHoverStyle = `
  .talk-main-card:hover {
    transform: scale(1.02);
    box-shadow: 0 24px 56px rgba(40, 66, 90, 0.16);
  }

  .talk-main-card:focus-visible {
    outline: 2px solid #5d8ec7;
    outline-offset: 2px;
  }
`

function DwellOnCard({
  active,
  phase,
  progress,
  remainingMs,
}: {
  active: boolean
  phase: ReturnType<typeof useDwellFeedback>['phase']
  progress: number
  remainingMs: number
}) {
  if (!active) {
    return null
  }

  return (
    <DwellFeedbackBadge
      phase={phase}
      progress={progress}
      remainingMs={remainingMs}
    />
  )
}

export default function TalkMainPage() {
  const navigate = useNavigate()
  const chat = usePatientIncomingChat()
  const dwellFeedback = useDwellFeedback<TalkMainTrackingId>({
    enabled: true,
  })

  const talkMainCellMapping = useMemo(() => ({
    0: 'talk-main-body-mind',
    1: null,
    2: 'talk-main-custom-talk',
    3: 'talk-main-favorites',
    4: null,
    5: 'talk-main-back-main',
  } as Record<number, string | null>), [])

  useCellMapping(talkMainCellMapping)

  const moveToReplyRoute = (routePath: string) => {
    chat.focusLatestPendingMessage()
    navigate(routePath)
  }

  return (
    <div style={pageWrap}>
      <style>{cardHoverStyle}</style>
      <div
        style={threeColLayout}
        ref={element => {
          dwellFeedback.containerRef.current = element
        }}
      >
        <button
          type="button"
          className="talk-main-card"
          style={cardLeftTop}
          data-tracking-id="talk-main-body-mind"
          onClick={() => moveToReplyRoute(ROUTE_PATHS.PATIENT_BODY_MIND)}
        >
          <DwellOnCard
            active={isDwellFeedbackTargetActive(dwellFeedback, 'talk-main-body-mind')}
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
          <h2 style={cardTitle}>몸과 마음</h2>
          <p style={cardSub}>통증, 체온, 분비물 표현으로 이동</p>
        </button>

        <button
          type="button"
          className="talk-main-card"
          style={cardLeftBottom}
          data-tracking-id="talk-main-favorites"
          onClick={() => moveToReplyRoute(ROUTE_PATHS.PATIENT_FAVORITES)}
        >
          <DwellOnCard
            active={isDwellFeedbackTargetActive(dwellFeedback, 'talk-main-favorites')}
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
          <h2 style={cardTitle}>즐겨찾기</h2>
          <p style={cardSub}>자주 쓰는 표현 화면으로 이동</p>
        </button>

        <section style={centerArea} aria-label="환자 대화 세션">
          <ChatMessageList
            messages={chat.state.messages}
            activeMessageId={chat.activeMessage?.id ?? chat.latestUnresolvedMessage?.id}
          />
        </section>

        <button
          type="button"
          className="talk-main-card"
          style={cardRightTop}
          data-tracking-id="talk-main-custom-talk"
          onClick={() => moveToReplyRoute(ROUTE_PATHS.PATIENT_CUSTOM_TALK)}
        >
          <DwellOnCard
            active={isDwellFeedbackTargetActive(dwellFeedback, 'talk-main-custom-talk')}
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
          <h2 style={cardTitle}>맞춤 문장</h2>
          <p style={cardSub}>단계형 맞춤대화 화면으로 이동</p>
        </button>

        <button
          type="button"
          className="talk-main-card"
          style={cardRightBottom}
          data-tracking-id="talk-main-back-main"
          onClick={() => navigate(ROUTE_PATHS.PATIENT_MAIN)}
        >
          <DwellOnCard
            active={isDwellFeedbackTargetActive(dwellFeedback, 'talk-main-back-main')}
            phase={dwellFeedback.phase}
            progress={dwellFeedback.progress}
            remainingMs={dwellFeedback.remainingMs}
          />
          <h2 style={cardTitle}>뒤로 가기</h2>
          <p style={cardSub}>환자 메인으로 복귀</p>
        </button>
      </div>
    </div>
  )
}
