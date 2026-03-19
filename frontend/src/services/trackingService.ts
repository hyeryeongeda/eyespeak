export const TRACKING_TARGET_ATTRIBUTE = 'data-tracking-id'

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
