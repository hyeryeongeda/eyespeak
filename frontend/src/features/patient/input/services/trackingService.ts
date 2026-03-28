import {
  getPrimaryTrackingIdFromCell,
  type PatientCellMapping,
} from './patientCellMapping'

export const TRACKING_TARGET_ATTRIBUTE = 'data-tracking-id'
export const LOCAL_GAZE_SELECTION_ATTRIBUTE = 'data-gaze-selection'
export const LOCAL_GAZE_ONLY_VALUE = 'local'
export const MOUSE_ONLY_GAZE_VALUE = 'mouse-only'
export const PATIENT_INTERACTION_MARKER_ATTRIBUTE = 'data-patient-interactive'
export const PATIENT_INTERACTION_STATE_ATTRIBUTE = 'data-interaction-state'
export const PATIENT_INTERACTION_SOURCE_ATTRIBUTE = 'data-interaction-source'
export const PATIENT_INTERACTION_PROGRESS_CSS_VARIABLE = '--dwell-progress'
export const PATIENT_DWELL_CONFIRM_MS = 2000

export type PatientInteractionState =
  | 'idle'
  | 'hover'
  | 'dwell'
  | 'confirmed'
  | 'cooldown'

export const PATIENT_INTERACTIVE_ELEMENT_SELECTOR = [
  'button',
  'a[href]',
  'input[type="button"]',
  'input[type="submit"]',
  '[role="button"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface InteractiveAreaSample {
  offsetX: number
  offsetY: number
  weight: number
}

interface WeightedInteractiveTargetResult {
  element: HTMLElement
  score: number
  hitCount: number
}

const DEFAULT_INTERACTIVE_AREA_SAMPLES: InteractiveAreaSample[] = [
  { offsetX: 0, offsetY: 0, weight: 0.28 },
  { offsetX: 0, offsetY: -1, weight: 0.1 },
  { offsetX: 1, offsetY: 0, weight: 0.1 },
  { offsetX: 0, offsetY: 1, weight: 0.1 },
  { offsetX: -1, offsetY: 0, weight: 0.1 },
  { offsetX: -1, offsetY: -1, weight: 0.08 },
  { offsetX: 1, offsetY: -1, weight: 0.08 },
  { offsetX: 1, offsetY: 1, weight: 0.08 },
  { offsetX: -1, offsetY: 1, weight: 0.08 },
]

export function clampTrackingProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

export function isPointInsideElement(
  clientX: number,
  clientY: number,
  element: HTMLElement | null,
) {
  if (!element) {
    return false
  }

  const rect = element.getBoundingClientRect()

  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

export function getTrackingTargetIdFromPoint<TTarget extends string>(
  clientX: number,
  clientY: number,
  container: HTMLElement | null,
): TTarget | null {
  if (typeof document === 'undefined') {
    return null
  }

  const elements = document.elementsFromPoint(clientX, clientY)

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    const trackedElement = element.closest<HTMLElement>(`[${TRACKING_TARGET_ATTRIBUTE}]`)

    if (!trackedElement) {
      continue
    }

    if (container && !container.contains(trackedElement)) {
      continue
    }

    const targetId = trackedElement.dataset.trackingId

    if (targetId) {
      return targetId as TTarget
    }
  }

  return null
}

export function getInteractiveElementFromPoint(
  clientX: number,
  clientY: number,
  container?: HTMLElement | null,
) {
  if (typeof document === 'undefined') {
    return null
  }

  const elements = document.elementsFromPoint(clientX, clientY)

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    const interactiveElement = element.closest<HTMLElement>(PATIENT_INTERACTIVE_ELEMENT_SELECTOR)

    if (!interactiveElement) {
      continue
    }

    if (container && !container.contains(interactiveElement)) {
      continue
    }

    if (!isInteractiveElementEligibleForGlobalGazeSelection(interactiveElement)) {
      continue
    }

    if (isInteractiveElementDisabled(interactiveElement)) {
      continue
    }

    return interactiveElement
  }

  return null
}

