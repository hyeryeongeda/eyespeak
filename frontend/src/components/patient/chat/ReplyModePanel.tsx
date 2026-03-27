import { useMemo, type CSSProperties } from 'react'
import DwellFeedbackBadge from '../../../features/patient/input/components/DwellFeedbackBadge'
import {
  isDwellFeedbackTargetActive,
  useDwellFeedback,
} from '../../../features/patient/input/hooks/useDwellFeedback'
import { useCellMapping } from '../../../features/patient/input/hooks/useCellMapping'
import usePatientGlobalMenuActionTarget from '../../../features/patient/input/hooks/usePatientGlobalMenuActionTarget'
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
} from '../../../types/chat'
import type { RecommendationCategoryKey } from '../../../types/recommendation'

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
  padding: '12px',
  background: 'linear-gradient(180deg, #f4f7fb 0%, #edf2f7 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
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

const gridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gridTemplateRows: 'minmax(0, 1.08fr) minmax(84px, 0.34fr) minmax(0, 1fr)',
  gap: '12px',
}

const categoryGridStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.95fr) minmax(0, 1fr)',
  gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
  gridTemplateAreas: `
    "top-left center top-right"
    "bottom-left center bottom-right"
  `,
  gap: '12px',
}

const cardBaseStyle: CSSProperties = {
  borderRadius: '20px',
  border: '1px solid #d6dee8',
  backgroundColor: '#ffffff',
  boxShadow: '0 8px 24px rgba(41, 57, 79, 0.06)',
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

function getSuggestionCardStyle(selected: boolean, disabled: boolean): CSSProperties {
  return {
    ...cardBaseStyle,
    appearance: 'none',
    cursor: disabled ? 'default' : 'pointer',
    color: '#131313',
    fontSize: 'clamp(2rem, 4vw, 3.2rem)',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    opacity: disabled ? 0.58 : 1,
    border: selected ? '2px solid #7e9dcc' : cardBaseStyle.border,
    background: selected ? 'linear-gradient(180deg, #f6faff 0%, #ebf3ff 100%)' : '#ffffff',
    transform: selected ? 'translateY(-2px)' : 'none',
  }
}

const guardianMessageWrapStyle: CSSProperties = {
  ...cardBaseStyle,
  gridColumn: '1 / -1',
  minHeight: 0,
  alignItems: 'stretch',
  justifyContent: 'center',
  padding: '0 24px',
  background: 'linear-gradient(180deg, #f8fbff 0%, #f1f5fb 100%)',
}

const guardianMessageStyle: CSSProperties = {
  margin: 0,
  color: '#39445b',
  fontSize: 'clamp(1.5rem, 2.3vw, 2.2rem)',
  fontWeight: 800,
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100%',
  textAlign: 'center',
  wordBreak: 'keep-all',
}

const helperButtonStyle: CSSProperties = {
  ...cardBaseStyle,
  appearance: 'none',
  cursor: 'pointer',
  color: '#151515',
  fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
  fontWeight: 900,
  letterSpacing: '-0.04em',
}

const refreshButtonStyle: CSSProperties = {
  ...helperButtonStyle,
  backgroundColor: '#ffffff',
}

const backButtonStyle: CSSProperties = {
  ...helperButtonStyle,
  backgroundColor: '#ffffff',
}

const fallbackButtonStyle: CSSProperties = {
  ...helperButtonStyle,
  backgroundColor: '#ffffff',
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
  borderRadius: '20px',
  border: '1px solid #d6dee8',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #f8fbff 100%)',
  boxShadow: '0 8px 24px rgba(41, 57, 79, 0.08)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const categoryCenterHeaderStyle: CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid #e8eef5',
  color: '#7a889d',
  fontSize: '13px',
  fontWeight: 800,
  letterSpacing: '0.02em',
}

const categoryCenterBodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  padding: '16px',
}

const categoryCenterMessageWrapStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  borderRadius: '24px',
  background: 'linear-gradient(180deg, #ffffff 0%, #f2f6fc 100%)',
  border: '1px solid #dde6f0',
  boxShadow: '0 8px 20px rgba(53, 71, 95, 0.08)',
}

const categoryCenterMessageTextStyle: CSSProperties = {
  margin: 0,
  color: '#22324a',
  fontSize: 'clamp(1.5rem, 2.2vw, 2.15rem)',
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
    sky: 'linear-gradient(180deg, #eef1ff 0%, #e6ebff 100%)',
    sand: 'linear-gradient(180deg, #fff7d8 0%, #fff1b8 100%)',
    mint: 'linear-gradient(180deg, #f0f7f4 0%, #ebf6f4 100%)',
    slate: 'linear-gradient(180deg, #f7f8fc 0%, #edf1f7 100%)',
  }

  return {
    ...cardBaseStyle,
    gridArea,
    appearance: 'none',
    cursor: disabled ? 'default' : 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '10px',
    padding: '22px 20px',
    background: backgrounds[tone],
    opacity: disabled ? 0.58 : 1,
    border: selected ? '2px solid #7e9dcc' : cardBaseStyle.border,
    boxShadow: selected
      ? '0 18px 40px rgba(94, 121, 165, 0.16)'
      : '0 10px 28px rgba(41, 57, 79, 0.06)',
  }
}

const categoryTitleStyle: CSSProperties = {
  margin: 0,
  color: '#1f3047',
  fontSize: 'clamp(1.9rem, 2.7vw, 3rem)',
  fontWeight: 900,
  lineHeight: 1.2,
  wordBreak: 'keep-all',
}

