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

const VOWELS = [
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

type FinalConsonant = (typeof FINAL_CONSONANTS)[number]
type NonEmptyFinalConsonant = Exclude<FinalConsonant, ''>

function createIndexMap<T extends string>(values: readonly T[]): ReadonlyMap<string, number> {
  return new Map<string, number>(values.map((value, index) => [value, index] as const))
}

const initialIndexMap: ReadonlyMap<string, number> = createIndexMap(INITIAL_CONSONANTS)
const vowelIndexMap: ReadonlyMap<string, number> = createIndexMap(VOWELS)
const finalIndexMap: ReadonlyMap<string, number> = createIndexMap(FINAL_CONSONANTS)
const validFinalConsonants: ReadonlySet<string> = new Set<string>(
  FINAL_CONSONANTS.filter((value): value is NonEmptyFinalConsonant => value !== ''),
)

export function createEmptyKeyboardComposition(): KeyboardCompositionState {
  return {
    stage: 'idle',
    initialConsonant: null,
    vowel: null,
  }
}

export function isValidHangulFinalConsonant(value: string) {
  return validFinalConsonants.has(value)
}

export function composeHangulSyllable(input: {
  initialConsonant: string
  vowel: string
  finalConsonant?: string | null
}) {
  const initialIndex = initialIndexMap.get(input.initialConsonant)
  const vowelIndex = vowelIndexMap.get(input.vowel)

  if (initialIndex === undefined || vowelIndex === undefined) {
    return null
  }

  const finalConsonant = input.finalConsonant ?? ''
  const finalIndex = finalIndexMap.get(finalConsonant)

  if (finalIndex === undefined) {
    return null
  }

  return String.fromCharCode(
    HANGUL_BASE + initialIndex * 21 * 28 + vowelIndex * 28 + finalIndex,
  )
}

export function buildPendingKeyboardComposition(
  composition: KeyboardCompositionState,
  finalConsonant?: string | null,
) {
  if (!composition.initialConsonant) {
    return ''
  }

  if (!composition.vowel) {
    return composition.initialConsonant
  }

  return (
    composeHangulSyllable({
      initialConsonant: composition.initialConsonant,
      vowel: composition.vowel,
      finalConsonant,
    }) ??
    `${composition.initialConsonant}${composition.vowel}${finalConsonant ?? ''}`
  )
}

export function resolveKeyboardManualInput(
  manualInput: string,
  composition: KeyboardCompositionState,
  finalConsonant?: string | null,
) {
  const pendingText = buildPendingKeyboardComposition(composition, finalConsonant)

  return pendingText ? `${manualInput}${pendingText}` : manualInput
}

export function hasPendingKeyboardComposition(composition: KeyboardCompositionState) {
  return Boolean(composition.initialConsonant)
}
