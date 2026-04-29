import { useMemo, type CSSProperties } from 'react'
import DwellFeedbackBadge from '../../input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
} from '../../input/hooks/useDwellFeedback'
import usePatientPageCellMapping, {
  type PatientSixCellTrackingIds,
} from '../../input/hooks/usePatientPageCellMapping'
import usePatientGlobalMenuActionTarget from '../../input/hooks/usePatientGlobalMenuActionTarget'
import type {
  PatientChatCategoryState,
  PatientChatFallbackState,
  PatientChatManualInputMode,
  PatientChatMessage,
  PatientChatRecommendationMode,
  PatientChatSessionStatus,
  PatientChatSuggestionState,
  PatientRecommendationCategory,
  PatientSuggestedResponse,
} from '../../../../types/chat'
import type { RecommendationCategoryKey } from '../../../../types/recommendation'

interface ReplyModePanelProps {
  message: PatientChatMessage | null
  status: PatientChatSessionStatus
  recommendationMode: PatientChatRecommendationMode
  categoryState: PatientChatCategoryState
  categories: PatientRecommendationCategory[]
  selectedCategoryKey: RecommendationCategoryKey | null
  categoryPage: number
  suggestionState: PatientChatSuggestionState
  fallbackState: PatientChatFallbackState
  suggestions: PatientSuggestedResponse[]
  selectedSuggestionId: string | null
  suggestionError: string | null
  sendError: string | null
  manualInputMode: PatientChatManualInputMode | null
  manualDraft: string
  manualWordBank: string[]
  unresolvedCount: number
  timeoutMs: number
  overlay?: boolean
  onSelectCategory: (categoryKey: RecommendationCategoryKey) => void
  onChangeCategoryPage: (page: number) => void
  onSelectSuggestion: (suggestion: PatientSuggestedResponse) => void
  onRetrySuggestions: () => void
  onOpenManualInputSelect: () => void
  onSelectManualInputMode: (mode: PatientChatManualInputMode) => void
  onDraftChange: (draft: string) => void
  onAppendWord: (word: string) => void
  onClearDraft: () => void
  onSendManualReply: () => void
  onDefer: () => void
  onClose: () => void
  onOpenLatestPendingReply: () => void
}

type SuggestionCard = {
  id: string
  label: string
  suggestion: PatientSuggestedResponse
  disabled?: boolean
}

type CategoryTone = 'sky' | 'sand' | 'mint' | 'slate'

type ReplyTrackingId =
  | 'reply-category-1'
  | 'reply-category-2'
  | 'reply-category-3'
  | 'reply-category-prev'
  | 'reply-category-next'
  | 'reply-suggestion-1'
  | 'reply-suggestion-2'
  | 'reply-suggestion-3'
  | 'reply-suggestion-4'
  | 'reply-refresh'
  | 'reply-back'

const CATEGORY_PAGE_SIZE = 3

const overlayWrapStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: 0,
  background: 'linear-gradient(180deg, #f4f7fb 0%, #edf2f7 100%)',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'stretch',
  zIndex: 1120,
  overflow: 'hidden',
}

const panelStyle: CSSProperties = {
  width: '100%',
  minHeight: '100dvh',
  height: '100%',
  padding: '8px',
  background: 'linear-gradient(180deg, #f6f4f1 0%, #f8f7f4 100%)',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  overflow: 'hidden',
  position: 'relative',
}

const metaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 14px',
  borderRadius: '999px',
  backgroundColor: '#eef3fb',
  color: '#6b7e9d',
  fontSize: '14px',
  fontWeight: 800,
}

const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const categoryGridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 0.98fr) minmax(0, 1fr)',
  gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
  gridTemplateAreas: `
    "top-left center top-right"
    "bottom-left center bottom-right"
  `,
  gap: '8px',
}

const cardBaseStyle: CSSProperties = {
  borderRadius: '18px',
  border: '1px solid #d9dee5',
  backgroundColor: '#ffffff',
  boxShadow: '0 10px 26px rgba(76, 91, 108, 0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0,
  minHeight: 0,
  padding: '18px',
  textAlign: 'center',
  boxSizing: 'border-box',
  position: 'relative',
}

const inlineWrapStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  flex: 1,
  minHeight: 0,
}

const categoryCenterPanelStyle: CSSProperties = {
  gridArea: 'center',
  minHeight: 0,
  borderRadius: '18px',
  border: '1px solid #d8dade',
  background: 'linear-gradient(180deg, #e8e7e6 0%, #e2e2e2 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.52)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const categoryCenterBodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  padding: '18px',
}

const categoryCenterMessageWrapStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '18px',
}

const categoryCenterMessageTextStyle: CSSProperties = {
  margin: 0,
  maxWidth: '84%',
  padding: '16px 22px',
  borderRadius: '6px',
  color: '#4a4f56',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(219, 223, 228, 0.92)',
  boxShadow: '0 10px 22px rgba(110, 116, 124, 0.08)',
  fontSize: 'clamp(1rem, 1.35vmax, 1.2rem)',
  fontWeight: 800,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'keep-all',
  textAlign: 'center',
}

function getCategoryCardStyle(
  gridArea: CSSProperties['gridArea'],
  tone: CategoryTone,
  disabled: boolean,
  selected: boolean,
): CSSProperties {
  const backgrounds: Record<CategoryTone, string> = {
    sky: 'linear-gradient(180deg, #f0f1ff 0%, #eaecff 100%)',
    sand: 'linear-gradient(180deg, #fff5c9 0%, #fff1b6 100%)',
    mint: 'linear-gradient(180deg, #f3fbfb 0%, #eef8f8 100%)',
    slate: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
  }

  return {
    ...cardBaseStyle,
    gridArea,
    appearance: 'none',
    cursor: disabled ? 'default' : 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '8px',
    padding: '22px 18px',
    background: backgrounds[tone],
    opacity: disabled ? 0.58 : 1,
    border:
      selected
        ? '2px solid #7e9dcc'
        : tone === 'slate'
          ? '1px solid #d5dbe2'
          : cardBaseStyle.border,
    boxShadow: selected
      ? '0 18px 40px rgba(94, 121, 165, 0.16)'
      : '0 10px 26px rgba(76, 91, 108, 0.06)',
  }
}

const categoryTitleStyle: CSSProperties = {
  margin: 0,
  maxWidth: '12ch',
  color: '#111111',
  fontSize: 'clamp(2.25rem, 4.1vmin, 3.5rem)',
  fontWeight: 900,
  lineHeight: 1.28,
  letterSpacing: '-0.03em',
  wordBreak: 'keep-all',
  whiteSpace: 'pre-wrap',
}

const pagerWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
}

const pagerButtonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid #d6dee8',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  borderRadius: '999px',
  minHeight: '38px',
  padding: '0 14px',
  color: '#42536b',
  fontSize: '13px',
  fontWeight: 800,
  cursor: 'pointer',
  position: 'relative',
}

const floatingPagerWrapStyle: CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  zIndex: 2,
}

const panelCss = `
  @media (max-width: 940px) {
    .reply-mode-category-grid,
    .reply-mode-sentence-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: minmax(240px, 0.9fr) minmax(0, 1fr) minmax(0, 1fr) !important;
      grid-template-areas:
        "center center"
        "top-left top-right"
        "bottom-left bottom-right" !important;
    }
  }

  @media (max-width: 680px) {
    .reply-mode-category-grid,
    .reply-mode-sentence-grid {
      grid-template-columns: 1fr !important;
      grid-template-rows: auto !important;
      grid-template-areas: none !important;
    }

    .reply-mode-category-grid > *,
    .reply-mode-sentence-grid > * {
      grid-area: auto !important;
    }
  }
`

const defaultQuickReplyLabels = ['네', '아니요', '조금만요', '잘 모르겠어요']

