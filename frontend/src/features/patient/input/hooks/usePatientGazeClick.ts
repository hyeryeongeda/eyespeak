import { useEffect, useMemo, useRef, useState } from 'react'
import { useDwell } from './useDwell'
import {
  CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
  getActivationDelayPreset,
  type CareActivationDelayPresetUpdatedDetail,
} from '../../../../services/careSettingService'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import {
  CUSTOM_TALK_CARD_SELECTOR,
  getCustomTalkSelectableGroupElement,
  isCustomTalkSelectableGroupElement,
} from '../../custom-talk/utils/selectionScope'
import {
  getInteractiveElementFromPoint,
  getInteractiveElementSelectionKey,
  getWeightedInteractiveTargetFromArea,
  isInteractiveElementEligibleForGlobalGazeSelection,
} from '../services/trackingService'
import {
  normalizePatientCellMappingTarget,
  type PatientCellMapping,
} from '../services/patientCellMapping'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { useCellMappingStore } from '../stores/cellMappingStore'
import { usePatientModeStore } from '../stores/patientModeStore'
import {
  ACTIVATION_DELAY_OPTIONS,
  type ActivationDelayPreset,
} from '../../../../types/care'
import {
  useGazeSelectionStore,
  type GazeSelectionCommitSource,
} from '../stores/gazeSelectionStore'

interface UsePatientGazeClickOptions {
  enabled?: boolean
  customTalkSelectionScopeEnabled?: boolean
}

const GAZE_TARGET_SWITCH_GRACE_MS = 160
const SELECTION_CONFIRM_FEEDBACK_MS = 3000
const SELECTION_COMMIT_DELAY_MS = 0
const TARGET_RESELECTION_COOLDOWN_MS = 2000
const CUSTOM_TALK_GAZE_TUNING = {
  stableHoldMs: 240,
  switchHoldMs: 240,
  switchMargin: 0.1,
  dwellMs: 1500,
  cooldownMs: 1050,
  areaHitRadiusPx: 28,
} as const

type SelectionTargetSource =
  | 'cell-mapping'
  | 'patient-main-point'
  | 'area-hit-test'
  | 'point-hit-test'
  | 'point-nearest'

type GazePoint = { clientX: number; clientY: number; updatedAt?: number } | null
type SelectionSemanticRole =
  | 'action'
  | 'back'
  | 'keyboard'
  | 'main'
  | 'option'
  | 'other'
  | 'refresh'
  | 'skip'

interface SelectionTarget {
  element: HTMLElement
  key: string
  trackingId: string | null
  source: SelectionTargetSource
  cell: number | null
  groupId: string | null
  namespace: string | null
  semanticRole: SelectionSemanticRole
  isBackTarget: boolean
  confidence: number
}

interface SelectionCooldownEntry {
  element: HTMLElement | null
  expiresAt: number
  timerId: number
}

type PatientDebugWindow = Window & {
  __DEV_GAZE_DISABLE_POINT_HIT_TEST?: boolean
  __PATIENT_GAZE_DEBUG_STATE?: unknown
}

function isActivationDelayPreset(value: unknown): value is ActivationDelayPreset {
  return typeof value === 'string' && value in ACTIVATION_DELAY_OPTIONS
}