export function getWeightedInteractiveTargetFromArea(
  clientX: number,
  clientY: number,
  options?: {
    container?: HTMLElement | null
    radiusPx?: number
    candidateSelector?: string
  },
): WeightedInteractiveTargetResult | null {
  if (typeof document === 'undefined') {
    return null
  }

  const radiusPx = Math.max(0, options?.radiusPx ?? 0)
  const candidateSelector = options?.candidateSelector
  const weightedHits = new Map<
    HTMLElement,
    { score: number; hitCount: number }
  >()

  for (const sample of DEFAULT_INTERACTIVE_AREA_SAMPLES) {
    const sampleX = clientX + sample.offsetX * radiusPx
    const sampleY = clientY + sample.offsetY * radiusPx
    const element = getInteractiveElementFromPoint(sampleX, sampleY, options?.container)

    if (!element) {
      continue
    }

    const candidate = candidateSelector
      ? element.closest<HTMLElement>(candidateSelector)
      : element

    if (!candidate) {
      continue
    }

    if (options?.container && !options.container.contains(candidate)) {
      continue
    }

    const current = weightedHits.get(candidate)

    if (current) {
      current.score += sample.weight
      current.hitCount += 1
      continue
    }

    weightedHits.set(candidate, {
      score: sample.weight,
      hitCount: 1,
    })
  }

  let bestEntry: WeightedInteractiveTargetResult | null = null

  for (const [element, hit] of weightedHits.entries()) {
    if (
      !bestEntry ||
      hit.score > bestEntry.score ||
      (hit.score === bestEntry.score && hit.hitCount > bestEntry.hitCount)
    ) {
      bestEntry = {
        element,
        score: hit.score,
        hitCount: hit.hitCount,
      }
    }
  }

  return bestEntry
}

export function isInteractiveElementEligibleForGlobalGazeSelection(element: HTMLElement) {
  return !element.closest(
    `[${LOCAL_GAZE_SELECTION_ATTRIBUTE}="${LOCAL_GAZE_ONLY_VALUE}"], ` +
      `[${LOCAL_GAZE_SELECTION_ATTRIBUTE}="${MOUSE_ONLY_GAZE_VALUE}"]`,
  )
}

export function getInteractiveElementSelectionKey(element: HTMLElement) {
  const explicitKey =
    element.dataset.patientTarget ||
    element.dataset.trackingId ||
    element.dataset.leisureSlot ||
    element.id ||
    element.getAttribute('aria-label')

  if (explicitKey) {
    return explicitKey
  }

  const path: string[] = []
  let current: HTMLElement | null = element

  while (current && path.length < 6) {
    const currentTagName = current.tagName
    const parent: HTMLElement | null = current.parentElement

    if (!parent) {
      path.unshift(currentTagName)
      break
    }

    const siblingIndex = Array.from(parent.children)
      .filter((sibling): sibling is HTMLElement => sibling instanceof HTMLElement)
      .filter(sibling => sibling.tagName === currentTagName)
      .indexOf(current)

    path.unshift(`${currentTagName}:${siblingIndex}`)
    current = parent
  }

  return path.join('>')
}

export function getInteractiveElementFromCell(
  cell: number | null,
  cellMapping: PatientCellMapping | null,
): HTMLElement | null {
  if (cell === null || !cellMapping) {
    return null
  }

  const trackingId = getPrimaryTrackingIdFromCell(cell, cellMapping)
  if (!trackingId) {
    return null
  }

  const element = document.querySelector<HTMLElement>(
    `[${TRACKING_TARGET_ATTRIBUTE}="${trackingId}"]`
  )

  if (!element || !element.isConnected || isInteractiveElementDisabled(element)) {
    return null
  }

  return element
}

export function getTrackingTargetIdFromCell<TTarget extends string>(
  cell: number | null,
  cellMapping: PatientCellMapping | null,
): TTarget | null {
  if (cell === null || !cellMapping) {
    return null
  }

  const trackingId = getPrimaryTrackingIdFromCell(cell, cellMapping)
  return (trackingId ?? null) as TTarget | null
}

function isInteractiveElementDisabled(element: HTMLElement) {
  if (
    element.hidden ||
    element.closest('[hidden], [inert], [aria-hidden="true"]') ||
    'inert' in element && Boolean((element as HTMLElement & { inert?: boolean }).inert)
  ) {
    return true
  }

  if (element.matches(':disabled')) {
    return true
  }

  return (
    element.getAttribute('aria-disabled') === 'true' &&
    element.dataset.gazeCommitDisabled !== 'true'
  )
}
