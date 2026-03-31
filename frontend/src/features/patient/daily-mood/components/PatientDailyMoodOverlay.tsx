import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
} from '../../input/hooks/useDwellFeedback'
import usePatientPageCellMapping, {
  type PatientSixCellTrackingIds,
} from '../../input/hooks/usePatientPageCellMapping'
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

const FIRST_PAGE_MOOD_TYPES = new Set<DailyMoodType>([
  'HAPPY',
  'SAD',
  'JOYFUL',
  'ANXIOUS',
])
const SECOND_PAGE_MOOD_TYPES = new Set<DailyMoodType>([
  'ANGRY',
  'TIRED',
  'CALM',
])

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1400,
  background: 'rgba(238, 240, 246, 0.98)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'center',
  boxSizing: 'border-box',
}

const pageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '4px',
  boxSizing: 'border-box',
}

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'minmax(0, 1fr) minmax(92px, 0.36fr) minmax(0, 1fr)',
  gridTemplateAreas: `
    "top-left top-center top-right"
    "center center center"
    "bottom-left bottom-center bottom-right"
  `,
  gap: '8px',
}

const centerPanelStyle: CSSProperties = {
  gridArea: 'center',
  borderRadius: '18px',
  border: '1px solid #dde2ec',
  background:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 253, 0.98) 100%)',
  boxShadow: '0 12px 30px rgba(110, 122, 145, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '12px 24px',
}

const centerInnerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  alignItems: 'center',
}

const centerTitleStyle: CSSProperties = {
  margin: 0,
  color: '#6e7d92',
  fontSize: '0.92rem',
  fontWeight: 800,
}

const centerValueStyle: CSSProperties = {
  margin: 0,
  color: '#111111',
  fontSize: 'clamp(2rem, 3vw, 3rem)',
  fontWeight: 900,
  letterSpacing: '-0.05em',
  lineHeight: 1.05,
}

const centerHelperStyle: CSSProperties = {
  margin: 0,
  color: '#718195',
  fontSize: '0.95rem',
  fontWeight: 700,
  lineHeight: 1.4,
}

const centerErrorStyle: CSSProperties = {
  margin: 0,
  color: '#b64949',
  fontSize: '0.95rem',
  fontWeight: 700,
}