const categoryDescriptionStyle: CSSProperties = {
  margin: 0,
  maxWidth: '14ch',
  color: '#6f8095',
  fontSize: 'clamp(0.92rem, 1.05vw, 1rem)',
  fontWeight: 700,
  lineHeight: 1.5,
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
  .reply-mode-button:hover:not(:disabled),
  .reply-mode-button:focus-visible:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 20px 42px rgba(53, 77, 103, 0.14);
    outline: none;
  }

  @media (max-width: 940px) {
    .reply-mode-category-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-template-rows: repeat(3, minmax(150px, auto)) !important;
      grid-template-areas:
        "top-left top-right"
        "center center"
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
      <h2 style={categoryTitleStyle}>{category?.title ?? '준비 중'}</h2>
      <p style={categoryDescriptionStyle}>
        {category ? category.hint?.trim() || category.description || '' : '카테고리를 불러오는 중입니다.'}
      </p>
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
  const bottomSuggestionCard = suggestionCards[3] ?? null
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

  const cellMapping = useMemo<Record<number, ReplyTrackingId | null>>(() => {
    if (recommendationMode === 'category') {
      return {
        0: firstVisibleCategory && !isSending ? 'reply-category-1' : null,
        1: null,
        2: secondVisibleCategory && !isSending ? 'reply-category-2' : null,
        3: thirdVisibleCategory && !isSending ? 'reply-category-3' : null,
        4: null,
        5: !isSending ? 'reply-back' : null,
      }
    }

    return {
      0: firstTopCard && !isSending && suggestionState !== 'loading' ? 'reply-suggestion-1' : null,
      1: secondTopCard && !isSending && suggestionState !== 'loading' ? 'reply-suggestion-2' : null,
      2: thirdTopCard && !isSending && suggestionState !== 'loading' ? 'reply-suggestion-3' : null,
      3:
        bottomSuggestionCard && !isSending && suggestionState !== 'loading'
          ? 'reply-suggestion-4'
          : null,
      4: !isSending ? 'reply-refresh' : null,
      5: !isSending ? 'reply-back' : null,
    }
  }, [
    bottomSuggestionCard,
    firstTopCard,
    firstVisibleCategory,
    isSending,
    recommendationMode,
    secondTopCard,
    secondVisibleCategory,
    suggestionState,
    thirdTopCard,
    thirdVisibleCategory,
  ])

  useCellMapping(cellMapping)

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
    <div style={gridStyle} className="reply-mode-sentence-grid">
      {topCards.map((card, index) => {
        const trackingId = (`reply-suggestion-${index + 1}`) as ReplyTrackingId

        return (
          <button
            key={card.id}
            type="button"
            className="reply-mode-button"
            style={getSuggestionCardStyle(
              selectedSuggestionId === card.id,
              isSending || suggestionState === 'loading',
            )}
            disabled={isSending || suggestionState === 'loading'}
            onClick={() => onSelectSuggestion(card.suggestion)}
            data-tracking-id={isSending || suggestionState === 'loading' ? undefined : trackingId}
          >
            <DwellOnTarget
              trackingId={isSending || suggestionState === 'loading' ? undefined : trackingId}
              dwellFeedback={dwellFeedback}
            />
            {suggestionState === 'loading' ? '...' : card.label}
          </button>
        )
      })}

      <div style={guardianMessageWrapStyle}>
        <p style={guardianMessageStyle}>{message.content || '내용 없음'}</p>
      </div>

      <button
        type="button"
        className="reply-mode-button"
        style={fallbackButtonStyle}
        disabled={!bottomSuggestionCard || isSending || suggestionState === 'loading'}
        onClick={() => {
          if (bottomSuggestionCard) {
            onSelectSuggestion(bottomSuggestionCard.suggestion)
          }
        }}
        data-tracking-id={
          !bottomSuggestionCard || isSending || suggestionState === 'loading'
            ? undefined
            : 'reply-suggestion-4'
        }
      >
        <DwellOnTarget
          trackingId={
            !bottomSuggestionCard || isSending || suggestionState === 'loading'
              ? undefined
              : 'reply-suggestion-4'
          }
          dwellFeedback={dwellFeedback}
        />
        {suggestionState === 'loading'
          ? '...'
          : bottomSuggestionCard?.label ?? '잘 모르겠어요'}
      </button>

      <button
        type="button"
        className="reply-mode-button"
        style={refreshButtonStyle}
        disabled={isSending}
        onClick={onRetrySuggestions}
        data-tracking-id={isSending ? undefined : 'reply-refresh'}
      >
        <DwellOnTarget
          trackingId={isSending ? undefined : 'reply-refresh'}
          dwellFeedback={dwellFeedback}
        />
        다시 추천
      </button>

      <button
        type="button"
        className="reply-mode-button"
        style={backButtonStyle}
        disabled={isSending}
        onClick={onClose}
        data-tracking-id={isSending ? undefined : 'reply-back'}
      >
        <DwellOnTarget
          trackingId={isSending ? undefined : 'reply-back'}
          dwellFeedback={dwellFeedback}
        />
        뒤로가기
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
        tone="sand"
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
        <div style={categoryCenterHeaderStyle}>보호자 메시지 읽기</div>
        <div style={categoryCenterBodyStyle}>
          <div style={categoryCenterMessageWrapStyle} aria-live="polite">
            <p style={categoryCenterMessageTextStyle}>{message.content || '?댁슜 ?놁쓬'}</p>
          </div>
        </div>
      </section>

      <CategoryActionCard
        gridArea="bottom-left"
        tone="mint"
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
        <p style={categoryDescriptionStyle}>이전 화면으로 돌아갑니다.</p>
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
      ref={element => {
        dwellFeedback.containerRef.current = element
      }}
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
