export interface BrowserEyeTrackingCalibrationRecord {
  userId: string
  createdAt: string
  blinkThreshold: number
  polyCoeffX: number[]
  polyCoeffY: number[]
  calRefinerRaw: Array<[number, number]>
  calRefinerTarget: Array<[number, number]>
}

type BrowserEyeTrackingCalibrationMap = Record<string, BrowserEyeTrackingCalibrationRecord>

const STORAGE_KEY = 'browserEyeTrackingCalibration:v1'

function normalizeIdentifier(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

function isFiniteNumberArray(value: unknown, expectedLength?: number): value is number[] {
  return (
    Array.isArray(value) &&
    (expectedLength === undefined || value.length === expectedLength) &&
    value.every(item => typeof item === 'number' && Number.isFinite(item))
  )
}

function isFinitePairArray(value: unknown): value is Array<[number, number]> {
  return (
    Array.isArray(value) &&
    value.every(
      entry =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'number' &&
        Number.isFinite(entry[0]) &&
        typeof entry[1] === 'number' &&
        Number.isFinite(entry[1]),
    )
  )
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizeRecord(
  value: BrowserEyeTrackingCalibrationRecord | null | undefined,
): BrowserEyeTrackingCalibrationRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const userId = normalizeIdentifier(value.userId)
  const createdAt = normalizeIdentifier(value.createdAt)

  if (
    !userId ||
    !createdAt ||
    typeof value.blinkThreshold !== 'number' ||
    !Number.isFinite(value.blinkThreshold) ||
    !isFiniteNumberArray(value.polyCoeffX, 6) ||
    !isFiniteNumberArray(value.polyCoeffY, 6) ||
    !isFinitePairArray(value.calRefinerRaw) ||
    !isFinitePairArray(value.calRefinerTarget)
  ) {
    return null
  }

  return {
    userId,
    createdAt,
    blinkThreshold: value.blinkThreshold,
    polyCoeffX: [...value.polyCoeffX],
    polyCoeffY: [...value.polyCoeffY],
    calRefinerRaw: value.calRefinerRaw.map(entry => [entry[0], entry[1]]),
    calRefinerTarget: value.calRefinerTarget.map(entry => [entry[0], entry[1]]),
  }
}

function readCalibrationMap(): BrowserEyeTrackingCalibrationMap {
  if (!isBrowser()) {
    return {}
  }

  const rawValue = localStorage.getItem(STORAGE_KEY)

  if (!rawValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, BrowserEyeTrackingCalibrationRecord>

    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(STORAGE_KEY)
      return {}
    }

    return Object.entries(parsed).reduce<BrowserEyeTrackingCalibrationMap>((accumulator, entry) => {
      const [profileId, record] = entry
      const normalizedProfileId = normalizeIdentifier(profileId)
      const normalizedRecord = normalizeRecord(record)

      if (normalizedProfileId && normalizedRecord) {
        accumulator[normalizedProfileId] = normalizedRecord
      }

      return accumulator
    }, {})
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

function writeCalibrationMap(value: BrowserEyeTrackingCalibrationMap) {
  if (!isBrowser()) {
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function loadBrowserEyeTrackingCalibration(profileId: string) {
  const normalizedProfileId = normalizeIdentifier(profileId)

  if (!normalizedProfileId) {
    return null
  }

  return readCalibrationMap()[normalizedProfileId] ?? null
}

export function saveBrowserEyeTrackingCalibration(
  profileId: string,
  record: BrowserEyeTrackingCalibrationRecord,
) {
  const normalizedProfileId = normalizeIdentifier(profileId)
  const normalizedRecord = normalizeRecord(record)

  if (!normalizedProfileId || !normalizedRecord) {
    return false
  }

  writeCalibrationMap({
    ...readCalibrationMap(),
    [normalizedProfileId]: normalizedRecord,
  })

  return true
}

export function hasBrowserEyeTrackingCalibration(profileId: string) {
  return loadBrowserEyeTrackingCalibration(profileId) !== null
}
