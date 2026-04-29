import type { KeyboardCompositionState } from '../types'

const HANGUL_BASE = 0xac00
const INITIAL_CONSONANTS = [
  '\u3131',
  '\u3132',
  '\u3134',
  '\u3137',
  '\u3138',
  '\u3139',
  '\u3141',
  '\u3142',
  '\u3143',
  '\u3145',
  '\u3146',
  '\u3147',
  '\u3148',
  '\u3149',
  '\u314a',
  '\u314b',
  '\u314c',
  '\u314d',
  '\u314e',
] as const

const MEDIAL_VOWELS = [
  '\u314f',
  '\u3150',
  '\u3151',
  '\u3152',
  '\u3153',
  '\u3154',
  '\u3155',
  '\u3156',
  '\u3157',
  '\u3158',
  '\u3159',
  '\u315a',
  '\u315b',
  '\u315c',
  '\u315d',
  '\u315e',
  '\u315f',
  '\u3160',
  '\u3161',
  '\u3162',
  '\u3163',
] as const

const FINAL_CONSONANTS = [
  '',
  '\u3131',
  '\u3132',
  '\u3133',
  '\u3134',
  '\u3135',
  '\u3136',
  '\u3137',
  '\u3139',
  '\u313a',
  '\u313b',
  '\u313c',
  '\u313d',
  '\u313e',
  '\u313f',
  '\u3140',
  '\u3141',
  '\u3142',
  '\u3144',
  '\u3145',
  '\u3146',
  '\u3147',
  '\u3148',
  '\u314a',
  '\u314b',
  '\u314c',
  '\u314d',
  '\u314e',
] as const

const COMPOUND_VOWEL_COMPONENTS = {
  '\u3158': ['\u3157', '\u314f'],
  '\u3159': ['\u3157', '\u3150'],
  '\u315a': ['\u3157', '\u3163'],
  '\u315d': ['\u315c', '\u3153'],
  '\u315e': ['\u315c', '\u3154'],
  '\u315f': ['\u315c', '\u3163'],
  '\u3162': ['\u3161', '\u3163'],
} as const satisfies Record<string, readonly [string, string]>

const COMPOUND_FINAL_CONSONANT_COMPONENTS = {
  '\u3133': ['\u3131', '\u3145'],
  '\u3135': ['\u3134', '\u3148'],
  '\u3136': ['\u3134', '\u314e'],
  '\u313a': ['\u3139', '\u3131'],
  '\u313b': ['\u3139', '\u3141'],
  '\u313c': ['\u3139', '\u3142'],
  '\u313d': ['\u3139', '\u3145'],
  '\u313e': ['\u3139', '\u314c'],
  '\u313f': ['\u3139', '\u314d'],
  '\u3140': ['\u3139', '\u314e'],
  '\u3144': ['\u3142', '\u3145'],
} as const satisfies Record<string, readonly [string, string]>

type FinalConsonant = (typeof FINAL_CONSONANTS)[number]
type NonEmptyFinalConsonant = Exclude<FinalConsonant, ''>

interface KeyboardInputSnapshot {
  confirmedText: string
  composition: KeyboardCompositionState
}

function createIndexMap<T extends string>(values: readonly T[]): ReadonlyMap<string, number> {
  return new Map<string, number>(values.map((value, index) => [value, index] as const))
}

const initialIndexMap = createIndexMap(INITIAL_CONSONANTS)
const medialIndexMap = createIndexMap(MEDIAL_VOWELS)
const finalIndexMap = createIndexMap(FINAL_CONSONANTS)
const validInitialConsonants = new Set<string>(INITIAL_CONSONANTS)
const validMedialVowels = new Set<string>(MEDIAL_VOWELS)
const validFinalConsonants = new Set<string>(
  FINAL_CONSONANTS.filter((value): value is NonEmptyFinalConsonant => value !== ''),
)
const compoundVowelMap = new Map<string, string>(
  Object.entries(COMPOUND_VOWEL_COMPONENTS).map(([compound, [first, second]]) => [
    `${first}${second}`,
    compound,
  ]),
)
const compoundFinalConsonantMap = new Map<string, string>(
  Object.entries(COMPOUND_FINAL_CONSONANT_COMPONENTS).map(([compound, [first, second]]) => [
    `${first}${second}`,
    compound,
  ]),
)

function createKeyboardComposition(
  initialConsonant: string | null = null,
  medialVowel: string | null = null,
  finalConsonant: string | null = null,
): KeyboardCompositionState {
  if (!initialConsonant) {
    return {
      stage: 'idle',
      initialConsonant: null,
      medialVowel: null,
      finalConsonant: null,
      vowel: null,
    }
  }

  if (!medialVowel) {
    return {
      stage: 'vowel',
      initialConsonant,
      medialVowel: null,
      finalConsonant: null,
      vowel: null,
    }
  }

  return {
    stage: 'final_consonant',
    initialConsonant,
    medialVowel,
    finalConsonant,
    vowel: medialVowel,
  }
}

