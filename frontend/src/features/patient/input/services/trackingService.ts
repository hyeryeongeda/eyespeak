export const TRACKING_TARGET_ATTRIBUTE = 'data-tracking-id'
export const LOCAL_GAZE_SELECTION_ATTRIBUTE = 'data-gaze-selection'
export const LOCAL_GAZE_ONLY_VALUE = 'local'
export const MOUSE_ONLY_GAZE_VALUE = 'mouse-only'

const INTERACTIVE_ELEMENT_SELECTOR = [
  'button',
  'a[href]',
  'input[type="button"]',
  'input[type="submit"]',
  '[role="button"]',
].join(', ')

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

    const interactiveElement = element.closest<HTMLElement>(INTERACTIVE_ELEMENT_SELECTOR)

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
  cellMapping: Record<number, string | null> | null,
): HTMLElement | null {
  if (cell === null || !cellMapping) {
    return null
  }

  const trackingId = cellMapping[cell]
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
  cellMapping: Record<number, string | null> | null,
): TTarget | null {
  if (cell === null || !cellMapping) {
    return null
  }

  const trackingId = cellMapping[cell]
  return (trackingId ?? null) as TTarget | null
}

function isInteractiveElementDisabled(element: HTMLElement) {
  if (element.matches(':disabled')) {
    return true
  }

  return element.getAttribute('aria-disabled') === 'true'
}
