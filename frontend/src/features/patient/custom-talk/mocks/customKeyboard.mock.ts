import type {
  CustomTalkKeyboardGroup,
  CustomTalkKeyboardOption,
} from '../types'

export const CUSTOM_TALK_KEYBOARD_ROOT_OPTIONS: CustomTalkKeyboardOption[] = [
  {
    id: 'root-consonant',
    label: '자음',
    value: 'consonant',
    description: 'ㄱ ~ ㅎ 그룹',
    kind: 'root',
  },
  {
    id: 'root-vowel',
    label: '모음',
    value: 'vowel',
    description: 'ㅏ ~ ㅣ 그룹',
    kind: 'root',
  },
  {
    id: 'root-ending',
    label: '끝표시',
    value: 'ending',
    description: '마침표, 물음표, 띄어쓰기',
    kind: 'root',
  },
  {
    id: 'root-number',
    label: '숫자',
    value: 'number',
    description: '0 ~ 9 그룹',
    kind: 'root',
  },
]

export const CUSTOM_TALK_KEYBOARD_GROUPS: CustomTalkKeyboardGroup[] = [
  {
    id: 'con-basic-1',
    rootMenu: 'consonant',
    label: '기본 자음 1',
    description: 'ㄱ, ㄴ, ㄷ, ㄹ',
    values: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'],
  },
  {
    id: 'con-basic-2',
    rootMenu: 'consonant',
    label: '기본 자음 2',
    description: 'ㅈ, ㅊ, ㅋ, ㅌ',
    values: ['ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'],
  },
  {
    id: 'con-double',
    rootMenu: 'consonant',
    label: '된소리',
    description: 'ㄲ, ㄸ, ㅃ, ㅆ',
    values: ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'],
  },
  {
    id: 'vowel-basic',
    rootMenu: 'vowel',
    label: '기본 모음',
    description: 'ㅏ, ㅓ, ㅗ, ㅜ',
    values: ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅑ', 'ㅕ'],
  },
  {
    id: 'vowel-extra',
    rootMenu: 'vowel',
    label: '확장 모음',
    description: 'ㅐ, ㅔ, ㅛ, ㅠ',
    values: ['ㅐ', 'ㅔ', 'ㅛ', 'ㅠ', 'ㅒ', 'ㅖ', 'ㅘ', 'ㅝ'],
  },
  {
    id: 'number-low',
    rootMenu: 'number',
    label: '숫자 1',
    description: '0 ~ 4',
    values: ['0', '1', '2', '3', '4'],
  },
  {
    id: 'number-high',
    rootMenu: 'number',
    label: '숫자 2',
    description: '5 ~ 9',
    values: ['5', '6', '7', '8', '9'],
  },
]

export const CUSTOM_TALK_KEYBOARD_ENDING_OPTIONS: CustomTalkKeyboardOption[] = [
  {
    id: 'ending-period',
    label: '마침 .',
    value: '.',
    description: '문장 마침',
    kind: 'char',
  },
  {
    id: 'ending-question',
    label: '물음 ?',
    value: '?',
    description: '질문 마침',
    kind: 'char',
  },
  {
    id: 'ending-exclamation',
    label: '느낌 !',
    value: '!',
    description: '강조 마침',
    kind: 'char',
  },
  {
    id: 'ending-space',
    label: '띄어쓰기',
    value: ' ',
    description: '공백 입력',
    kind: 'char',
  },
]
