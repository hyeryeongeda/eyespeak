import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
} from '../../input/hooks/useDwellFeedback'
import { useCellMapping } from '../../input/hooks/useCellMapping'
import type {
  DailyMoodCreateRequestDto,
  DailyMoodType,
} from '../../../../types/dailyMood'

type MoodSelectionStep = 'mood-page-1' | 'mood-page-2' | 'intensity'
type GridSlot =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

interface PatientDailyMoodOverlayProps {
  visible: boolean
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (request: DailyMoodCreateRequestDto) => Promise<void> | void
}

interface MoodOption {
  type: DailyMoodType
  label: string
  description: string
}

interface LevelOption {
  value: number
  label: string
}

interface ActionCardConfig {
  slot: GridSlot
  title: string
  description?: string
  trackingId?: string
  disabled?: boolean
  selected?: boolean
  variant?: 'default' | 'action' | 'muted'
  onSelect?: () => void
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: 'HAPPY', label: '기분 좋음', description: '마음이 가볍고 편안해요' },
  { type: 'SAD', label: '슬픔', description: '마음이 가라앉고 울적해요' },
  { type: 'CALM', label: '평온', description: '조용하고 안정된 느낌이에요' },
  { type: 'JOYFUL', label: '즐거움', description: '기분이 밝고 신나요' },
  { type: 'ANXIOUS', label: '불안', description: '걱정이 많고 초조해요' },
  { type: 'ANGRY', label: '화남', description: '마음이 예민하고 답답해요' },
  { type: 'TIRED', label: '피곤', description: '몸과 마음에 힘이 없어요' },
]

const LEVEL_OPTIONS: LevelOption[] = [
  { value: 1, label: '아주 조금' },
  { value: 2, label: '조금' },
  { value: 3, label: '보통' },
  { value: 4, label: '많이' },
  { value: 5, label: '매우 많이' },
]

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1400,
  background: 'rgba(241, 243, 247, 0.92)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
}

const pageStyle: CSSProperties = {
  width: 'min(1320px, 100%)',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
}

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: '#b2b3b8',
  fontSize: 'clamp(1.35rem, 2vw, 2.1rem)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'minmax(220px, 1fr) minmax(150px, 0.56fr) minmax(220px, 1fr)',
  gridTemplateAreas: `
    "top-left top-center top-right"
    "center center center"
    "bottom-left bottom-center bottom-right"
  `,
  gap: '16px',
}

const centerPanelStyle: CSSProperties = {
  gridArea: 'center',
  borderRadius: '20px',
  border: '1px solid #d4dbe6',
  backgroundColor: '#ffffff',
  boxShadow: '0 18px 42px rgba(101, 112, 132, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '16px 28px',
}

const centerInnerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'center',
}

const centerTitleStyle: CSSProperties = {
  margin: 0,
  color: '#111111',
  fontSize: 'clamp(2rem, 3.2vw, 3rem)',
  fontWeight: 900,
  letterSpacing: '-0.04em',
}

const centerValueStyle: CSSProperties = {
  margin: 0,
  color: '#2d3a4d',
  fontSize: 'clamp(1.05rem, 1.7vw, 1.5rem)',
  fontWeight: 800,
}

const centerHelperStyle: CSSProperties = {
  margin: 0,
  color: '#78869a',
  fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)',
  fontWeight: 700,
}

const centerErrorStyle: CSSProperties = {
  margin: 0,
  color: '#b64949',
  fontSize: '0.95rem',
  fontWeight: 700,
}

const overlayCss = `
  .patient-daily-mood-card:hover:not(:disabled),
  .patient-daily-mood-card:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 24px 52px rgba(86, 97, 118, 0.14);
    outline: none;
  }

  @media (max-width: 920px) {
    .patient-daily-mood-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: repeat(4, minmax(150px, auto)) !important;
      grid-template-areas:
        "top-left top-center"
        "top-right bottom-left"
        "center center"
        "bottom-center bottom-right" !important;
    }
  }

  @media (max-width: 640px) {
    .patient-daily-mood-overlay {
      padding: 12px !important;
    }

    .patient-daily-mood-grid {
      grid-template-columns: 1fr !important;
      grid-template-rows: repeat(7, minmax(120px, auto)) !important;
      grid-template-areas:
        "top-left"
        "top-center"
        "top-right"
        "center"
        "bottom-left"
        "bottom-center"
        "bottom-right" !important;
      gap: 12px !important;
    }
  }
`