function buildSuggestionCards(
  message: PatientChatMessage,
  suggestions: PatientSuggestedResponse[],
): SuggestionCard[] {
  const cards: SuggestionCard[] = suggestions.slice(0, 4).map(suggestion => ({
    id: suggestion.id,
    label: suggestion.label,
    suggestion,
    disabled: false,
  }))

  if (cards.length >= 4) {
    return cards
  }

  const usedLabels = new Set(cards.map(card => card.label))

  while (cards.length < 4) {
    const fallbackLabel =
      defaultQuickReplyLabels.find(label => !usedLabels.has(label)) ??
      defaultQuickReplyLabels[cards.length] ??
      '잘 모르겠어요'

    usedLabels.add(fallbackLabel)

    cards.push({
      id: `${message.id}-fallback-${cards.length + 1}`,
      label: fallbackLabel,
      disabled: false,
      suggestion: {
        id: `${message.id}-fallback-${cards.length + 1}`,
        label: fallbackLabel,
        intentKey: 'fallback',
        source: 'fallback',
        rank: cards.length + 1,
      },
    })
  }

  return cards
}

function getStatusCopy(input: {
  recommendationMode: PatientChatRecommendationMode
  categoryState: PatientChatCategoryState
  suggestionState: PatientChatSuggestionState
  suggestionError: string | null
  sendError: string | null
  timeoutMs: number
  totalCategoryPages: number
  categoryPage: number
  selectedCategoryKey: RecommendationCategoryKey | null
}) {
  if (input.sendError) {
    return input.sendError
  }

  if (input.recommendationMode === 'category') {
    if (input.categoryState === 'loading') {
      return '보호자 메시지에 맞는 카테고리를 준비하고 있습니다.'
    }

    if (input.totalCategoryPages > 1) {
      return `카테고리를 선택해 주세요. ${input.categoryPage + 1}/${input.totalCategoryPages}`
    }

    return '카테고리를 선택하면 추천 문장을 이어서 보여드립니다.'
  }

  if (input.suggestionState === 'failed') {
    return (
      input.suggestionError ??
      '추천 응답을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요.'
    )
  }

  if (input.suggestionState === 'loading') {
    return `추천 문장을 준비하고 있습니다. 약 ${Math.round(input.timeoutMs / 1000)}초 정도 기다려 주세요.`
  }

  if (input.selectedCategoryKey) {
    return '선택한 카테고리에 맞는 문장을 골라 주세요.'
  }

  return '추천 응답을 선택하거나 직접 입력으로 전환할 수 있습니다.'
}

function DwellOnTarget({
  trackingId,
  dwellFeedback,
}: {
  trackingId?: ReplyTrackingId
  dwellFeedback: ReturnType<typeof useDwellFeedback<ReplyTrackingId>>
}) {
  if (!trackingId || !isDwellFeedbackTargetActive(dwellFeedback, trackingId)) {
    return null
  }

  return (
    <DwellFeedbackBadge
      phase={dwellFeedback.phase}
      progress={dwellFeedback.progress}
      remainingMs={dwellFeedback.remainingMs}
    />
  )
}

function CategoryActionCard({
  gridArea,
  tone,
  category,
  trackingId,
  disabled,
  onSelect,
  dwellFeedback,
}: {
  gridArea: CSSProperties['gridArea']
  tone: CategoryTone
  category: PatientRecommendationCategory | null
  trackingId: ReplyTrackingId
  disabled: boolean
  onSelect: () => void
  dwellFeedback: ReturnType<typeof useDwellFeedback<ReplyTrackingId>>
}) {
  const isDisabled = disabled || !category

  return (
    <button
      type="button"
      className="reply-mode-button"
      style={getCategoryCardStyle(gridArea, tone, isDisabled, false)}
      disabled={isDisabled}
      onClick={onSelect}
      data-tracking-id={isDisabled ? undefined : trackingId}
    >
      <DwellOnTarget trackingId={isDisabled ? undefined : trackingId} dwellFeedback={dwellFeedback} />
      <h2 style={categoryTitleStyle}>{category?.title ?? '카테고리'}</h2>
    </button>
  )
}

