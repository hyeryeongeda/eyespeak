import type {
  CustomTalkKeyboardGroup,
  CustomTalkKeyboardOption,
  CustomTalkKeyboardPageResult,
  KeyboardRootMenu,
} from '../../features/patient/talk/types/customTalk'
import {
  CUSTOM_TALK_KEYBOARD_ENDING_OPTIONS,
  CUSTOM_TALK_KEYBOARD_GROUPS,
  CUSTOM_TALK_KEYBOARD_ROOT_OPTIONS,
} from '../../mocks/customTalk/customKeyboard.mock'

const KEYBOARD_PAGE_SIZE = 4

function toGroupOption(group: CustomTalkKeyboardGroup): CustomTalkKeyboardOption {
  return {
    id: group.id,
    label: group.label,
    value: group.id,
    description: group.description,
    kind: 'group',
  }
}

function toCharOptions(group: CustomTalkKeyboardGroup) {
  return group.values.map((value, index) => ({
    id: `${group.id}-${index + 1}`,
    label: value === ' ' ? '띄어쓰기' : value,
    value,
    description: '문장에 바로 입력',
    kind: 'char' as const,
  }))
}

function paginate(options: CustomTalkKeyboardOption[], page: number): CustomTalkKeyboardPageResult {
  const startIndex = page * KEYBOARD_PAGE_SIZE
  const nextOptions = options.slice(startIndex, startIndex + KEYBOARD_PAGE_SIZE)

  return {
    options: nextOptions,
    canGoNext: startIndex + KEYBOARD_PAGE_SIZE < options.length,
  }
}

export function getKeyboardRootPage() {
  return paginate(CUSTOM_TALK_KEYBOARD_ROOT_OPTIONS, 0)
}

export function getKeyboardGroupPage(rootMenu: Exclude<KeyboardRootMenu, 'ending'>, page: number) {
  const groups = CUSTOM_TALK_KEYBOARD_GROUPS.filter(group => group.rootMenu === rootMenu).map(
    toGroupOption,
  )

  return paginate(groups, page)
}

export function getKeyboardCharPage(
  rootMenu: KeyboardRootMenu,
  groupId: string | undefined,
  page: number,
) {
  if (rootMenu === 'ending') {
    return paginate(CUSTOM_TALK_KEYBOARD_ENDING_OPTIONS, page)
  }

  const group = CUSTOM_TALK_KEYBOARD_GROUPS.find(item => item.id === groupId)

  if (!group) {
    return null
  }

  return paginate(toCharOptions(group), page)
}