function getMoodLabel(moodType: DailyMoodType | null) {
  return MOOD_OPTIONS.find(option => option.type === moodType)?.label ?? null
}

function getLevelLabel(moodLevel: number | null) {
  return LEVEL_OPTIONS.find(option => option.value === moodLevel)?.label ?? null
}

function getCardStyle(
  slot: GridSlot,
  variant: ActionCardConfig['variant'],
  selected: boolean,
  disabled: boolean,
): CSSProperties {
  const backgrounds: Record<NonNullable<ActionCardConfig['variant']>, string> = {
    default: '#ffffff',
    action: 'linear-gradient(180deg, #f6f8ff 0%, #eef3ff 100%)',
    muted: 'linear-gradient(180deg, #f1f3f6 0%, #eceff3 100%)',
  }

  return {
    gridArea: slot,
    borderRadius: '20px',
    border: selected ? '2px solid #7f9bc7' : '1px solid #d4dbe6',
    background: disabled ? backgrounds.muted : backgrounds[variant ?? 'default'],
    boxShadow: selected
      ? '0 24px 52px rgba(109, 132, 177, 0.16)'
      : '0 18px 42px rgba(101, 112, 132, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '26px 18px',
    color: disabled ? '#9ea7b3' : '#111111',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
    position: 'relative',
    minHeight: 0,
  }
}