function SuggestionActionCard({
  gridArea,
  tone,
  label,
  trackingId,
  disabled,
  selected,
  confirmUntilTts,
  onSelect,
  dwellFeedback,
}: {
  gridArea: CSSProperties['gridArea']
  tone: CategoryTone
  label: string
  trackingId: ReplyTrackingId
  disabled: boolean
  selected: boolean
  confirmUntilTts?: boolean
  onSelect: () => void
  dwellFeedback: ReturnType<typeof useDwellFeedback<ReplyTrackingId>>
}) {
  return (
    <button
      type="button"
      className="reply-mode-button"
      style={getCategoryCardStyle(gridArea, tone, disabled, selected)}
      disabled={disabled}
      onClick={onSelect}
      data-tracking-id={disabled ? undefined : trackingId}
      data-patient-confirm-until-tts={
        !disabled && confirmUntilTts ? 'true' : undefined
      }
    >
      <DwellOnTarget trackingId={disabled ? undefined : trackingId} dwellFeedback={dwellFeedback} />
      <h2 style={categoryTitleStyle}>{label}</h2>
    </button>
  )
}

export default function ReplyModePanel(props: ReplyModePanelProps) {
  const {
    message,
    status,
    recommendationMode,
    categoryState,
    categories,
    selectedCategoryKey,
    categoryPage,
    suggestionState,
    suggestions,
    selectedSuggestionId,
    suggestionError,
    sendError,
    unresolvedCount,
    timeoutMs,
    overlay = false,
    onSelectCategory,
    onChangeCategoryPage,
    onSelectSuggestion,
    onRetrySuggestions,
    onClose,
  } = props

  const isSending = status === 'sending'
  const suggestionCards = useMemo(
    () => (message ? buildSuggestionCards(message, suggestions) : []),
    [message, suggestions],
  )
  const topCards = useMemo(() => suggestionCards.slice(0, 3), [suggestionCards])
  const totalCategoryPages = Math.max(1, Math.ceil(categories.length / CATEGORY_PAGE_SIZE))
  const safeCategoryPage = Math.min(categoryPage, Math.max(totalCategoryPages - 1, 0))
  const visibleCategories = useMemo(
    () =>
      categories.slice(
        safeCategoryPage * CATEGORY_PAGE_SIZE,
        safeCategoryPage * CATEGORY_PAGE_SIZE + CATEGORY_PAGE_SIZE,
      ),
    [categories, safeCategoryPage],
  )
  const firstVisibleCategory = visibleCategories[0] ?? null
  const secondVisibleCategory = visibleCategories[1] ?? null
  const thirdVisibleCategory = visibleCategories[2] ?? null
  const firstTopCard = topCards[0] ?? null
  const secondTopCard = topCards[1] ?? null
  const thirdTopCard = topCards[2] ?? null
  const statusCopy = getStatusCopy({
    recommendationMode,
    categoryState,
    suggestionState,
    suggestionError,
    sendError,
    timeoutMs,
    totalCategoryPages,
    categoryPage: safeCategoryPage,
    selectedCategoryKey,
  })
  const dwellFeedback = useDwellFeedback<ReplyTrackingId>({
    enabled: overlay,
  })

  const cellTargets = useMemo<PatientSixCellTrackingIds>(() => {
    if (recommendationMode === 'category') {
      return [
        firstVisibleCategory && !isSending ? 'reply-category-1' : null,
        null,
        secondVisibleCategory && !isSending ? 'reply-category-2' : null,
        thirdVisibleCategory && !isSending ? 'reply-category-3' : null,
        null,
        !isSending ? 'reply-back' : null,
      ]
    }

    return [
      firstTopCard && !isSending && suggestionState !== 'loading' ? 'reply-suggestion-1' : null,
      null,
      secondTopCard && !isSending && suggestionState !== 'loading' ? 'reply-suggestion-2' : null,
      thirdTopCard && !isSending && suggestionState !== 'loading' ? 'reply-suggestion-3' : null,
      null,
      !isSending ? 'reply-back' : null,
    ]
  }, [
    firstTopCard,
    firstVisibleCategory,
    isSending,
    categoryState,
    recommendationMode,
    secondTopCard,
    secondVisibleCategory,
    suggestionState,
    thirdTopCard,
    thirdVisibleCategory,
  ])

  usePatientPageCellMapping(cellTargets)

  usePatientGlobalMenuActionTarget({
    enabled: overlay,
    priority: 320,
    onPositiveAction:
      recommendationMode === 'category'
        ? !isSending && firstVisibleCategory
          ? () => onSelectCategory(firstVisibleCategory.key)
          : undefined
        : !isSending && firstTopCard && suggestionState !== 'loading'
          ? () => onSelectSuggestion(firstTopCard.suggestion)
          : suggestionState === 'failed'
            ? onRetrySuggestions
            : undefined,
    onNegativeAction: onClose,
  })

  if (!message) {
    return null
  }

  const sentenceContent = (
    <div style={categoryGridStyle} className="reply-mode-sentence-grid">
      <SuggestionActionCard
        gridArea="top-left"
        tone="sky"
        label={suggestionState === 'loading' ? '답변 준비 중' : firstTopCard?.label ?? '답변1'}
        trackingId="reply-suggestion-1"
        disabled={!firstTopCard || isSending || suggestionState === 'loading'}
        selected={selectedSuggestionId === firstTopCard?.id}
        confirmUntilTts
        onSelect={() => {
          if (firstTopCard) {
            onSelectSuggestion(firstTopCard.suggestion)
          }
        }}
        dwellFeedback={dwellFeedback}
      />

      <SuggestionActionCard
        gridArea="top-right"
        tone="mint"
        label={suggestionState === 'loading' ? '답변 준비 중' : secondTopCard?.label ?? '답변2'}
        trackingId="reply-suggestion-2"
        disabled={!secondTopCard || isSending || suggestionState === 'loading'}
        selected={selectedSuggestionId === secondTopCard?.id}
        confirmUntilTts
        onSelect={() => {
          if (secondTopCard) {
            onSelectSuggestion(secondTopCard.suggestion)
          }
        }}
        dwellFeedback={dwellFeedback}
      />

      <section style={categoryCenterPanelStyle} aria-label="읽기 전용 채팅 영역">
        <div style={categoryCenterBodyStyle}>
          <div style={categoryCenterMessageWrapStyle} aria-live="polite">
            <p style={categoryCenterMessageTextStyle}>{message.content || '내용 없음'}</p>
          </div>
        </div>
      </section>

      <SuggestionActionCard
        gridArea="bottom-left"
        tone="sand"
        label={suggestionState === 'loading' ? '답변 준비 중' : thirdTopCard?.label ?? '답변3'}
        trackingId="reply-suggestion-3"
        disabled={!thirdTopCard || isSending || suggestionState === 'loading'}
        selected={selectedSuggestionId === thirdTopCard?.id}
        confirmUntilTts
        onSelect={() => {
          if (thirdTopCard) {
            onSelectSuggestion(thirdTopCard.suggestion)
          }
        }}
        dwellFeedback={dwellFeedback}
      />

      <button
        type="button"
        className="reply-mode-button"
        style={getCategoryCardStyle('bottom-right', 'slate', isSending, false)}
        disabled={isSending}
        onClick={onClose}
        data-tracking-id={isSending ? undefined : 'reply-back'}
      >
        <DwellOnTarget
          trackingId={isSending ? undefined : 'reply-back'}
          dwellFeedback={dwellFeedback}
        />
        <h2 style={categoryTitleStyle}>뒤로가기</h2>
      </button>
    </div>
  )

  const categoryContent = (
    <div style={categoryGridStyle} className="reply-mode-category-grid">
      <CategoryActionCard
        gridArea="top-left"
        tone="sky"
        category={firstVisibleCategory}
        trackingId="reply-category-1"
        disabled={isSending || categoryState === 'loading'}
        onSelect={() => {
          if (firstVisibleCategory) {
            void onSelectCategory(firstVisibleCategory.key)
          }
        }}
        dwellFeedback={dwellFeedback}
      />

      <CategoryActionCard
        gridArea="top-right"
        tone="mint"
        category={secondVisibleCategory}
        trackingId="reply-category-2"
        disabled={isSending || categoryState === 'loading'}
        onSelect={() => {
          if (secondVisibleCategory) {
            void onSelectCategory(secondVisibleCategory.key)
          }
        }}
        dwellFeedback={dwellFeedback}
      />

      <section style={categoryCenterPanelStyle} aria-label="읽기 전용 채팅 영역">
        <div style={categoryCenterBodyStyle}>
          <div style={categoryCenterMessageWrapStyle} aria-live="polite">
            <p style={categoryCenterMessageTextStyle}>{message.content || '내용 없음'}</p>
          </div>
        </div>
      </section>

      <CategoryActionCard
        gridArea="bottom-left"
        tone="sand"
        category={thirdVisibleCategory}
        trackingId="reply-category-3"
        disabled={isSending || categoryState === 'loading'}
        onSelect={() => {
          if (thirdVisibleCategory) {
            void onSelectCategory(thirdVisibleCategory.key)
          }
        }}
        dwellFeedback={dwellFeedback}
      />

      <button
        type="button"
        className="reply-mode-button"
        style={getCategoryCardStyle('bottom-right', 'slate', isSending, false)}
        disabled={isSending}
        onClick={onClose}
        data-tracking-id={isSending ? undefined : 'reply-back'}
      >
        <DwellOnTarget
          trackingId={isSending ? undefined : 'reply-back'}
          dwellFeedback={dwellFeedback}
        />
        <h2 style={categoryTitleStyle}>뒤로가기</h2>
      </button>
    </div>
  )

  const pagerControls =
    recommendationMode === 'category' && totalCategoryPages > 1 ? (
      <div style={pagerWrapStyle}>
        <button
          type="button"
          className="reply-mode-button"
          style={pagerButtonStyle}
          onClick={() => onChangeCategoryPage(safeCategoryPage - 1)}
          disabled={safeCategoryPage === 0}
          data-tracking-id={safeCategoryPage === 0 ? undefined : 'reply-category-prev'}
        >
          <DwellOnTarget
            trackingId={safeCategoryPage === 0 ? undefined : 'reply-category-prev'}
            dwellFeedback={dwellFeedback}
          />
          이전
        </button>
        <span style={metaStyle}>
          {safeCategoryPage + 1}/{totalCategoryPages}
        </span>
        <button
          type="button"
          className="reply-mode-button"
          style={pagerButtonStyle}
          onClick={() => onChangeCategoryPage(safeCategoryPage + 1)}
          disabled={safeCategoryPage >= totalCategoryPages - 1}
          data-tracking-id={
            safeCategoryPage >= totalCategoryPages - 1 ? undefined : 'reply-category-next'
          }
        >
          <DwellOnTarget
            trackingId={
              safeCategoryPage >= totalCategoryPages - 1 ? undefined : 'reply-category-next'
            }
            dwellFeedback={dwellFeedback}
          />
          다음
        </button>
      </div>
    ) : null

  const content = (
    <section
      style={panelStyle}
      aria-label="추천 응답"
      ref={dwellFeedback.setContainerElement}
    >
      <style>{panelCss}</style>
      {pagerControls ? <div style={floatingPagerWrapStyle}>{pagerControls}</div> : null}
      <div style={srOnlyStyle}>{`${statusCopy} 대기 ${unresolvedCount}건`}</div>
      {recommendationMode === 'category' ? categoryContent : sentenceContent}
    </section>
  )

  if (!overlay) {
    return <div style={inlineWrapStyle}>{content}</div>
  }

  return (
    <div style={overlayWrapStyle} role="dialog" aria-modal="true" aria-labelledby="guardian-reply-title">
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} id="guardian-reply-title">
        추천 응답
      </div>
      {content}
    </div>
  )
}
