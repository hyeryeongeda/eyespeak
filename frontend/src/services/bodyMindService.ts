import type {
  BodyMindExpressionDraft,
  BodyMindStoredState,
  PainAreaKey,
  SubmitBodyMindExpressionResult,
} from '../types/communication'

const BODY_MIND_STORAGE_PREFIX = 'bodyMindState'

function isBrowser() {
  return typeof window !== 'undefined'
}

function getBodyMindStorageKey(patientId: string) {
  return `${BODY_MIND_STORAGE_PREFIX}:${patientId}`
}

function readStoredBodyMindState(patientId: string): BodyMindStoredState {
  if (!isBrowser()) {
    return {}
  }

  const savedValue = sessionStorage.getItem(getBodyMindStorageKey(patientId))

  if (!savedValue) {
    return {}
  }

  try {
    const parsed = JSON.parse(savedValue) as Partial<BodyMindStoredState>
    const nextState: BodyMindStoredState = {}

    if (typeof parsed.selectedPainAreaKey === 'string') {
      nextState.selectedPainAreaKey = parsed.selectedPainAreaKey as PainAreaKey
    }

    if (
      parsed.lastExpression &&
      typeof parsed.lastExpression === 'object' &&
      typeof parsed.lastExpression.patientId === 'string' &&
      typeof parsed.lastExpression.type === 'string' &&
      typeof parsed.lastExpression.optionKey === 'string' &&
      typeof parsed.lastExpression.submittedAt === 'string'
    ) {
      nextState.lastExpression = parsed.lastExpression
    }

    return nextState
  } catch {
    sessionStorage.removeItem(getBodyMindStorageKey(patientId))
    return {}
  }
}

function writeStoredBodyMindState(patientId: string, nextState: BodyMindStoredState) {
  if (!isBrowser()) {
    return
  }

  sessionStorage.setItem(getBodyMindStorageKey(patientId), JSON.stringify(nextState))
}

export function getStoredPainAreaSelection(patientId: string) {
  return readStoredBodyMindState(patientId).selectedPainAreaKey ?? null
}

export function storePainAreaSelection(patientId: string, areaKey: PainAreaKey) {
  const currentState = readStoredBodyMindState(patientId)

  writeStoredBodyMindState(patientId, {
    ...currentState,
    selectedPainAreaKey: areaKey,
  })
}

export function getStoredLastBodyMindExpression(patientId: string) {
  return readStoredBodyMindState(patientId).lastExpression ?? null
}

export async function submitBodyMindExpression(
  draft: BodyMindExpressionDraft,
): Promise<SubmitBodyMindExpressionResult> {
  const payload = {
    ...draft,
    submittedAt: new Date().toISOString(),
  }

  const currentState = readStoredBodyMindState(draft.patientId)

  writeStoredBodyMindState(draft.patientId, {
    ...currentState,
    selectedPainAreaKey: draft.areaKey ?? currentState.selectedPainAreaKey,
    lastExpression: payload,
  })

  // TODO: Replace this mock persistence with the real expression/log API once the backend
  // contract is finalized. The intended integration point is a dedicated POST request here.
  await Promise.resolve()

  return {
    success: true,
    source: 'mock',
    payload,
  }
}