function getElementByTrackingId(trackingId: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const escapedTrackingId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(trackingId)
      : trackingId.replace(/["\\]/g, '\\$&')

  return document.querySelector<HTMLElement>(`[data-tracking-id="${escapedTrackingId}"]`)
}

function getElementSelectionCell(element: HTMLElement | null) {
  if (!element) {
    return null
  }

  const rawCell = element.dataset.cell

  if (typeof rawCell !== 'string' || rawCell.trim().length === 0) {
    return null
  }

  const parsedCell = Number.parseInt(rawCell, 10)

  return Number.isFinite(parsedCell) ? parsedCell : null
}

function isCustomTalkTrackingId(value: string | null | undefined) {
  return typeof value === 'string' && value.startsWith('custom-talk-')
}

function getSelectionNamespace(trackingId: string | null | undefined) {
  if (!trackingId) {
    return null
  }

  const match = trackingId.match(
    /^(custom-talk-[a-z-]+?)-(?:option-\d+|recommendation-\d+|back|refresh|skip|keyboard|action)$/,
  )

  return match?.[1] ?? null
}

function getSelectionSemanticRole(
  trackingId: string | null | undefined,
): SelectionSemanticRole {
  if (!trackingId) {
    return 'other'
  }

  if (trackingId.endsWith('-back')) {
    return 'back'
  }

  if (
    /-(option|recommendation)-\d+$/.test(trackingId)
  ) {
    return 'option'
  }

  if (trackingId.endsWith('-refresh')) {
    return 'refresh'
  }

  if (trackingId.endsWith('-skip')) {
    return 'skip'
  }

  if (trackingId.endsWith('-keyboard')) {
    return 'keyboard'
  }

  if (trackingId.endsWith('-action')) {
    return 'action'
  }

  if (isPatientMainTrackingId(trackingId)) {
    return 'main'
  }

  return 'other'
}

function isCustomTalkElement(
  element: HTMLElement | null,
  customTalkSelectionScopeEnabled: boolean,
) {
  return (
    customTalkSelectionScopeEnabled &&
    Boolean(element?.closest(CUSTOM_TALK_CARD_SELECTOR)) &&
    isCustomTalkSelectableGroupElement(element)
  )
}

function isCustomTalkSelectionTarget(
  target: SelectionTarget | null,
  customTalkSelectionScopeEnabled: boolean,
) {
  if (!customTalkSelectionScopeEnabled) {
    return false
  }

  return (
    isCustomTalkTrackingId(target?.trackingId) &&
    isCustomTalkElement(target?.element ?? null, customTalkSelectionScopeEnabled)
  )
}

function isSelectionTargetVisible(target: SelectionTarget | null) {
  return Boolean(target && isElementVisibleForSelection(target.element))
}

function areTargetsInSameCell(
  left: SelectionTarget | null,
  right: SelectionTarget | null,
) {
  return left?.cell !== null && left?.cell !== undefined && left.cell === right?.cell
}

function areTargetsInSameSemanticGroup(
  left: SelectionTarget | null,
  right: SelectionTarget | null,
) {
  if (!left || !right) {
    return false
  }

  if (left.groupId && right.groupId && left.groupId === right.groupId) {
    return true
  }

  if (
    left.namespace &&
    left.namespace === right.namespace &&
    left.semanticRole === right.semanticRole &&
    left.semanticRole !== 'back'
  ) {
    return true
  }

  return false
}

function isOptionSelectionTarget(target: SelectionTarget | null) {
  return target?.semanticRole === 'option'
}

function getNearestTargetConfidence(distance: number) {
  const normalizedDistance = Math.min(1, distance / 420)
  return 0.24 + (1 - normalizedDistance) * 0.2
}

function getCustomTalkTargetPreferenceScore(
  target: SelectionTarget,
  stableTarget: SelectionTarget | null,
) {
  let score = target.confidence

  if (stableTarget?.key === target.key) {
    score += 0.34
  }

  if (areTargetsInSameCell(target, stableTarget)) {
    score += 0.16
  }

  if (areTargetsInSameSemanticGroup(target, stableTarget)) {
    score += 0.12
  }

  if (isOptionSelectionTarget(target)) {
    score += 0.08
  }

  if (target.source === 'cell-mapping') {
    score += 0.05
  }

  if (target.source === 'area-hit-test') {
    score += 0.03
  }

  if (target.isBackTarget) {
    score -= 0.18

    if (stableTarget && !stableTarget.isBackTarget) {
      score -= 0.22
    }
  }

  return score
}

function createSelectionTarget(
  element: HTMLElement,
  source: SelectionTargetSource,
  cell: number | null,
  groupId: string | null = null,
  confidence = 0.5,
): SelectionTarget {
  const trackingId = element.dataset.trackingId ?? null
  const semanticRole = getSelectionSemanticRole(trackingId)

  return {
    element,
    key: getInteractiveElementSelectionKey(element),
    trackingId,
    source,
    cell: cell ?? getElementSelectionCell(element),
    groupId,
    namespace: getSelectionNamespace(trackingId),
    semanticRole,
    isBackTarget: semanticRole === 'back',
    confidence,
  }
}

function isPatientMainTrackingId(value: string | null | undefined) {
  return value === 'talk' || value === 'call' || value === 'leisure'
}

function getPatientMainPointTarget(gazePoint: GazePoint): SelectionTarget | null {
  if (!gazePoint) {
    return null
  }

  const element = getInteractiveElementFromPoint(gazePoint.clientX, gazePoint.clientY)

  if (!element || !isPatientMainTrackingId(element.dataset.trackingId)) {
    return null
  }

  return createSelectionTarget(
    element,
    'patient-main-point',
    null,
    element.dataset.trackingId ?? null,
    0.92,
  )
}

function getFallbackPatientMainCellMapping(): PatientCellMapping | null {
  if (typeof document === 'undefined') {
    return null
  }

  const hasPatientMainTargets =
    document.querySelector('[data-tracking-id="talk"]') !== null &&
    document.querySelector('[data-tracking-id="call"]') !== null &&
    document.querySelector('[data-tracking-id="leisure"]') !== null

  if (!hasPatientMainTargets) {
    return null
  }

  return {
    0: 'talk',
    1: 'talk',
    2: 'talk',
    3: 'call',
    4: 'call',
    5: 'leisure',
  }
}

function isElementVisibleForSelection(element: HTMLElement) {
  if (!element.isConnected) {
    return false
  }

  if (!isInteractiveElementEligibleForGlobalGazeSelection(element)) {
    return false
  }

  const computedStyle = window.getComputedStyle(element)

  if (
    computedStyle.display === 'none' ||
    computedStyle.visibility === 'hidden' ||
    computedStyle.pointerEvents === 'none'
  ) {
    return false
  }

  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function isElementVisuallyInteractive(element: HTMLElement) {
  if (!isElementVisibleForSelection(element)) {
    return false
  }

  if (element.matches(':disabled')) {
    return false
  }

  return (
    element.getAttribute('aria-disabled') !== 'true' ||
    element.dataset.gazeCommitDisabled === 'true'
  )
}

function getNearestInteractiveTargetFromPoint(
  gazePoint: GazePoint,
  options?: {
    container?: HTMLElement | null
    candidateSelector?: string
    source?: SelectionTargetSource
  },
): SelectionTarget | null {
  if (typeof document === 'undefined' || !gazePoint) {
    return null
  }

  const interactiveElements = Array.from(
    document.querySelectorAll<HTMLElement>(
      options?.candidateSelector ??
        'button, a[href], input[type="button"], input[type="submit"], [role="button"]',
    ),
  ).filter(
    element =>
      (!options?.container || options.container.contains(element)) &&
      isElementVisuallyInteractive(element),
  )

  if (interactiveElements.length === 0) {
    return null
  }

  const nearest = interactiveElements.reduce<{
    element: HTMLElement
    distance: number
  } | null>((best, current) => {
    if (!best) {
      const rect = current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      return {
        element: current,
        distance: Math.hypot(gazePoint.clientX - centerX, gazePoint.clientY - centerY),
      }
    }

    const currentRect = current.getBoundingClientRect()
    const currentCenterX = currentRect.left + currentRect.width / 2
    const currentCenterY = currentRect.top + currentRect.height / 2
    const currentDistance = Math.hypot(
      gazePoint.clientX - currentCenterX,
      gazePoint.clientY - currentCenterY,
    )

    return currentDistance < best.distance
      ? {
          element: current,
          distance: currentDistance,
        }
      : best
  }, null)

  return nearest
    ? createSelectionTarget(
        nearest.element,
        options?.source ?? 'point-nearest',
        null,
        null,
        getNearestTargetConfidence(nearest.distance),
      )
    : null
}

function getNearestTrackingId(
  trackingIds: string[],
  gazePoint: GazePoint,
) {
  if (!gazePoint || trackingIds.length === 0) {
    return null
  }

  const nearestElement = trackingIds
    .map(trackingId => ({
      trackingId,
      element: getElementByTrackingId(trackingId),
    }))
    .filter(
      (
        entry,
      ): entry is {
        trackingId: string
        element: HTMLElement
      } => Boolean(entry.element && isElementVisibleForSelection(entry.element)),
    )
    .reduce<{
      trackingId: string
      element: HTMLElement
      distance: number
    } | null>((best, current) => {
      const rect = current.element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distance = Math.hypot(gazePoint.clientX - centerX, gazePoint.clientY - centerY)

      if (!best || distance < best.distance) {
        return { ...current, distance }
      }

      return best
    }, null)

  return nearestElement?.trackingId ?? null
}

function resolveMappedGazeTarget(input: {
  cell: number | null
  mapping: PatientCellMapping | null
  gazePoint: GazePoint
  stableTarget: SelectionTarget | null
  pointTarget: SelectionTarget | null
}): SelectionTarget | null {
  const { cell, mapping, gazePoint, stableTarget, pointTarget } = input

  if (cell === null || !mapping) {
    return null
  }

  const normalizedTarget = normalizePatientCellMappingTarget(mapping[cell] ?? null)

  if (normalizedTarget.allTargets.length === 0) {
    return null
  }

  const stableTrackingId = stableTarget?.trackingId ?? null

  const resolveTrackingId = (trackingIds: string[]) => {
    if (trackingIds.length === 0) {
      return {
        trackingId: null,
        confidence: 0,
      }
    }

    const pointTrackingId = pointTarget?.trackingId ?? null

    if (pointTrackingId && trackingIds.includes(pointTrackingId)) {
      return {
        trackingId: pointTrackingId,
        confidence: 0.94,
      }
    }

    if (stableTrackingId && trackingIds.includes(stableTrackingId)) {
      return {
        trackingId: stableTrackingId,
        confidence: 0.88,
      }
    }

    return {
      trackingId: getNearestTrackingId(trackingIds, gazePoint) ?? trackingIds[0] ?? null,
      confidence: 0.74,
    }
  }

  const resolvedPrimaryTarget = resolveTrackingId(normalizedTarget.targets)
  const resolvedFallbackTarget = resolveTrackingId(normalizedTarget.fallbackTargets)
  const resolvedTarget =
    resolvedPrimaryTarget.trackingId !== null
      ? resolvedPrimaryTarget
      : resolvedFallbackTarget
  const trackingId =
    resolvedTarget.trackingId

  if (!trackingId) {
    return null
  }

  const mappedElement = getElementByTrackingId(trackingId)

  if (!mappedElement || !isElementVisibleForSelection(mappedElement)) {
    return null
  }

  return createSelectionTarget(
    mappedElement,
    'cell-mapping',
    cell,
    normalizedTarget.groupId,
    resolvedTarget === resolvedFallbackTarget ? 0.58 : resolvedTarget.confidence,
  )
}

function getCustomTalkAreaHitTarget(
  gazePoint: GazePoint,
  gazeCell: number | null,
  container: HTMLElement | null,
): SelectionTarget | null {
  if (!gazePoint) {
    return null
  }

  const areaTarget = getWeightedInteractiveTargetFromArea(gazePoint.clientX, gazePoint.clientY, {
    container,
    radiusPx: CUSTOM_TALK_GAZE_TUNING.areaHitRadiusPx,
    candidateSelector: CUSTOM_TALK_CARD_SELECTOR,
  })

  if (!areaTarget) {
    return null
  }

  return createSelectionTarget(
    areaTarget.element,
    'area-hit-test',
    gazeCell,
    null,
    0.55 + areaTarget.score * 0.45,
  )
}

function dedupeSelectionTargets(
  targets: Array<SelectionTarget | null>,
) {
  const targetByKey = new Map<string, SelectionTarget>()

  for (const target of targets) {
    if (!target) {
      continue
    }

    const existingTarget = targetByKey.get(target.key)

    if (!existingTarget || existingTarget.confidence < target.confidence) {
      targetByKey.set(target.key, target)
    }
  }

  return Array.from(targetByKey.values())
}

function getPreferredCustomTalkTarget(input: {
  stableTarget: SelectionTarget | null
  pointTarget: SelectionTarget | null
  mappedTarget: SelectionTarget | null
  nearestTarget: SelectionTarget | null
}) {
  const { stableTarget, pointTarget, mappedTarget, nearestTarget } = input
  const hasObservedCandidate = Boolean(pointTarget || mappedTarget || nearestTarget)
  const candidateTargets = dedupeSelectionTargets([
    pointTarget,
    mappedTarget,
    nearestTarget,
    hasObservedCandidate && isSelectionTargetVisible(stableTarget) ? stableTarget : null,
  ])

  if (candidateTargets.length === 0) {
    return null
  }

  return candidateTargets.reduce<SelectionTarget | null>((bestTarget, currentTarget) => {
    if (!bestTarget) {
      return currentTarget
    }

    const currentScore = getCustomTalkTargetPreferenceScore(currentTarget, stableTarget)
    const bestScore = getCustomTalkTargetPreferenceScore(bestTarget, stableTarget)

    if (currentScore > bestScore) {
      return currentTarget
    }

    if (currentScore === bestScore && currentTarget.confidence > bestTarget.confidence) {
      return currentTarget
    }

    return bestTarget
  }, null)
}

function resolveRawGazeTarget(input: {
  enabled: boolean
  customTalkSelectionScopeEnabled: boolean
  gazePoint: GazePoint
  gazeCell: number | null
  cellMapping: PatientCellMapping | null
  stableTarget: SelectionTarget | null
}): SelectionTarget | null {
  const { enabled, gazePoint, gazeCell, cellMapping, stableTarget } = input

  if (!enabled) {
    return null
  }

  const activeCellMapping = cellMapping ?? getFallbackPatientMainCellMapping()
  const customTalkSelectableGroup = input.customTalkSelectionScopeEnabled
    ? getCustomTalkSelectableGroupElement()
    : null
  const isCustomTalkRuntime = customTalkSelectableGroup !== null

  const disablePointHitTest =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window as PatientDebugWindow).__DEV_GAZE_DISABLE_POINT_HIT_TEST === true

  if (gazePoint && !disablePointHitTest) {
    const patientMainPointTarget = getPatientMainPointTarget(gazePoint)
    if (patientMainPointTarget) {
      return patientMainPointTarget
    }
  }

  let pointTarget: SelectionTarget | null = null

  if (gazePoint && !disablePointHitTest) {
    if (customTalkSelectableGroup) {
      pointTarget = getCustomTalkAreaHitTarget(
        gazePoint,
        gazeCell,
        customTalkSelectableGroup,
      )
    }

    if (!pointTarget) {
      const pointElement = getInteractiveElementFromPoint(
        gazePoint.clientX,
        gazePoint.clientY,
        customTalkSelectableGroup,
      )
      if (pointElement) {
        pointTarget = createSelectionTarget(pointElement, 'point-hit-test', gazeCell, null, 0.88)
      }
    }
  }

  const mappedTarget = resolveMappedGazeTarget({
    cell: gazeCell,
    mapping: activeCellMapping,
    gazePoint,
    stableTarget,
    pointTarget,
  })

  const nearestTarget = getNearestInteractiveTargetFromPoint(
    gazePoint,
    isCustomTalkRuntime
      ? {
          container: customTalkSelectableGroup,
          candidateSelector: CUSTOM_TALK_CARD_SELECTOR,
        }
      : undefined,
  )

  if (customTalkSelectableGroup) {
    return getPreferredCustomTalkTarget({
      stableTarget,
      pointTarget,
      mappedTarget,
      nearestTarget,
    })
  }

  if (mappedTarget) {
    return mappedTarget
  }

  if (pointTarget) {
    return pointTarget
  }

  return nearestTarget
}

function getSelectionBlockReason(element: HTMLElement | null) {
  if (!element) {
    return 'missing-target'
  }

  if (!element.isConnected) {
    return 'disconnected'
  }

  if (element.dataset.gazeCommitDisabled === 'true') {
    return element.dataset.gazeDisabledReason ?? 'commit-disabled'
  }

  if (element.matches(':disabled')) {
    return 'disabled'
  }

  if (element.getAttribute('aria-disabled') === 'true') {
    return 'aria-disabled'
  }

  const computedStyle = window.getComputedStyle(element)

  if (computedStyle.display === 'none') {
    return 'display-none'
  }

  if (computedStyle.visibility === 'hidden') {
    return 'visibility-hidden'
  }

  if (computedStyle.pointerEvents === 'none') {
    return 'pointer-events-none'
  }

  if (!isInteractiveElementEligibleForGlobalGazeSelection(element)) {
    return 'mouse-only'
  }

  return null
}

export function usePatientGazeClick({
  enabled = true,
  customTalkSelectionScopeEnabled = false,
}: UsePatientGazeClickOptions = {}) {
  const gazePoint = useGazeInputStore(state => state.point)
  const gazeCell = useGazeInputStore(state => state.cell)
  const cellMapping = useCellMappingStore(state => state.cellMapping)
  const dwellDurationMs = usePatientModeStore(state => state.globalMenuDwellDurationMs)
  const [activationDelayMs, setActivationDelayMs] =
    useState(ACTIVATION_DELAY_OPTIONS.short.value)
  const [mouseTarget, setMouseTarget] = useState<SelectionTarget | null>(null)
  const [stableGazeTarget, setStableGazeTarget] = useState<SelectionTarget | null>(null)
  const [suppressedCommitTargetKey, setSuppressedCommitTargetKey] =
    useState<string | null>(null)
  const targetSwitchTimerRef = useRef<number | null>(null)
  const targetSwitchStartedAtRef = useRef<number | null>(null)
  const pendingTargetSwitchKeyRef = useRef<string | null>(null)
  const pendingTargetSwitchRef = useRef<SelectionTarget | null>(null)
  const activeSwitchGraceMsRef = useRef<number | null>(null)
  const confirmedElementRef = useRef<HTMLElement | null>(null)
  const confirmedTimerRef = useRef<number | null>(null)
  const commitDelayTimerRef = useRef<number | null>(null)
  const lastDebugSignatureRef = useRef<string | null>(null)
  const lastCancelReasonRef = useRef<string | null>(null)
  const selectionCooldownsRef = useRef<Map<string, SelectionCooldownEntry>>(new Map())
  const highlightedElementRef = useRef<HTMLElement | null>(null)
  const mouseTargetRef = useRef<SelectionTarget | null>(null)
  const stableGazeTargetRef = useRef<SelectionTarget | null>(null)
  const currentSelectionTargetRef = useRef<SelectionTarget | null>(null)
  const currentInputSourceRef = useRef<'pointer' | 'gaze' | null>(null)

  const rawGazeTarget = useMemo(
    () =>
      resolveRawGazeTarget({
        enabled,
        customTalkSelectionScopeEnabled,
        gazePoint,
        gazeCell,
        cellMapping,
        stableTarget: stableGazeTarget,
      }),
    [
      cellMapping,
      customTalkSelectionScopeEnabled,
      enabled,
      gazeCell,
      gazePoint,
      stableGazeTarget,
    ],
  )
  const isCustomTalkRuntime =
    isCustomTalkSelectionTarget(rawGazeTarget, customTalkSelectionScopeEnabled) ||
    isCustomTalkSelectionTarget(stableGazeTarget, customTalkSelectionScopeEnabled)
  const effectiveDwellDurationMs = isCustomTalkRuntime
    ? Math.max(dwellDurationMs, CUSTOM_TALK_GAZE_TUNING.dwellMs)
    : dwellDurationMs

  const currentSelectionTarget = mouseTarget ?? stableGazeTarget ?? null
  const currentInputSource: 'pointer' | 'gaze' | null = mouseTarget
    ? 'pointer'
    : stableGazeTarget
      ? 'gaze'
      : null
  const isCurrentSelectionCommitSuppressed =
    currentSelectionTarget?.key === suppressedCommitTargetKey
  const currentSelectionBlockReason = currentSelectionTarget
    ? getSelectionBlockReason(currentSelectionTarget.element)
    : null

  const clearConfirmedTimer = () => {
    if (confirmedTimerRef.current !== null) {
      window.clearTimeout(confirmedTimerRef.current)
      confirmedTimerRef.current = null
    }
  }

  const clearSelectionCooldown = (targetKey: string) => {
    const entry = selectionCooldownsRef.current.get(targetKey)
    if (!entry) {
      return
    }

    window.clearTimeout(entry.timerId)
    entry.element?.removeAttribute('data-gaze-cooldown')
    selectionCooldownsRef.current.delete(targetKey)
  }

  const isTargetCoolingDown = (targetKey: string) => {
    const entry = selectionCooldownsRef.current.get(targetKey)
    if (!entry) {
      return false
    }

    if (entry.expiresAt <= Date.now()) {
      clearSelectionCooldown(targetKey)
      return false
    }

    return true
  }

  const markSelectionConfirmed = (element: HTMLElement) => {
    if (confirmedElementRef.current && confirmedElementRef.current !== element) {
      confirmedElementRef.current.removeAttribute('data-gaze-confirmed')
    }

    clearConfirmedTimer()
    element.setAttribute('data-gaze-confirmed', 'true')
    confirmedElementRef.current = element
    confirmedTimerRef.current = window.setTimeout(() => {
      if (confirmedElementRef.current === element) {
        confirmedElementRef.current = null
      }

      element.removeAttribute('data-gaze-confirmed')
      confirmedTimerRef.current = null
    }, SELECTION_CONFIRM_FEEDBACK_MS)
  }

  const startSelectionCooldown = (
    targetKey: string,
    element: HTMLElement,
    durationMs: number,
  ) => {
    clearSelectionCooldown(targetKey)

    element.setAttribute('data-gaze-cooldown', 'true')

    const expiresAt = Date.now() + durationMs
    const timerId = window.setTimeout(() => {
      const currentEntry = selectionCooldownsRef.current.get(targetKey)
      if (!currentEntry || currentEntry.timerId !== timerId) {
        return
      }

      currentEntry.element?.removeAttribute('data-gaze-cooldown')
      selectionCooldownsRef.current.delete(targetKey)
    }, durationMs)

    selectionCooldownsRef.current.set(targetKey, {
      element,
      expiresAt,
      timerId,
    })
  }

  const getCommittedSelectionTarget = (
    source: GazeSelectionCommitSource,
    targetKey: string,
  ) => {
    const expectedInputSource = source === 'pointer-dwell' ? 'pointer' : 'gaze'
    const sourceSnapshot =
      source === 'pointer-dwell' ? mouseTargetRef.current : stableGazeTargetRef.current

    if (sourceSnapshot?.key === targetKey) {
      return sourceSnapshot
    }

    const currentSnapshot = currentSelectionTargetRef.current

    if (
      currentInputSourceRef.current === expectedInputSource &&
      currentSnapshot?.key === targetKey
    ) {
      return currentSnapshot
    }

    return null
  }

  const commitSelection = (
    source: GazeSelectionCommitSource,
    committedTargetKey: string,
  ) => {
    const { isGlobalMenuOpen, trackingStatus } = usePatientModeStore.getState()

    if (isGlobalMenuOpen) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'global-menu-open',
        trackingStatus,
      })
      return false
    }

    if (commitDelayTimerRef.current !== null) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'pending-commit',
        trackingStatus,
      })
      return false
    }

    const resolvedTarget = getCommittedSelectionTarget(source, committedTargetKey)

    if (!resolvedTarget) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'stale-commit-target',
        targetKey: committedTargetKey,
        trackingStatus,
      })
      setSuppressedCommitTargetKey(current =>
        current === committedTargetKey ? current : committedTargetKey,
      )
      useGazeSelectionStore.getState().setSelectionSnapshot({
        debug: {
          lastCancelReason: 'stale-commit-target',
        },
      })
      return false
    }

    if (isTargetCoolingDown(resolvedTarget.key)) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'cooldown',
        targetKey: resolvedTarget.key,
        trackingStatus,
      })
      return false
    }

    const blockReason = getSelectionBlockReason(resolvedTarget.element)

    if (blockReason) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: blockReason,
        targetKey: resolvedTarget.key,
        trackingId: resolvedTarget.trackingId,
        targetSource: resolvedTarget.source,
        targetCell: resolvedTarget.cell,
        trackingStatus,
      })
      setSuppressedCommitTargetKey(current =>
        current === resolvedTarget.key ? current : resolvedTarget.key,
      )
      useGazeSelectionStore.getState().setSelectionSnapshot({
        debug: {
          lastCancelReason: blockReason,
        },
      })
      return false
    }

    setSuppressedCommitTargetKey(current =>
      current === resolvedTarget.key ? null : current,
    )

    if (source === 'gaze-dwell') {
      submitActiveEyeTrackingSelectionFeedback()
    }

    markSelectionConfirmed(resolvedTarget.element)
    startSelectionCooldown(
      resolvedTarget.key,
      resolvedTarget.element,
      isCustomTalkSelectionTarget(resolvedTarget, customTalkSelectionScopeEnabled)
        ? CUSTOM_TALK_GAZE_TUNING.cooldownMs
        : TARGET_RESELECTION_COOLDOWN_MS,
    )
    commitDelayTimerRef.current = window.setTimeout(() => {
      commitDelayTimerRef.current = null

      if (!resolvedTarget.element.isConnected) {
        console.warn('[patient-input] click-skipped: element disconnected', {
          targetKey: resolvedTarget.key,
          trackingId: resolvedTarget.trackingId,
        })
        return
      }

      resolvedTarget.element.click()
    }, SELECTION_COMMIT_DELAY_MS)

    console.info('[patient-input] selection-commit-success', {
      source,
      targetKey: resolvedTarget.key,
      trackingId: resolvedTarget.trackingId,
      targetSource: resolvedTarget.source,
      trackingStatus,
    })

    useGazeSelectionStore.getState().setSelectionSnapshot({
      debug: {
        lastCommitTargetKey: resolvedTarget.key,
        lastCommitTargetId: resolvedTarget.trackingId,
        lastCommitSource: source,
      },
    })

    return true
  }

  useEffect(() => {
    mouseTargetRef.current = mouseTarget
    stableGazeTargetRef.current = stableGazeTarget
    currentSelectionTargetRef.current = currentSelectionTarget
    currentInputSourceRef.current = currentInputSource
  }, [currentInputSource, currentSelectionTarget, mouseTarget, stableGazeTarget])

  useEffect(() => {
    if (!suppressedCommitTargetKey) {
      return
    }

    if (currentSelectionTarget?.key !== suppressedCommitTargetKey) {
      setSuppressedCommitTargetKey(null)
      return
    }

    if (currentSelectionBlockReason !== null || typeof window === 'undefined') {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      setSuppressedCommitTargetKey(current =>
        current === suppressedCommitTargetKey ? null : current,
      )
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [currentSelectionBlockReason, currentSelectionTarget?.key, suppressedCommitTargetKey])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMouseTarget(null)
      return
    }

    const resetMouseTarget = () => {
      setMouseTarget(null)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return
      }

      const element = getInteractiveElementFromPoint(event.clientX, event.clientY)

      if (!element) {
        setMouseTarget(current => (current === null ? current : null))
        return
      }

      const nextTarget = createSelectionTarget(element, 'point-hit-test', null)

      setMouseTarget(current =>
        current?.key === nextTarget.key && current?.element === nextTarget.element
          ? current
          : nextTarget,
      )
    }

    const handleMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget !== null) {
        return
      }

      resetMouseTarget()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointercancel', resetMouseTarget)
    window.addEventListener('blur', resetMouseTarget)
    document.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointercancel', resetMouseTarget)
      window.removeEventListener('blur', resetMouseTarget)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [enabled])

  useEffect(() => {
    const clearTargetSwitchTimer = () => {
      if (targetSwitchTimerRef.current !== null) {
        window.clearTimeout(targetSwitchTimerRef.current)
        targetSwitchTimerRef.current = null
      }

      activeSwitchGraceMsRef.current = null
    }

    const resetSwitchGrace = () => {
      targetSwitchStartedAtRef.current = null
      pendingTargetSwitchKeyRef.current = null
      pendingTargetSwitchRef.current = null
    }

    if (!enabled) {
      clearTargetSwitchTimer()
      resetSwitchGrace()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStableGazeTarget(null)
      return
    }

    const currentKey = stableGazeTarget?.key ?? null
    const nextKey = rawGazeTarget?.key ?? null

    if (currentKey === nextKey) {
      clearTargetSwitchTimer()
      resetSwitchGrace()

      if (
        stableGazeTarget &&
        rawGazeTarget &&
        stableGazeTarget.element !== rawGazeTarget.element
      ) {
        setStableGazeTarget(rawGazeTarget)
      }

      return
    }

    if (!stableGazeTarget && rawGazeTarget) {
      clearTargetSwitchTimer()
      resetSwitchGrace()
      setStableGazeTarget(rawGazeTarget)
      return
    }

    const usesCustomTalkSwitchTuning =
      isCustomTalkSelectionTarget(stableGazeTarget, customTalkSelectionScopeEnabled) ||
      isCustomTalkSelectionTarget(rawGazeTarget, customTalkSelectionScopeEnabled)

    if (
      usesCustomTalkSwitchTuning &&
      stableGazeTarget &&
      rawGazeTarget &&
      areTargetsInSameCell(stableGazeTarget, rawGazeTarget)
    ) {
      clearTargetSwitchTimer()
      resetSwitchGrace()
      return
    }

    if (
      usesCustomTalkSwitchTuning &&
      stableGazeTarget &&
      rawGazeTarget
    ) {
      const requiredMargin = areTargetsInSameSemanticGroup(stableGazeTarget, rawGazeTarget)
        ? CUSTOM_TALK_GAZE_TUNING.switchMargin + 0.03
        : CUSTOM_TALK_GAZE_TUNING.switchMargin

      if (rawGazeTarget.confidence < stableGazeTarget.confidence + requiredMargin) {
        clearTargetSwitchTimer()
        resetSwitchGrace()
        return
      }
    }

    clearTargetSwitchTimer()

    const switchGraceMs =
      usesCustomTalkSwitchTuning && nextKey !== null
        ? CUSTOM_TALK_GAZE_TUNING.switchHoldMs
        : usesCustomTalkSwitchTuning
          ? CUSTOM_TALK_GAZE_TUNING.stableHoldMs
          : GAZE_TARGET_SWITCH_GRACE_MS
    const pendingSwitchKey = `${currentKey ?? 'null'}=>${nextKey ?? 'null'}`

    if (pendingTargetSwitchKeyRef.current !== pendingSwitchKey) {
      pendingTargetSwitchKeyRef.current = pendingSwitchKey
      targetSwitchStartedAtRef.current = Date.now()
    }

    pendingTargetSwitchRef.current = rawGazeTarget
    activeSwitchGraceMsRef.current = switchGraceMs
    targetSwitchTimerRef.current = window.setTimeout(() => {
      const nextStableTarget = pendingTargetSwitchRef.current
      targetSwitchTimerRef.current = null
      activeSwitchGraceMsRef.current = null
      resetSwitchGrace()
      setStableGazeTarget(nextStableTarget)
    }, switchGraceMs)

    return clearTargetSwitchTimer
  }, [customTalkSelectionScopeEnabled, enabled, rawGazeTarget, stableGazeTarget])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isMounted = true

    void getActivationDelayPreset()
      .then(result => {
        if (!isMounted || !result.success) {
          return
        }

        setActivationDelayMs(ACTIVATION_DELAY_OPTIONS[result.data].value)
      })
      .catch(() => {
        // Keep the default activation delay when preset sync fails.
      })

    return () => {
      isMounted = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleActivationDelayUpdated = (event: Event) => {
      const preset = (event as CustomEvent<CareActivationDelayPresetUpdatedDetail>).detail?.preset

      if (!isActivationDelayPreset(preset)) {
        return
      }

      setActivationDelayMs(ACTIVATION_DELAY_OPTIONS[preset].value)
    }

    window.addEventListener(
      CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
      handleActivationDelayUpdated as EventListener,
    )

    return () => {
      window.removeEventListener(
        CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
        handleActivationDelayUpdated as EventListener,
      )
    }
  }, [enabled])

  const dwellState = useDwell<string>({
    hoveredTargetId: currentSelectionTarget?.key ?? null,
    dwellDurationMs: effectiveDwellDurationMs,
    activationDelayMs,
    disabled:
      !enabled ||
      !currentSelectionTarget ||
      currentSelectionBlockReason !== null ||
      isCurrentSelectionCommitSuppressed,
    onCommit: committedTargetKey => {
      const commitSource =
        currentInputSourceRef.current === 'pointer' ? 'pointer-dwell' : 'gaze-dwell'

      if (usePatientModeStore.getState().isGlobalMenuOpen) {
        console.info('[patient-input] skipped dwell commit because the global menu is open', {
          targetKey: committedTargetKey,
        })
        return
      }

      console.info('[patient-input] dwell commit', {
        source: commitSource,
        targetKey: committedTargetKey,
        dwellDurationMs: effectiveDwellDurationMs,
        activationDelayMs,
      })

      commitSelection(commitSource, committedTargetKey)
    },
  })

  useEffect(() => {
    if (!enabled) {
      lastCancelReasonRef.current = null
      return
    }

    if (
      currentSelectionBlockReason &&
      currentSelectionTarget &&
      lastCancelReasonRef.current !== currentSelectionBlockReason
    ) {
      console.info('[patient-input] dwell-cancel', {
        targetKey: currentSelectionTarget.key,
        trackingId: currentSelectionTarget.trackingId,
        reason: currentSelectionBlockReason,
      })
      lastCancelReasonRef.current = currentSelectionBlockReason
      useGazeSelectionStore.getState().setSelectionSnapshot({
        debug: {
          lastCancelReason: currentSelectionBlockReason,
        },
      })
    }

    if (!currentSelectionBlockReason) {
      lastCancelReasonRef.current = null
      useGazeSelectionStore.getState().setSelectionSnapshot({
        debug: {
          lastCancelReason: null,
        },
      })
    }
  }, [currentSelectionBlockReason, currentSelectionTarget, enabled])

  useEffect(() => {
    const nextHighlightedElement = currentSelectionTarget?.element ?? null
    const previousHighlightedElement = highlightedElementRef.current

    if (previousHighlightedElement && previousHighlightedElement !== nextHighlightedElement) {
      previousHighlightedElement.removeAttribute('data-gaze-active')
    }

    if (nextHighlightedElement) {
      nextHighlightedElement.setAttribute('data-gaze-active', 'true')
    }

    highlightedElementRef.current = nextHighlightedElement

    return () => {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.removeAttribute('data-gaze-active')
        highlightedElementRef.current = null
      }
    }
  }, [currentSelectionTarget])

  useEffect(() => {
    const commitSnapshotTarget = currentSelectionTarget

    const nextDebugPayload = {
      inputSource: currentInputSource,
      clientX: gazePoint?.clientX ?? null,
      clientY: gazePoint?.clientY ?? null,
      gazeCell,
      rawTargetKey: rawGazeTarget?.key ?? null,
      rawTargetId: rawGazeTarget?.trackingId ?? null,
      rawTargetSource: rawGazeTarget?.source ?? null,
      rawTargetCell: rawGazeTarget?.cell ?? null,
      rawTargetGroupId: rawGazeTarget?.groupId ?? null,
      stableTargetKey: stableGazeTarget?.key ?? null,
      stableTargetId: stableGazeTarget?.trackingId ?? null,
      stableTargetSource: stableGazeTarget?.source ?? null,
      stableTargetCell: stableGazeTarget?.cell ?? null,
      stableTargetGroupId: stableGazeTarget?.groupId ?? null,
      hoveredTargetKey: currentSelectionTarget?.key ?? null,
      hoveredTargetId: currentSelectionTarget?.trackingId ?? null,
      commitTargetKey: commitSnapshotTarget?.key ?? null,
      commitTargetId: commitSnapshotTarget?.trackingId ?? null,
      commitTargetSource: commitSnapshotTarget?.source ?? null,
      commitTargetInputSource: currentInputSource,
      hoveredTargetBlockedReason: currentSelectionBlockReason,
      dwellPhase: dwellState.phase,
      dwellProgress: dwellState.progress,
      dwellRemainingMs: dwellState.remainingMs,
      switchGracePending: targetSwitchTimerRef.current !== null,
      switchGraceStartedAt: targetSwitchStartedAtRef.current,
      switchGraceMs: targetSwitchTimerRef.current !== null ? activeSwitchGraceMsRef.current : null,
      gazePointUpdatedAt: gazePoint?.updatedAt ?? null,
    }

    useGazeSelectionStore.getState().setSelectionSnapshot({
      enabled,
      inputSource: currentInputSource,
      hoveredTargetId: currentSelectionTarget?.trackingId ?? null,
      activeTargetId:
        currentSelectionTarget?.trackingId && dwellState.phase !== 'idle'
          ? currentSelectionTarget.trackingId
          : null,
      rawTargetId: rawGazeTarget?.trackingId ?? null,
      stableTargetId: stableGazeTarget?.trackingId ?? null,
      commitTargetKey: commitSnapshotTarget?.key ?? null,
      commitTargetId: commitSnapshotTarget?.trackingId ?? null,
      phase: dwellState.phase,
      progress: dwellState.progress,
      remainingMs: dwellState.remainingMs,
      debug: nextDebugPayload,
    })

    if (!import.meta.env.DEV) {
      return
    }

    const nextDebugSignature = JSON.stringify(nextDebugPayload)

    if (lastDebugSignatureRef.current === nextDebugSignature) {
      return
    }

    lastDebugSignatureRef.current = nextDebugSignature
    ;(window as PatientDebugWindow).__PATIENT_GAZE_DEBUG_STATE = nextDebugPayload
    console.info('[patient-input] gaze-selection-state', nextDebugPayload)
  }, [
    currentInputSource,
    currentSelectionBlockReason,
    currentSelectionTarget,
    dwellState.phase,
    dwellState.progress,
    dwellState.remainingMs,
    enabled,
    gazeCell,
    gazePoint,
    isCurrentSelectionCommitSuppressed,
    rawGazeTarget,
    stableGazeTarget,
  ])

  useEffect(() => {
    const selectionCooldowns = selectionCooldownsRef.current

    return () => {
      if (commitDelayTimerRef.current !== null) {
        window.clearTimeout(commitDelayTimerRef.current)
        commitDelayTimerRef.current = null
      }

      if (confirmedTimerRef.current !== null) {
        window.clearTimeout(confirmedTimerRef.current)
        confirmedTimerRef.current = null
      }

      if (confirmedElementRef.current) {
        confirmedElementRef.current.removeAttribute('data-gaze-confirmed')
        confirmedElementRef.current = null
      }

      for (const entry of selectionCooldowns.values()) {
        window.clearTimeout(entry.timerId)
        entry.element?.removeAttribute('data-gaze-cooldown')
      }
      selectionCooldowns.clear()

      useGazeSelectionStore.getState().resetSelectionSnapshot()
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      return
    }

    useGazeSelectionStore.getState().resetSelectionSnapshot()
  }, [enabled])
}

export default usePatientGazeClick
