const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim())
}

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase()
}

export function sanitizeBirthYearInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}

export function validateBirthYear(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return '출생연도를 입력해주세요.'
  }

  if (trimmedValue.length !== 4) {
    return '출생연도는 4자리로 입력해주세요.'
  }

  const numericBirthYear = Number(trimmedValue)
  const currentYear = new Date().getFullYear()

  if (!Number.isInteger(numericBirthYear) || numericBirthYear < 1900 || numericBirthYear > currentYear) {
    return '유효한 출생연도를 입력해주세요.'
  }

  return null
}

export function validatePassword(value: string) {
  if (!value.trim()) {
    return '비밀번호를 입력해주세요.'
  }

  if (value.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.'
  }

  // TODO(PLAN): 실제 비밀번호 정책(특수문자/대소문자/숫자 조합) 확정 필요.
  return null
}