function resolveCompoundVowel(baseVowel: string, nextVowel: string) {
  return compoundVowelMap.get(`${baseVowel}${nextVowel}`) ?? null
}

function resolveDirectCompoundReplacement(baseVowel: string, nextVowel: string) {
  const components = COMPOUND_VOWEL_COMPONENTS[nextVowel as keyof typeof COMPOUND_VOWEL_COMPONENTS]

  if (!components) {
    return null
  }

  return components[0] === baseVowel ? nextVowel : null
}

function reduceCompoundVowel(vowel: string) {
  const components = COMPOUND_VOWEL_COMPONENTS[vowel as keyof typeof COMPOUND_VOWEL_COMPONENTS]
  return components ? components[0] : null
}

function resolveCompoundFinalConsonant(baseFinal: string, nextConsonant: string) {
  return compoundFinalConsonantMap.get(`${baseFinal}${nextConsonant}`) ?? null
}

function splitCompoundFinalConsonant(finalConsonant: string) {
  return COMPOUND_FINAL_CONSONANT_COMPONENTS[
    finalConsonant as keyof typeof COMPOUND_FINAL_CONSONANT_COMPONENTS
  ] ?? null
}

function reduceCompoundFinalConsonant(finalConsonant: string) {
  const components = splitCompoundFinalConsonant(finalConsonant)
  return components ? components[0] : null
}

function commitKeyboardComposition(
  confirmedText: string,
  composition: KeyboardCompositionState,
): KeyboardInputSnapshot {
  const pendingText = buildPendingKeyboardComposition(composition)

  return {
    confirmedText: pendingText ? `${confirmedText}${pendingText}` : confirmedText,
    composition: createEmptyKeyboardComposition(),
  }
}

export function createEmptyKeyboardComposition(): KeyboardCompositionState {
  return createKeyboardComposition()
}

export function isValidHangulInitialConsonant(value: string) {
  return validInitialConsonants.has(value)
}

export function isValidHangulFinalConsonant(value: string) {
  return validFinalConsonants.has(value)
}

export function isValidHangulVowel(value: string) {
  return validMedialVowels.has(value)
}

export function composeHangulSyllable(input: {
  initialConsonant: string
  medialVowel: string
  finalConsonant?: string | null
}) {
  const initialIndex = initialIndexMap.get(input.initialConsonant)
  const medialIndex = medialIndexMap.get(input.medialVowel)

  if (initialIndex === undefined || medialIndex === undefined) {
    return null
  }

  const finalConsonant = input.finalConsonant ?? ''
  const finalIndex = finalIndexMap.get(finalConsonant)

  if (finalIndex === undefined) {
    return null
  }

  return String.fromCharCode(
    HANGUL_BASE + initialIndex * 21 * 28 + medialIndex * 28 + finalIndex,
  )
}

export function buildPendingKeyboardComposition(composition: KeyboardCompositionState) {
  if (!composition.initialConsonant) {
    return ''
  }

  if (!composition.medialVowel) {
    return composition.initialConsonant
  }

  return (
    composeHangulSyllable({
      initialConsonant: composition.initialConsonant,
      medialVowel: composition.medialVowel,
      finalConsonant: composition.finalConsonant,
    }) ??
    `${composition.initialConsonant}${composition.medialVowel}${composition.finalConsonant ?? ''}`
  )
}

export function resolveKeyboardManualInput(
  confirmedText: string,
  composition: KeyboardCompositionState,
) {
  const pendingText = buildPendingKeyboardComposition(composition)

  return pendingText ? `${confirmedText}${pendingText}` : confirmedText
}

export function hasPendingKeyboardComposition(composition: KeyboardCompositionState) {
  return Boolean(
    composition.initialConsonant || composition.medialVowel || composition.finalConsonant,
  )
}

