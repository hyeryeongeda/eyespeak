import type {
  CustomTalkKeyboardGroup,
  CustomTalkKeyboardOption,
  CustomTalkKeyboardPageResult,
  KeyboardRootMenu,
} from '../types'
import {
  CUSTOM_TALK_KEYBOARD_ENDING_OPTIONS,
  CUSTOM_TALK_KEYBOARD_GROUPS,
  CUSTOM_TALK_KEYBOARD_ROOT_OPTIONS,
} from '../mocks/customKeyboard.mock'
import { isValidHangulFinalConsonant } from './hangulComposer'

const KEYBOARD_PAGE_SIZE = 4
const FINAL_CONSONANT_PAGE_SIZE = 3

type ConsonantSelectionMode = 'initial' | 'final'

function toGroupOption(group: CustomTalkKeyboardGroup): CustomTalkKeyboardOption {
  return {
    id: group.id,
    label: group.label,
    value: group.id,
    description: group.description,
    kind: 'group',
  }
}

function getGroupValues(
  group: CustomTalkKeyboardGroup,
  consonantMode: ConsonantSelectionMode = 'initial',
) {
  if (group.rootMenu !== 'consonant' || consonantMode !== 'final') {
    return group.values
  }

  return group.values.filter(isValidHangulFinalConsonant)
}

function toCharOptions(
  group: CustomTalkKeyboardGroup,
  consonantMode: ConsonantSelectionMode = 'initial',
) {
  return getGroupValues(group, consonantMode).map((value, index) => ({
    id: `${group.id}-${index + 1}`,
    label: value === ' ' ? '띄어쓰기' : value,
    value,
    description: '문장에 바로 입력',
    kind: 'char' as const,
  }))
}

function paginate(
  options: CustomTalkKeyboardOption[],
  page: number,
  pageSize: number = KEYBOARD_PAGE_SIZE,
): CustomTalkKeyboardPageResult {
  const startIndex = page * pageSize
  const nextOptions = options.slice(startIndex, startIndex + pageSize)

  return {
    options: nextOptions,
    canGoNext: startIndex + pageSize < options.length,
  }
}

export function getKeyboardRootPage() {
  return paginate(CUSTOM_TALK_KEYBOARD_ROOT_OPTIONS, 0)
}

export function getKeyboardGroupPage(
  rootMenu: Exclude<KeyboardRootMenu, 'ending'>,
  page: number,
  options?: {
    consonantMode?: ConsonantSelectionMode
  },
) {
  const consonantMode = options?.consonantMode ?? 'initial'
  const groups = CUSTOM_TALK_KEYBOARD_GROUPS.filter(group => group.rootMenu === rootMenu)
    .filter(group => getGroupValues(group, consonantMode).length > 0)
    .map(toGroupOption)

  return paginate(groups, page)
}

export function getKeyboardCharPage(
  rootMenu: KeyboardRootMenu,
  groupId: string | undefined,
  page: number,
  options?: {
    consonantMode?: ConsonantSelectionMode
  },
) {
  if (rootMenu === 'ending') {
    return paginate(CUSTOM_TALK_KEYBOARD_ENDING_OPTIONS, page)
  }

  const group = CUSTOM_TALK_KEYBOARD_GROUPS.find(item => item.id === groupId)

  if (!group) {
    return null
  }

  const consonantMode = options?.consonantMode ?? 'initial'
  const nextOptions = toCharOptions(group, consonantMode)

  if (nextOptions.length === 0) {
    return null
  }

  return paginate(
    nextOptions,
    page,
    rootMenu === 'consonant' && consonantMode === 'final'
      ? FINAL_CONSONANT_PAGE_SIZE
      : KEYBOARD_PAGE_SIZE,
  )
}
