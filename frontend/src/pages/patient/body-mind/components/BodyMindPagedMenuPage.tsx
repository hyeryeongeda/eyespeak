import { useMemo, type CSSProperties } from 'react'
import type {
  BodyMindCardOption,
  BodyMindUiStatus,
} from '../../../../features/patient/body-mind/types/bodyMind'
import { useCellMapping } from '../../../../features/patient/input/hooks/useCellMapping'
import type { BodyMindMenuPageDefinition } from '../bodyMindMock'
import BodyMindFixedGrid from './BodyMindFixedGrid'
import BodyMindLayout from './BodyMindLayout'
import BodyMindOptionCard from './BodyMindOptionCard'

const hiddenSlotStyle: CSSProperties = {
  flex: 1,
  visibility: 'hidden',
  pointerEvents: 'none',
}

interface BodyMindPagedMenuPageProps<TOption extends BodyMindCardOption<string>> {
  code: string
  title: string
  description: string
  status: BodyMindUiStatus
  pages: BodyMindMenuPageDefinition<TOption>[]
  pageIndex: number
  feedbackText: string
  contextLabel?: string
  selectedKey?: string | null
  rootBackDescription: string
  previousPageDescription?: string
  nextTitle?: string
  nextDescription?: string
  backTitle?: string
  onSelectOption: (option: TOption) => void
  onPageChange: (pageIndex: number) => void
  onRootBack: () => void
}

function HiddenSlot() {
  return <div aria-hidden style={hiddenSlotStyle} />
}

function getBodyMindTrackingId(key: string) {
  return `body-mind-${key}`
}

export default function BodyMindPagedMenuPage<TOption extends BodyMindCardOption<string>>({
  code,
  title,
  description,
  status,
  pages,
  pageIndex,
  feedbackText,
  contextLabel,
  selectedKey = null,
  rootBackDescription,
  previousPageDescription = '이전 페이지로 이동',
  nextTitle = '다음 ▶',
  nextDescription = '다음 페이지 보기',
  backTitle = '← 뒤로가기',
  onSelectOption,
  onPageChange,
  onRootBack,
}: BodyMindPagedMenuPageProps<TOption>) {
  const currentPage = pages[pageIndex] ?? pages[0]
  const hasNextPage = pageIndex < pages.length - 1
  const primaryOptions = useMemo(() => currentPage?.options.slice(0, 4) ?? [], [currentPage])
  const topRightOption = useMemo(
    () => (hasNextPage ? null : (currentPage?.options[4] ?? null)),
    [currentPage, hasNextPage],
  )
  const cellMapping = useMemo(
    () =>
      ({
        0: primaryOptions[0] ? getBodyMindTrackingId(primaryOptions[0].key) : null,
        1: primaryOptions[1] ? getBodyMindTrackingId(primaryOptions[1].key) : null,
        2: hasNextPage
          ? 'body-mind-next'
          : topRightOption
            ? getBodyMindTrackingId(topRightOption.key)
            : null,
        3: primaryOptions[2] ? getBodyMindTrackingId(primaryOptions[2].key) : null,
        4: primaryOptions[3] ? getBodyMindTrackingId(primaryOptions[3].key) : null,
        5: 'body-mind-back',
      }) as Record<number, string | null>,
    [hasNextPage, primaryOptions, topRightOption],
  )

  useCellMapping(cellMapping, {
    debugLabel: `body-mind-paged-menu:${code}`,
  })

  const handleBack = () => {
    if (pageIndex > 0) {
      onPageChange(pageIndex - 1)
      return
    }

    onRootBack()
  }

  return (
    <BodyMindLayout
      code={code}
      title={title}
      description={description}
      status={status}
      contextLabel={contextLabel ?? `페이지 ${pageIndex + 1} / ${pages.length}`}
      feedbackText={feedbackText}
    >
      <BodyMindFixedGrid
        primaryCards={primaryOptions.map(option => (
          <BodyMindOptionCard
            key={option.key}
            title={option.label}
            description={option.description}
            tone={option.tone}
            trackingId={getBodyMindTrackingId(option.key)}
            selected={selectedKey === option.key}
            onSelect={() => onSelectOption(option)}
          />
        ))}
        topRightCard={
          hasNextPage ? (
            <BodyMindOptionCard
              title={nextTitle}
              description={nextDescription}
              tone="mint"
              trackingId="body-mind-next"
              onSelect={() => onPageChange(pageIndex + 1)}
            />
          ) : topRightOption ? (
            <BodyMindOptionCard
              title={topRightOption.label}
              description={topRightOption.description}
              tone={topRightOption.tone}
              trackingId={getBodyMindTrackingId(topRightOption.key)}
              selected={selectedKey === topRightOption.key}
              onSelect={() => onSelectOption(topRightOption)}
            />
          ) : (
            <HiddenSlot />
          )
        }
        bottomRightCard={
          <BodyMindOptionCard
            title={backTitle}
            description={pageIndex > 0 ? previousPageDescription : rootBackDescription}
            tone="slate"
            trackingId="body-mind-back"
            onSelect={handleBack}
          />
        }
      />
    </BodyMindLayout>
  )
}