function ActionCard({
  card,
  submitting = false,
  dwellFeedback,
}: {
  card: ActionCardConfig
  submitting?: boolean
  dwellFeedback: ReturnType<typeof useDwellFeedback<string>>
}) {
  const isDisabled = Boolean(card.disabled || submitting || !card.onSelect)
  const shouldShowDwellFeedback = isDwellFeedbackTargetActive(
    dwellFeedback,
    card.trackingId,
  )

  return (
    <button
      type="button"
      className="patient-daily-mood-card"
      style={getCardStyle(
        card.slot,
        card.variant ?? 'default',
        Boolean(card.selected),
        isDisabled,
      )}
      onClick={card.onSelect}
      disabled={isDisabled}
      data-tracking-id={isDisabled ? undefined : card.trackingId}
    >
      {shouldShowDwellFeedback ? (
        <DwellFeedbackBadge
          phase={dwellFeedback.phase}
          progress={dwellFeedback.progress}
          remainingMs={dwellFeedback.remainingMs}
        />
      ) : null}
      <strong
        style={{
          fontSize: 'clamp(2rem, 3.1vw, 3rem)',
          fontWeight: 900,
          letterSpacing: '-0.05em',
          lineHeight: 1.06,
        }}
      >
        {card.title}
      </strong>
      {card.description ? (
        <span
          style={{
            marginTop: '12px',
            maxWidth: '12ch',
            color: isDisabled ? '#aeb5bf' : '#647182',
            fontSize: 'clamp(0.92rem, 1.2vw, 1.05rem)',
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          {card.description}
        </span>
      ) : null}
    </button>
  )
}

export default function PatientDailyMoodOverlay({
  visible,
  submitting = false,
  errorMessage = null,
  onSubmit,
}: PatientDailyMoodOverlayProps) {
  const [step, setStep] = useState<MoodSelectionStep>('mood-page-1')
  const [selectedMoodType, setSelectedMoodType] = useState<DailyMoodType | null>(null)
  const [selectedMoodLevel, setSelectedMoodLevel] = useState<number | null>(null)
  const dwellFeedback = useDwellFeedback<string>({
    enabled: visible,
  })

  useEffect(() => {
    if (!visible) {
      setStep('mood-page-1')
      setSelectedMoodType(null)
      setSelectedMoodLevel(null)
    }
  }, [visible])

  const currentMoodLabel = getMoodLabel(selectedMoodType)
  const currentLevelLabel = getLevelLabel(selectedMoodLevel)
  const pageTitle =
    step === 'intensity'
      ? '오늘의 기분 강도'
      : step === 'mood-page-2'
        ? '오늘의 기분 - 2'
        : '오늘의 기분'

  const actionCards = useMemo<ActionCardConfig[]>(() => {
    if (step === 'intensity') {
      return [
        {
          slot: 'top-left',
          title: '1',
          description: LEVEL_OPTIONS[0].label,
          trackingId: 'daily-mood-level-1',
          selected: selectedMoodLevel === 1,
          onSelect: () => setSelectedMoodLevel(1),
        },
        {
          slot: 'top-center',
          title: '2',
          description: LEVEL_OPTIONS[1].label,
          trackingId: 'daily-mood-level-2',
          selected: selectedMoodLevel === 2,
          onSelect: () => setSelectedMoodLevel(2),
        },
        {
          slot: 'top-right',
          title: '3',
          description: LEVEL_OPTIONS[2].label,
          trackingId: 'daily-mood-level-3',
          selected: selectedMoodLevel === 3,
          onSelect: () => setSelectedMoodLevel(3),
        },
        {
          slot: 'bottom-left',
          title: '4',
          description: LEVEL_OPTIONS[3].label,
          trackingId: 'daily-mood-level-4',
          selected: selectedMoodLevel === 4,
          onSelect: () => setSelectedMoodLevel(4),
        },
        {
          slot: 'bottom-center',
          title: '5',
          description: LEVEL_OPTIONS[4].label,
          trackingId: 'daily-mood-level-5',
          selected: selectedMoodLevel === 5,
          onSelect: () => setSelectedMoodLevel(5),
        },
        {
          slot: 'bottom-right',
          title: submitting ? '저장 중' : '확인',
          description: '오늘 기분 저장',
          trackingId: 'daily-mood-confirm',
          disabled: !selectedMoodType || !selectedMoodLevel,
          variant: 'action',
          onSelect: () => {
            if (!selectedMoodType || !selectedMoodLevel) {
              return
            }

            void onSubmit({
              moodType: selectedMoodType,
              moodLevel: selectedMoodLevel,
            })
          },
        },
      ]
    }

    if (step === 'mood-page-2') {
      return [
        {
          slot: 'top-left',
          title: MOOD_OPTIONS[5].label,
          description: MOOD_OPTIONS[5].description,
          trackingId: 'daily-mood-angry',
          selected: selectedMoodType === MOOD_OPTIONS[5].type,
          onSelect: () => {
            setSelectedMoodType(MOOD_OPTIONS[5].type)
            setStep('intensity')
          },
        },
        {
          slot: 'top-center',
          title: MOOD_OPTIONS[6].label,
          description: MOOD_OPTIONS[6].description,
          trackingId: 'daily-mood-tired',
          selected: selectedMoodType === MOOD_OPTIONS[6].type,
          onSelect: () => {
            setSelectedMoodType(MOOD_OPTIONS[6].type)
            setStep('intensity')
          },
        },
        {
          slot: 'top-right',
          title: '대기',
          description: '선택 없음',
          disabled: true,
          variant: 'muted',
        },
        {
          slot: 'bottom-left',
          title: '대기',
          description: '선택 없음',
          disabled: true,
          variant: 'muted',
        },
        {
          slot: 'bottom-center',
          title: '대기',
          description: '선택 없음',
          disabled: true,
          variant: 'muted',
        },
        {
          slot: 'bottom-right',
          title: '뒤로가기',
          description: '이전 기분 보기',
          trackingId: 'daily-mood-back',
          variant: 'action',
          onSelect: () => setStep('mood-page-1'),
        },
      ]
    }

    return [
      {
        slot: 'top-left',
        title: MOOD_OPTIONS[0].label,
        description: MOOD_OPTIONS[0].description,
        trackingId: 'daily-mood-happy',
        selected: selectedMoodType === MOOD_OPTIONS[0].type,
        onSelect: () => setSelectedMoodType(MOOD_OPTIONS[0].type),
      },
      {
        slot: 'top-center',
        title: MOOD_OPTIONS[1].label,
        description: MOOD_OPTIONS[1].description,
        trackingId: 'daily-mood-sad',
        selected: selectedMoodType === MOOD_OPTIONS[1].type,
        onSelect: () => setSelectedMoodType(MOOD_OPTIONS[1].type),
      },
      {
        slot: 'top-right',
        title: MOOD_OPTIONS[2].label,
        description: MOOD_OPTIONS[2].description,
        trackingId: 'daily-mood-calm',
        selected: selectedMoodType === MOOD_OPTIONS[2].type,
        onSelect: () => setSelectedMoodType(MOOD_OPTIONS[2].type),
      },
      {
        slot: 'bottom-left',
        title: MOOD_OPTIONS[3].label,
        description: MOOD_OPTIONS[3].description,
        trackingId: 'daily-mood-joyful',
        selected: selectedMoodType === MOOD_OPTIONS[3].type,
        onSelect: () => setSelectedMoodType(MOOD_OPTIONS[3].type),
      },
      {
        slot: 'bottom-center',
        title: MOOD_OPTIONS[4].label,
        description: MOOD_OPTIONS[4].description,
        trackingId: 'daily-mood-anxious',
        selected: selectedMoodType === MOOD_OPTIONS[4].type,
        onSelect: () => setSelectedMoodType(MOOD_OPTIONS[4].type),
      },
      {
        slot: 'bottom-right',
        title: '다음',
        description: '나머지 기분 보기',
        trackingId: 'daily-mood-next',
        variant: 'action',
        onSelect: () => setStep('mood-page-2'),
      },
    ]
  }, [onSubmit, selectedMoodLevel, selectedMoodType, step, submitting])

  const cellMapping = useMemo(() => {
    const mapping: Record<number, string | null> = {
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
    }

    const cellIndexBySlot: Record<GridSlot, number> = {
      'top-left': 0,
      'top-center': 1,
      'top-right': 2,
      'bottom-left': 3,
      'bottom-center': 4,
      'bottom-right': 5,
    }

    actionCards.forEach(card => {
      mapping[cellIndexBySlot[card.slot]] =
        card.disabled || !card.trackingId ? null : card.trackingId
    })

    return mapping
  }, [actionCards])

  useCellMapping(cellMapping)

  if (!visible) {
    return null
  }

  return (
    <div
      className="patient-daily-mood-overlay"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-daily-mood-title"
    >
      <style>{overlayCss}</style>
      <div style={pageStyle}>
        <h1 id="patient-daily-mood-title" style={pageTitleStyle}>
          {pageTitle}
        </h1>

        <div
          className="patient-daily-mood-grid"
          style={gridStyle}
          ref={element => {
            dwellFeedback.containerRef.current = element
          }}
        >
          {actionCards.map(card => (
            <ActionCard
              key={card.slot}
              card={card}
              submitting={submitting}
              dwellFeedback={dwellFeedback}
            />
          ))}

          <section style={centerPanelStyle} aria-label="현재 선택된 기분">
            <div style={centerInnerStyle}>
              <h2 style={centerTitleStyle}>나의 기분</h2>
              <p style={centerValueStyle}>
                {currentMoodLabel ?? '아직 선택되지 않았어요'}
              </p>
              {step === 'intensity' ? (
                <p style={centerHelperStyle}>
                  강도: {selectedMoodLevel ?? '-'} {currentLevelLabel ? `(${currentLevelLabel})` : ''}
                </p>
              ) : (
                <p style={centerHelperStyle}>
                  {step === 'mood-page-2'
                    ? '기분 6, 7은 선택 즉시 강도 단계로 이동합니다.'
                    : '원하는 기분을 고른 뒤 다음으로 이동하세요.'}
                </p>
              )}
              {errorMessage ? <p style={centerErrorStyle}>{errorMessage}</p> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
