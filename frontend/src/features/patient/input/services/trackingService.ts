export const TRACKING_TARGET_ATTRIBUTE = 'data-tracking-id'
export const LOCAL_GAZE_SELECTION_ATTRIBUTE = 'data-gaze-selection'

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

    if (interactiveElement.closest(`[${LOCAL_GAZE_SELECTION_ATTRIBUTE}="local"]`)) {
      continue
    }

    if (isInteractiveElementDisabled(interactiveElement)) {
      continue
    }

    return interactiveElement
  }

  return null
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

function isInteractiveElementDisabled(element: HTMLElement) {
  if (element.matches(':disabled')) {
    return true
  }

  return element.getAttribute('aria-disabled') === 'true'
}