export function applyKeyboardConsonantSelection(
  input: KeyboardInputSnapshot,
  consonant: string,
): KeyboardInputSnapshot {
  if (!isValidHangulInitialConsonant(consonant)) {
    return input
  }

  const { confirmedText, composition } = input

  if (!composition.initialConsonant) {
    return {
      confirmedText,
      composition: createKeyboardComposition(consonant),
    }
  }

  if (!composition.medialVowel) {
    return {
      confirmedText,
      composition: createKeyboardComposition(consonant),
    }
  }

  if (!composition.finalConsonant && isValidHangulFinalConsonant(consonant)) {
    return {
      confirmedText,
      composition: createKeyboardComposition(
        composition.initialConsonant,
        composition.medialVowel,
        consonant,
      ),
    }
  }

  if (composition.finalConsonant) {
    const compoundFinalConsonant = resolveCompoundFinalConsonant(
      composition.finalConsonant,
      consonant,
    )

    if (compoundFinalConsonant) {
      return {
        confirmedText,
        composition: createKeyboardComposition(
          composition.initialConsonant,
          composition.medialVowel,
          compoundFinalConsonant,
        ),
      }
    }
  }

  const committed = commitKeyboardComposition(confirmedText, composition)

  return {
    confirmedText: committed.confirmedText,
    composition: createKeyboardComposition(consonant),
  }
}

export function applyKeyboardVowelSelection(
  input: KeyboardInputSnapshot,
  vowel: string,
): KeyboardInputSnapshot {
  if (!isValidHangulVowel(vowel)) {
    return input
  }

  const { confirmedText, composition } = input

  if (!composition.initialConsonant) {
    return {
      confirmedText,
      composition: createKeyboardComposition('\u3147', vowel),
    }
  }

  if (!composition.medialVowel) {
    return {
      confirmedText,
      composition: createKeyboardComposition(composition.initialConsonant, vowel),
    }
  }

  if (!composition.finalConsonant) {
    const compoundVowel =
      resolveCompoundVowel(composition.medialVowel, vowel) ??
      resolveDirectCompoundReplacement(composition.medialVowel, vowel)

    if (compoundVowel) {
      return {
        confirmedText,
        composition: createKeyboardComposition(
          composition.initialConsonant,
          compoundVowel,
        ),
      }
    }

    const committed = commitKeyboardComposition(confirmedText, composition)

    return {
      confirmedText: committed.confirmedText,
      composition: createKeyboardComposition('\u3147', vowel),
    }
  }

  const compoundFinalConsonant = splitCompoundFinalConsonant(composition.finalConsonant)

  if (compoundFinalConsonant) {
    const [leadingFinalConsonant, trailingInitialConsonant] = compoundFinalConsonant
    const nextConfirmedText = `${confirmedText}${
      composeHangulSyllable({
        initialConsonant: composition.initialConsonant,
        medialVowel: composition.medialVowel,
        finalConsonant: leadingFinalConsonant,
      }) ??
      `${composition.initialConsonant}${composition.medialVowel}${leadingFinalConsonant}`
    }`

    return {
      confirmedText: nextConfirmedText,
      composition: createKeyboardComposition(trailingInitialConsonant, vowel),
    }
  }

  const nextConfirmedText = `${confirmedText}${
    composeHangulSyllable({
      initialConsonant: composition.initialConsonant,
      medialVowel: composition.medialVowel,
    }) ?? `${composition.initialConsonant}${composition.medialVowel}`
  }`

  return {
    confirmedText: nextConfirmedText,
    composition: createKeyboardComposition(composition.finalConsonant, vowel),
  }
}

export function appendKeyboardText(
  input: KeyboardInputSnapshot,
  value: string,
): KeyboardInputSnapshot {
  const committed = commitKeyboardComposition(input.confirmedText, input.composition)

  return {
    confirmedText: `${committed.confirmedText}${value}`,
    composition: committed.composition,
  }
}

export function finalizeKeyboardComposition(input: KeyboardInputSnapshot) {
  return commitKeyboardComposition(input.confirmedText, input.composition)
}

export function deleteKeyboardInput(input: KeyboardInputSnapshot): KeyboardInputSnapshot {
  const { confirmedText, composition } = input

  if (composition.finalConsonant) {
    const reducedFinalConsonant = reduceCompoundFinalConsonant(composition.finalConsonant)

    if (reducedFinalConsonant) {
      return {
        confirmedText,
        composition: createKeyboardComposition(
          composition.initialConsonant,
          composition.medialVowel,
          reducedFinalConsonant,
        ),
      }
    }

    return {
      confirmedText,
      composition: createKeyboardComposition(
        composition.initialConsonant,
        composition.medialVowel,
      ),
    }
  }

  if (composition.medialVowel) {
    const reducedVowel = reduceCompoundVowel(composition.medialVowel)

    if (reducedVowel) {
      return {
        confirmedText,
        composition: createKeyboardComposition(
          composition.initialConsonant,
          reducedVowel,
        ),
      }
    }

    return {
      confirmedText,
      composition: createKeyboardComposition(composition.initialConsonant),
    }
  }

  if (composition.initialConsonant) {
    return {
      confirmedText,
      composition: createEmptyKeyboardComposition(),
    }
  }

  return {
    confirmedText: confirmedText.slice(0, -1),
    composition,
  }
}
