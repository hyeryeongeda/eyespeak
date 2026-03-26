import type {
  CustomTalkKeyboardGroup,
  CustomTalkKeyboardOption,
} from '../types'

export const CUSTOM_TALK_KEYBOARD_ROOT_OPTIONS: CustomTalkKeyboardOption[] = [
  {
    id: 'root-consonant',
    label: '\uc790\uc74c',
    value: 'consonant',
    description: '\ucd08\uc131\uc774\ub098 \ubc1b\uce68 \uc790\uc74c\uc744 \uace0\ub985\ub2c8\ub2e4.',
    kind: 'root',
  },
  {
    id: 'root-vowel',
    label: '\ubaa8\uc74c',
    value: 'vowel',
    description:
      '\uae30\ubcf8, \ud655\uc7a5, \ubcf5\ud569 \ubaa8\uc74c \ud398\uc774\uc9c0\ub85c \uc774\ub3d9\ud569\ub2c8\ub2e4.',
    kind: 'root',
  },
  {
    id: 'root-ending',
    label: '\ubb38\uc7a5\ubd80\ud638',
    value: 'ending',
    description:
      '\ub9c8\uce68\ud45c, \ubb3c\uc74c\ud45c, \ub290\ub08c\ud45c, \ub744\uc5b4\uc4f0\uae30\ub97c \uc785\ub825\ud569\ub2c8\ub2e4.',
    kind: 'root',
  },
  {
    id: 'root-number',
    label: '\uc22b\uc790',
    value: 'number',
    description: '0\ubd80\ud130 9\uae4c\uc9c0 \uc22b\uc790\ub97c \uc785\ub825\ud569\ub2c8\ub2e4.',
    kind: 'root',
  },
]

export const CUSTOM_TALK_KEYBOARD_GROUPS: CustomTalkKeyboardGroup[] = [
  {
    id: 'con-basic-1',
    rootMenu: 'consonant',
    label: '\uae30\ubcf8 \uc790\uc74c 1',
    description: '\u3131\ubd80\ud130 \u3147\uae4c\uc9c0 \uae30\ubcf8 \uc790\uc74c\uc785\ub2c8\ub2e4.',
    values: ['\u3131', '\u3134', '\u3137', '\u3139', '\u3141', '\u3142', '\u3145', '\u3147'],
  },
  {
    id: 'con-basic-2',
    rootMenu: 'consonant',
    label: '\uae30\ubcf8 \uc790\uc74c 2',
    description: '\u3148\ubd80\ud130 \u314e\uae4c\uc9c0 \uae30\ubcf8 \uc790\uc74c\uc785\ub2c8\ub2e4.',
    values: ['\u3148', '\u314a', '\u314b', '\u314c', '\u314d', '\u314e'],
  },
  {
    id: 'con-double',
    rootMenu: 'consonant',
    label: '\uc30d\uc790\uc74c',
    description: '\uac15\ud55c \ubc1c\uc74c \uc790\uc74c\uc744 \uace0\ub985\ub2c8\ub2e4.',
    values: ['\u3132', '\u3138', '\u3143', '\u3146', '\u3149'],
  },
  {
    id: 'vowel-basic',
    rootMenu: 'vowel',
    label: '\uae30\ubcf8 \ubaa8\uc74c',
    description: '\u314f, \u3153, \u3157, \u315c \uacc4\uc5f4 \ubaa8\uc74c\uc785\ub2c8\ub2e4.',
    values: ['\u314f', '\u3151', '\u3153', '\u3155', '\u3157', '\u315b', '\u315c', '\u3160'],
  },
  {
    id: 'vowel-extra',
    rootMenu: 'vowel',
    label: '\ud655\uc7a5 \ubaa8\uc74c',
    description:
      '\u3161, \u3163\uc640 \u3150, \u3154 \uacc4\uc5f4 \ubaa8\uc74c\uc785\ub2c8\ub2e4.',
    values: ['\u3161', '\u3163', '\u3150', '\u3154', '\u3152', '\u3156'],
  },
  {
    id: 'vowel-complex',
    rootMenu: 'vowel',
    label: '\ubcf5\ud569 \ubaa8\uc74c',
    description:
      '\u3158, \u3159, \u315a, \u315d, \u315e, \u315f, \u3162\ub97c \ubc14\ub85c \uace0\ub985\ub2c8\ub2e4.',
    values: ['\u3158', '\u3159', '\u315a', '\u315d', '\u315e', '\u315f', '\u3162'],
  },
  {
    id: 'number-low',
    rootMenu: 'number',
    label: '\uc22b\uc790 1',
    description: '0\ubd80\ud130 4\uae4c\uc9c0\uc785\ub2c8\ub2e4.',
    values: ['0', '1', '2', '3', '4'],
  },
  {
    id: 'number-high',
    rootMenu: 'number',
    label: '\uc22b\uc790 2',
    description: '5\ubd80\ud130 9\uae4c\uc9c0\uc785\ub2c8\ub2e4.',
    values: ['5', '6', '7', '8', '9'],
  },
]

export const CUSTOM_TALK_KEYBOARD_ENDING_OPTIONS: CustomTalkKeyboardOption[] = [
  {
    id: 'ending-period',
    label: '\ub9c8\uce68\ud45c .',
    value: '.',
    description: '\ubb38\uc7a5\uc744 \ub9c8\uce69\ub2c8\ub2e4.',
    kind: 'char',
  },
  {
    id: 'ending-question',
    label: '\ubb3c\uc74c\ud45c ?',
    value: '?',
    description: '\uc9c8\ubb38 \ubb38\uc7a5\uc73c\ub85c \ub9cc\ub4ed\ub2c8\ub2e4.',
    kind: 'char',
  },
  {
    id: 'ending-exclamation',
    label: '\ub290\ub08c\ud45c !',
    value: '!',
    description: '\uac15\uc870 \ud45c\ud604\uc744 \ub123\uc2b5\ub2c8\ub2e4.',
    kind: 'char',
  },
  {
    id: 'ending-space',
    label: '\ub744\uc5b4\uc4f0\uae30',
    value: ' ',
    description: '\uacf5\ubc31\uc744 \uc785\ub825\ud569\ub2c8\ub2e4.',
    kind: 'char',
  },
]
