export const CUSTOM_TALK_SELECTION_SCOPE_ID = 'custom-talk'

export const CUSTOM_TALK_CARD_SELECTOR =
  '.custom-talk-entry-card, .custom-talk-guardian-prompt-card'

export const CUSTOM_TALK_SELECTION_SCOPE_SELECTOR =
  `[data-gaze-selection-scope="${CUSTOM_TALK_SELECTION_SCOPE_ID}"]`

export const CUSTOM_TALK_SELECTABLE_GROUP_SELECTOR =
  `[data-gaze-selectable-group="${CUSTOM_TALK_SELECTION_SCOPE_ID}"]`

export function getCustomTalkSelectableGroupElement() {
  if (typeof document === 'undefined') {
    return null
  }

  const groupElement = document.querySelector<HTMLElement>(CUSTOM_TALK_SELECTABLE_GROUP_SELECTOR)

  if (!groupElement?.closest(CUSTOM_TALK_SELECTION_SCOPE_SELECTOR)) {
    return null
  }

  return groupElement
}

export function isCustomTalkSelectableGroupElement(element: HTMLElement | null) {
  if (!element) {
    return false
  }

  const groupElement = element.closest<HTMLElement>(CUSTOM_TALK_SELECTABLE_GROUP_SELECTOR)

  return Boolean(groupElement?.closest(CUSTOM_TALK_SELECTION_SCOPE_SELECTOR))
}
