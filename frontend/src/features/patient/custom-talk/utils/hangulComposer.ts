import type { KeyboardCompositionState } from '../types'

const HANGUL_BASE = 0xac00
const INITIAL_CONSONANTS = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const

const VOWELS = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
] as const

const FINAL_CONSONANTS = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const

const initialIndexMap = new Map(INITIAL_CONSONANTS.map((value, index) => [value, index]))
const vowelIndexMap = new Map(VOWELS.map((value, index) => [value, index]))
const finalIndexMap = new Map(FINAL_CONSONANTS.map((value, index) => [value, index]))
const validFinalConsonants = new Set(FINAL_CONSONANTS.filter(Boolean))

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