const overlayCss = `
  html:not([data-patient-mode='true']) .patient-daily-mood-card:hover:not(:disabled),
  html:not([data-patient-mode='true']) .patient-daily-mood-card:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 24px 52px rgba(86, 97, 118, 0.14);
    outline: none;
  }

  @media (max-width: 920px) {
    .patient-daily-mood-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: repeat(4, minmax(0, 1fr)) !important;
      grid-template-areas:
        "top-left top-center"
        "top-right bottom-left"
        "center center"
        "bottom-center bottom-right" !important;
    }
  }

  @media (max-width: 640px) {
    .patient-daily-mood-overlay {
      backdrop-filter: none !important;
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
  disabled: boolean,
): CSSProperties {
  const backgrounds: Record<NonNullable<ActionCardConfig['variant']>, string> = {
    default: '#ffffff',
    action: 'linear-gradient(180deg, #f6f8ff 0%, #eef3ff 100%)',
    muted: 'linear-gradient(180deg, #f1f3f6 0%, #eceff3 100%)',
  }

  const background = disabled ? backgrounds.muted : backgrounds[variant ?? 'default']
  const borderColor = '#d4dbe6'
  const boxShadow = '0 18px 42px rgba(101, 112, 132, 0.08)'
  const color = disabled ? '#9ea7b3' : '#111111'

  return {
    ['--patient-daily-mood-card-background' as string]: background,
    ['--patient-daily-mood-card-border-color' as string]: borderColor,
    ['--patient-daily-mood-card-shadow' as string]: boxShadow,
    ['--patient-daily-mood-card-color' as string]: color,
    gridArea: slot,
    borderRadius: '20px',
    border: `1px solid ${borderColor}`,
    background,
    boxShadow,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '32px 18px',
    color,
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
        isDisabled,
      )}
      onClick={card.onSelect}
      disabled={isDisabled}
      data-tracking-id={isDisabled ? undefined : card.trackingId}
      aria-pressed={card.selected}
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
          fontSize: 'clamp(2.2rem, 3.5vw, 3.4rem)',
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
            fontSize: 'clamp(1rem, 1.3vw, 1.14rem)',
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

  const handleMoodTypeSelect = (moodType: DailyMoodType) => {
    setSelectedMoodLevel(null)
    setSelectedMoodType(current => (current === moodType ? null : moodType))
  }

  const isFirstPageMoodSelected =
    selectedMoodType !== null && FIRST_PAGE_MOOD_TYPES.has(selectedMoodType)
  const isSecondPageMoodSelected =
    selectedMoodType !== null && SECOND_PAGE_MOOD_TYPES.has(selectedMoodType)

  const currentMoodLabel =
    step === 'intensity'
      ? getLevelLabel(selectedMoodLevel) ?? getMoodLabel(selectedMoodType)
      : getMoodLabel(selectedMoodType)
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
          title: submitting ? '제출 중' : '확인',
          description: '오늘 기분을 저장해요',
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
          onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[5].type),
        },
        {
          slot: 'top-center',
          title: MOOD_OPTIONS[6].label,
          description: MOOD_OPTIONS[6].description,
          trackingId: 'daily-mood-tired',
          selected: selectedMoodType === MOOD_OPTIONS[6].type,
          onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[6].type),
        },
        {
          slot: 'top-right',
          title: '확인',
          description: '강도 선택으로 이동',
          trackingId: 'daily-mood-page-2-confirm',
          disabled: !isSecondPageMoodSelected,
          variant: 'action',
          onSelect: () => {
            if (!isSecondPageMoodSelected) {
              return
            }

            setStep('intensity')
          },
        },
        {
          slot: 'bottom-left',
          title: MOOD_OPTIONS[2].label,
          description: MOOD_OPTIONS[2].description,
          trackingId: 'daily-mood-calm',
          selected: selectedMoodType === MOOD_OPTIONS[2].type,
          onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[2].type),
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
        onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[0].type),
      },
      {
        slot: 'top-center',
        title: MOOD_OPTIONS[1].label,
        description: MOOD_OPTIONS[1].description,
        trackingId: 'daily-mood-sad',
        selected: selectedMoodType === MOOD_OPTIONS[1].type,
        onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[1].type),
      },
      {
        slot: 'top-right',
        title: '확인',
        description: '강도 선택으로 이동',
        trackingId: 'daily-mood-page-1-confirm',
        disabled: !isFirstPageMoodSelected,
        variant: 'action',
        onSelect: () => {
          if (!isFirstPageMoodSelected) {
            return
          }

          setStep('intensity')
        },
      },
      {
        slot: 'bottom-left',
        title: MOOD_OPTIONS[3].label,
        description: MOOD_OPTIONS[3].description,
        trackingId: 'daily-mood-joyful',
        selected: selectedMoodType === MOOD_OPTIONS[3].type,
        onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[3].type),
      },
      {
        slot: 'bottom-center',
        title: MOOD_OPTIONS[4].label,
        description: MOOD_OPTIONS[4].description,
        trackingId: 'daily-mood-anxious',
        selected: selectedMoodType === MOOD_OPTIONS[4].type,
        onSelect: () => handleMoodTypeSelect(MOOD_OPTIONS[4].type),
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
  }, [
    handleMoodTypeSelect,
    isFirstPageMoodSelected,
    isSecondPageMoodSelected,
    onSubmit,
    selectedMoodLevel,
    selectedMoodType,
    step,
    submitting,
  ])

  const cellTargets = useMemo<PatientSixCellTrackingIds>(() => {
    const slots: Record<GridSlot, string | null> = {
      'top-left': null,
      'top-center': null,
      'top-right': null,
      'bottom-left': null,
      'bottom-center': null,
      'bottom-right': null,
    }

    actionCards.forEach(card => {
      slots[card.slot] = card.disabled || !card.trackingId ? null : card.trackingId
    })

    return [
      slots['top-left'],
      slots['top-center'],
      slots['top-right'],
      slots['bottom-left'],
      slots['bottom-center'],
      slots['bottom-right'],
    ]
  }, [actionCards])

  usePatientPageCellMapping(cellTargets)

  if (!visible) {
    return null
  }

  return (
    <div
      className="patient-daily-mood-overlay"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={pageTitle}
    >
      <style>{overlayCss}</style>
      <div style={pageStyle}>
        <div
          className="patient-daily-mood-grid"
          style={gridStyle}
          ref={dwellFeedback.setContainerElement}
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
                    ? '기분을 고른 뒤 우측 상단 확인으로 강도를 선택하세요.'
                    : '기분을 고른 뒤 우측 상단 확인으로 강도를 선택하거나 다음으로 넘길 수 있어요.'}
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

