import { useEffect, useMemo, useRef, useState } from 'react'
import { useDwell } from './useDwell'
import {
  CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
  getActivationDelayPreset,
  type CareActivationDelayPresetUpdatedDetail,
} from '../../../../services/careSettingService'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import {
  getCustomTalkSelectableGroupElement,
} from '../../custom-talk/utils/selectionScope'
import {
  getPatientSelectionProfile,
  type PatientSelectionSurface,
} from '../services/patientSelectionPolicy'
import {
  PATIENT_INTERACTION_MARKER_ATTRIBUTE,
  PATIENT_INTERACTION_PROGRESS_CSS_VARIABLE,
  PATIENT_INTERACTION_SOURCE_ATTRIBUTE,
  PATIENT_INTERACTION_STATE_ATTRIBUTE,
  PATIENT_INTERACTIVE_ELEMENT_SELECTOR,
  type PatientInteractionState,
  getInteractiveElementFromPoint,
  getInteractiveElementSelectionKey,
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
  selectionSurface?: PatientSelectionSurface
}

const SELECTION_CONFIRM_FEEDBACK_MS = 420
const SELECTION_COMMIT_DELAY_MS = 0
const ROUTE_TRANSITION_COMMIT_GUARD_MS = 450
const DIALOG_SELECTION_CONTAINER_SELECTOR = '[role="dialog"][aria-modal="true"]'
const ENABLE_MOUSE_DWELL_CONFIRM =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_PATIENT_ENABLE_MOUSE_DWELL_CONFIRM ?? '').toLowerCase() === 'true'

type SelectionTargetSource =
  | 'cell-mapping'
  | 'fallback-point-hit-test'
  | 'pointer-hit-test'

type GazePoint = { clientX: number; clientY: number; updatedAt?: number } | null
type CellMappingFallbackReason =
  | 'missing-cell'
  | 'missing-mapping'
  | 'unmapped-cell'
  | 'ambiguous-cell-target'
  | 'missing-element'
  | 'outside-active-container'
  | 'blocked-element'
type CellMappingSource = 'active-store' | 'patient-main-fallback'

interface SelectionTarget {
  element: HTMLElement
  key: string
  trackingId: string | null
  source: SelectionTargetSource
  cell: number | null
  groupId: string | null
}

interface CanonicalCellTargetResolution {
  target: SelectionTarget | null
  fallbackReason: CellMappingFallbackReason | null
  mappingSource: CellMappingSource | null
  mappedTargets: string[]
  groupId: string | null
}

interface SelectionCooldownEntry {
  element: HTMLElement | null
  expiresAt: number
  stateTimerId: number | null
  timerId: number
}

type PatientDebugWindow = Window & {
  __DEV_GAZE_DISABLE_POINT_HIT_TEST?: boolean
  __PATIENT_GAZE_DEBUG_STATE?: unknown
}

let lastMappedTargetDebugKey: string | null = null

function getNumericZIndex(element: HTMLElement) {
  const zIndex = window.getComputedStyle(element).zIndex
  const parsed = Number.parseInt(zIndex, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function isVisibleSelectionContainer(element: HTMLElement) {
  if (!element.isConnected) {
    return false
  }

  const computedStyle = window.getComputedStyle(element)
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
    return false
  }

  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function resolveActiveSelectionContainer(
  selectionSurface: PatientSelectionSurface,
) {
  if (typeof document === 'undefined') {
    return null
  }

  if (isCustomTalkSurface(selectionSurface)) {
    return getCustomTalkSelectableGroupElement()
  }

  const dialogContainers = Array.from(
    document.querySelectorAll<HTMLElement>(DIALOG_SELECTION_CONTAINER_SELECTOR),
  ).filter(
    element =>
      isVisibleSelectionContainer(element) &&
      element.querySelector(PATIENT_INTERACTIVE_ELEMENT_SELECTOR) !== null,
  )

  if (dialogContainers.length === 0) {
    return null
  }

  return dialogContainers.reduce<HTMLElement | null>((best, current) => {
    if (!best) {
      return current
    }

    const bestZIndex = getNumericZIndex(best)
    const currentZIndex = getNumericZIndex(current)

    if (currentZIndex !== bestZIndex) {
      return currentZIndex > bestZIndex ? current : best
    }

    return best.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING
      ? current
      : best
  }, null)
}

function setElementInteractionState(
  element: HTMLElement,
  state: Exclude<PatientInteractionState, 'idle'>,
  source: 'pointer' | 'gaze' | null,
  progress = 0,
) {
  element.setAttribute(PATIENT_INTERACTION_MARKER_ATTRIBUTE, 'true')
  element.setAttribute(PATIENT_INTERACTION_STATE_ATTRIBUTE, state)

  if (source) {
    element.setAttribute(PATIENT_INTERACTION_SOURCE_ATTRIBUTE, source)
  } else {
    element.removeAttribute(PATIENT_INTERACTION_SOURCE_ATTRIBUTE)
  }

  element.style.setProperty(
    PATIENT_INTERACTION_PROGRESS_CSS_VARIABLE,
    `${Math.min(1, Math.max(0, progress))}`,
  )
}

function clearElementInteractionState(element: HTMLElement) {
  element.removeAttribute(PATIENT_INTERACTION_MARKER_ATTRIBUTE)
  element.removeAttribute(PATIENT_INTERACTION_STATE_ATTRIBUTE)
  element.removeAttribute(PATIENT_INTERACTION_SOURCE_ATTRIBUTE)
  element.style.removeProperty(PATIENT_INTERACTION_PROGRESS_CSS_VARIABLE)
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

function isCustomTalkSurface(surface: PatientSelectionSurface) {
  return surface === 'custom-talk' || surface === 'keyboard'
}

function createSelectionTarget(
  element: HTMLElement,
  source: SelectionTargetSource,
  cell: number | null,
  groupId: string | null = null,
): SelectionTarget {
  return {
    element,
    key: getInteractiveElementSelectionKey(element),
    trackingId: element.dataset.trackingId ?? null,
    source,
    cell,
    groupId,
  }
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

  if (
    element.hidden ||
    element.closest('[hidden], [inert], [aria-hidden="true"]') ||
    ('inert' in element && Boolean((element as HTMLElement & { inert?: boolean }).inert))
  ) {
    return 'inert'
  }

  if (!isInteractiveElementEligibleForGlobalGazeSelection(element)) {
    return 'mouse-only'
  }

  return null
}

function debugSelectionResolution(event: string, payload: Record<string, unknown>) {
  const nextDebugKey = `${event}:${JSON.stringify(payload)}`
  if (lastMappedTargetDebugKey === nextDebugKey) {
    return
  }

  lastMappedTargetDebugKey = nextDebugKey
  console.info('[patient-input] selection-resolution', {
    event,
    ...payload,
  })
}

function resolveCanonicalCellMappedTarget(input: {
  cell: number | null
  mapping: PatientCellMapping | null
  activeContainer?: HTMLElement | null
  mappingSource: CellMappingSource | null
}): CanonicalCellTargetResolution {
  const { cell, mapping, activeContainer, mappingSource } = input

  if (cell === null) {
    return {
      target: null,
      fallbackReason: 'missing-cell',
      mappingSource,
      mappedTargets: [],
      groupId: null,
    }
  }

  if (!mapping) {
    return {
      target: null,
      fallbackReason: 'missing-mapping',
      mappingSource,
      mappedTargets: [],
      groupId: null,
    }
  }

  const normalizedTarget = normalizePatientCellMappingTarget(mapping[cell] ?? null)

  if (normalizedTarget.allTargets.length === 0) {
    return {
      target: null,
      fallbackReason: 'unmapped-cell',
      mappingSource,
      mappedTargets: [],
      groupId: normalizedTarget.groupId,
    }
  }

  if (normalizedTarget.targets.length > 1 || normalizedTarget.fallbackTargets.length > 1) {
    return {
      target: null,
      fallbackReason: 'ambiguous-cell-target',
      mappingSource,
      mappedTargets: normalizedTarget.allTargets,
      groupId: normalizedTarget.groupId,
    }
  }

  const candidateTrackingIds = [
    normalizedTarget.targets[0] ?? null,
    normalizedTarget.fallbackTargets[0] ?? null,
  ].filter((trackingId): trackingId is string => Boolean(trackingId))

  let fallbackReason: CellMappingFallbackReason = 'missing-element'

  for (const trackingId of candidateTrackingIds) {
    const mappedElement = getElementByTrackingId(trackingId)

    if (!mappedElement) {
      fallbackReason = 'missing-element'
      continue
    }

    if (activeContainer && !activeContainer.contains(mappedElement)) {
      fallbackReason = 'outside-active-container'
      continue
    }

    if (getSelectionBlockReason(mappedElement) !== null) {
      fallbackReason = 'blocked-element'
      continue
    }

    return {
      target: createSelectionTarget(mappedElement, 'cell-mapping', cell, normalizedTarget.groupId),
      fallbackReason: null,
      mappingSource,
      mappedTargets: normalizedTarget.allTargets,
      groupId: normalizedTarget.groupId,
    }
  }

  return {
    target: null,
    fallbackReason,
    mappingSource,
    mappedTargets: normalizedTarget.allTargets,
    groupId: normalizedTarget.groupId,
  }
}

function resolveFallbackPointTarget(input: {
  gazePoint: GazePoint
  gazeCell: number | null
  activeContainer?: HTMLElement | null
}): SelectionTarget | null {
  const { gazePoint, gazeCell, activeContainer } = input

  if (!gazePoint) {
    return null
  }

  const pointElement = getInteractiveElementFromPoint(
    gazePoint.clientX,
    gazePoint.clientY,
    activeContainer,
  )

  return pointElement
    ? createSelectionTarget(pointElement, 'fallback-point-hit-test', gazeCell)
    : null
}

function resolveRawGazeTarget(input: {
  enabled: boolean
  selectionSurface: PatientSelectionSurface
  gazePoint: GazePoint
  gazeCell: number | null
  cellMapping: PatientCellMapping | null
  activeCellMappingOwner: string | null
}): SelectionTarget | null {
  const { enabled, gazePoint, gazeCell, cellMapping, activeCellMappingOwner } = input

  if (!enabled) {
    return null
  }

  const fallbackPatientMainCellMapping = getFallbackPatientMainCellMapping()
  const activeCellMapping = cellMapping ?? fallbackPatientMainCellMapping
  const cellMappingSource: CellMappingSource | null = cellMapping
    ? 'active-store'
    : fallbackPatientMainCellMapping
      ? 'patient-main-fallback'
      : null
  const candidateContainer = resolveActiveSelectionContainer(input.selectionSurface)
  const disablePointHitTest =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window as PatientDebugWindow).__DEV_GAZE_DISABLE_POINT_HIT_TEST === true

  const mappedResolution = resolveCanonicalCellMappedTarget({
    cell: gazeCell,
    mapping: activeCellMapping,
    activeContainer: candidateContainer,
    mappingSource: cellMappingSource,
  })

  if (mappedResolution.target) {
    if (mappedResolution.mappingSource === 'patient-main-fallback') {
      debugSelectionResolution('cell-mapping-fallback-source', {
        cell: gazeCell,
        mappingOwner: 'patient-main-default',
        targetId: mappedResolution.target.trackingId,
      })
    }

    return mappedResolution.target
  }

  if (disablePointHitTest || mappedResolution.fallbackReason === null) {
    return null
  }

  const fallbackPointTarget = resolveFallbackPointTarget({
    gazePoint,
    gazeCell,
    activeContainer: candidateContainer,
  })

  if (fallbackPointTarget) {
    debugSelectionResolution('fallback-point-hit-test', {
      reason: mappedResolution.fallbackReason,
      cell: gazeCell,
      mappingOwner:
        activeCellMappingOwner ??
        (cellMappingSource === 'patient-main-fallback' ? 'patient-main-default' : null),
      mappingSource: mappedResolution.mappingSource,
      mappedTargets: mappedResolution.mappedTargets,
      groupId: mappedResolution.groupId,
      targetId: fallbackPointTarget.trackingId,
      targetKey: fallbackPointTarget.key,
      selectionSurface: input.selectionSurface,
    })

    return fallbackPointTarget
  }

  debugSelectionResolution('fallback-point-hit-test-miss', {
    reason: mappedResolution.fallbackReason,
    cell: gazeCell,
    mappingOwner:
      activeCellMappingOwner ??
      (cellMappingSource === 'patient-main-fallback' ? 'patient-main-default' : null),
    mappingSource: mappedResolution.mappingSource,
    mappedTargets: mappedResolution.mappedTargets,
    groupId: mappedResolution.groupId,
    selectionSurface: input.selectionSurface,
  })

  return null
}

export function usePatientGazeClick({
  enabled = true,
  selectionSurface = 'common',
}: UsePatientGazeClickOptions = {}) {
  const gazePoint = useGazeInputStore(state => state.point)
  const gazeCell = useGazeInputStore(state => state.cell)
  const cellMapping = useCellMappingStore(state => state.cellMapping)
  const activeCellMappingOwner = useCellMappingStore(state => state.activeOwnerDebugLabel)
  const selectionProfile = useMemo(
    () => getPatientSelectionProfile(selectionSurface),
    [selectionSurface],
  )
  const selectionDwellDurationMs = usePatientModeStore(
    state => state.selectionDwellDurationMs,
  )
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
  const commitGuardTimerRef = useRef<number | null>(null)
  const lastDebugSignatureRef = useRef<string | null>(null)
  const lastCancelReasonRef = useRef<string | null>(null)
  const selectionCooldownsRef = useRef<Map<string, SelectionCooldownEntry>>(new Map())
  const highlightedElementRef = useRef<HTMLElement | null>(null)
  const mouseTargetRef = useRef<SelectionTarget | null>(null)
  const stableGazeTargetRef = useRef<SelectionTarget | null>(null)
  const currentVisualTargetRef = useRef<SelectionTarget | null>(null)
  const currentDwellTargetRef = useRef<SelectionTarget | null>(null)
  const currentVisualInputSourceRef = useRef<'pointer' | 'gaze' | null>(null)
  const currentDwellInputSourceRef = useRef<'pointer' | 'gaze' | null>(null)
  const currentVisualInteractionStateRef = useRef<Exclude<PatientInteractionState, 'idle'> | null>(null)
  const currentVisualInteractionProgressRef = useRef(0)

  const rawGazeTarget = useMemo(
    () =>
      resolveRawGazeTarget({
        enabled,
        selectionSurface,
        gazePoint,
        gazeCell,
        cellMapping,
        activeCellMappingOwner,
      }),
    [
      activeCellMappingOwner,
      cellMapping,
      enabled,
      gazeCell,
      gazePoint,
      selectionSurface,
    ],
  )
  const effectiveDwellDurationMs = selectionDwellDurationMs

  const currentVisualTarget = stableGazeTarget ?? null
  const currentVisualInputSource: 'pointer' | 'gaze' | null = stableGazeTarget
    ? 'gaze'
    : null
  const currentDwellTarget = stableGazeTarget
  const currentDwellInputSource: 'pointer' | 'gaze' | null = stableGazeTarget
    ? 'gaze'
    : null
  const isCurrentSelectionCommitSuppressed =
    currentDwellTarget?.key === suppressedCommitTargetKey
  const currentSelectionBlockReason = currentDwellTarget
    ? getSelectionBlockReason(currentDwellTarget.element)
    : null

  const clearConfirmedTimer = () => {
    if (confirmedTimerRef.current !== null) {
      window.clearTimeout(confirmedTimerRef.current)
      confirmedTimerRef.current = null
    }
  }

  const findActiveCooldownEntryByElement = (element: HTMLElement) => {
    for (const entry of selectionCooldownsRef.current.values()) {
      if (entry.element === element && entry.expiresAt > Date.now()) {
        return entry
      }
    }

    return null
  }

  const restoreInteractionStateForElement = (element: HTMLElement) => {
    if (confirmedElementRef.current === element) {
      setElementInteractionState(element, 'confirmed', currentDwellInputSourceRef.current, 1)
      return
    }

    if (findActiveCooldownEntryByElement(element)) {
      setElementInteractionState(element, 'cooldown', currentVisualInputSourceRef.current, 0)
      return
    }

    if (
      highlightedElementRef.current === element &&
      currentVisualInteractionStateRef.current
    ) {
      setElementInteractionState(
        element,
        currentVisualInteractionStateRef.current,
        currentVisualInputSourceRef.current,
        currentVisualInteractionProgressRef.current,
      )
      element.setAttribute('data-gaze-active', 'true')
      return
    }

    element.removeAttribute('data-gaze-active')
    clearElementInteractionState(element)
  }

  const clearSelectionCooldown = (targetKey: string) => {
    const entry = selectionCooldownsRef.current.get(targetKey)
    if (!entry) {
      return
    }

    if (entry.stateTimerId !== null) {
      window.clearTimeout(entry.stateTimerId)
    }

    window.clearTimeout(entry.timerId)
    entry.element?.removeAttribute('data-gaze-cooldown')
    selectionCooldownsRef.current.delete(targetKey)

    if (entry.element) {
      restoreInteractionStateForElement(entry.element)
    }
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
      restoreInteractionStateForElement(confirmedElementRef.current)
    }

    clearConfirmedTimer()
    element.setAttribute('data-gaze-confirmed', 'true')
    setElementInteractionState(element, 'confirmed', currentDwellInputSourceRef.current, 1)
    confirmedElementRef.current = element
    confirmedTimerRef.current = window.setTimeout(() => {
      if (confirmedElementRef.current === element) {
        confirmedElementRef.current = null
      }

      element.removeAttribute('data-gaze-confirmed')
      restoreInteractionStateForElement(element)
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
    const stateTimerId = window.setTimeout(() => {
      const currentEntry = selectionCooldownsRef.current.get(targetKey)
      if (!currentEntry || currentEntry.element !== element) {
        return
      }

      if (confirmedElementRef.current !== element) {
        setElementInteractionState(element, 'cooldown', currentVisualInputSourceRef.current, 0)
      }
    }, Math.min(durationMs, SELECTION_CONFIRM_FEEDBACK_MS))
    const timerId = window.setTimeout(() => {
      const currentEntry = selectionCooldownsRef.current.get(targetKey)
      if (!currentEntry || currentEntry.timerId !== timerId) {
        return
      }

      currentEntry.element?.removeAttribute('data-gaze-cooldown')
      selectionCooldownsRef.current.delete(targetKey)
      if (currentEntry.stateTimerId !== null) {
        window.clearTimeout(currentEntry.stateTimerId)
      }
      if (currentEntry.element) {
        restoreInteractionStateForElement(currentEntry.element)
      }
    }, durationMs)

    selectionCooldownsRef.current.set(targetKey, {
      element,
      expiresAt,
      stateTimerId,
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

    const currentSnapshot = currentDwellTargetRef.current

    if (
      currentDwellInputSourceRef.current === expectedInputSource &&
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

    if (commitGuardTimerRef.current !== null) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'route-transition-guard',
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
      selectionProfile.cooldownMs,
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
    commitGuardTimerRef.current = window.setTimeout(() => {
      commitGuardTimerRef.current = null
    }, ROUTE_TRANSITION_COMMIT_GUARD_MS)

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
    currentVisualTargetRef.current = currentVisualTarget
    currentDwellTargetRef.current = currentDwellTarget
    currentVisualInputSourceRef.current = currentVisualInputSource
    currentDwellInputSourceRef.current = currentDwellInputSource
  }, [
    currentDwellInputSource,
    currentDwellTarget,
    currentVisualInputSource,
    currentVisualTarget,
    mouseTarget,
    stableGazeTarget,
  ])

  useEffect(() => {
    if (!suppressedCommitTargetKey) {
      return
    }

    if (currentDwellTarget?.key !== suppressedCommitTargetKey) {
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
  }, [currentDwellTarget?.key, currentSelectionBlockReason, suppressedCommitTargetKey])

  useEffect(() => {
    if (!enabled || !ENABLE_MOUSE_DWELL_CONFIRM || typeof window === 'undefined') {
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

      const activeContainer = resolveActiveSelectionContainer(selectionSurface)
      const element = getInteractiveElementFromPoint(
        event.clientX,
        event.clientY,
        activeContainer,
      )

      if (!element) {
        setMouseTarget(current => (current === null ? current : null))
        return
      }

      const nextTarget = createSelectionTarget(element, 'pointer-hit-test', null)

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
    window.addEventListener('resize', resetMouseTarget)
    window.addEventListener('scroll', resetMouseTarget, true)
    document.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointercancel', resetMouseTarget)
      window.removeEventListener('blur', resetMouseTarget)
      window.removeEventListener('resize', resetMouseTarget)
      window.removeEventListener('scroll', resetMouseTarget, true)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [enabled, selectionSurface])

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

    clearTargetSwitchTimer()

    const switchGraceMs =
      nextKey !== null
        ? selectionProfile.switchHoldMs
        : selectionProfile.stableHoldMs
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
  }, [enabled, rawGazeTarget, selectionProfile, stableGazeTarget])

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
    hoveredTargetId: currentDwellTarget?.key ?? null,
    dwellDurationMs: effectiveDwellDurationMs,
    activationDelayMs,
    disabled:
      !enabled ||
      !currentDwellTarget ||
      currentSelectionBlockReason !== null ||
      isCurrentSelectionCommitSuppressed,
    onCommit: committedTargetKey => {
      const commitSource =
        currentDwellInputSourceRef.current === 'pointer' ? 'pointer-dwell' : 'gaze-dwell'

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
      currentDwellTarget &&
      lastCancelReasonRef.current !== currentSelectionBlockReason
    ) {
      console.info('[patient-input] dwell-cancel', {
        targetKey: currentDwellTarget.key,
        trackingId: currentDwellTarget.trackingId,
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
  }, [currentDwellTarget, currentSelectionBlockReason, enabled])

  const currentVisualInteractionState: Exclude<PatientInteractionState, 'idle'> | null =
    currentVisualTarget
      ? currentDwellTarget?.key === currentVisualTarget.key && dwellState.phase !== 'idle'
        ? 'dwell'
        : 'hover'
      : null
  const currentVisualInteractionProgress =
    currentVisualInteractionState === 'dwell' ? dwellState.progress : 0

  useEffect(() => {
    const nextHighlightedElement = currentVisualTarget?.element ?? null
    const previousHighlightedElement = highlightedElementRef.current

    if (previousHighlightedElement && previousHighlightedElement !== nextHighlightedElement) {
      previousHighlightedElement.removeAttribute('data-gaze-active')
      restoreInteractionStateForElement(previousHighlightedElement)
    }

    if (nextHighlightedElement) {
      nextHighlightedElement.setAttribute('data-gaze-active', 'true')
    }

    highlightedElementRef.current = nextHighlightedElement
  }, [currentVisualTarget])

  useEffect(() => {
    currentVisualInteractionStateRef.current = currentVisualInteractionState
    currentVisualInteractionProgressRef.current = currentVisualInteractionProgress

    if (!highlightedElementRef.current) {
      return
    }

    restoreInteractionStateForElement(highlightedElementRef.current)
  }, [
    currentVisualInputSource,
    currentVisualInteractionProgress,
    currentVisualInteractionState,
  ])

  useEffect(() => {
    const commitSnapshotTarget = currentDwellTarget

    const nextDebugPayload = {
      inputSource: currentVisualInputSource,
      clientX: gazePoint?.clientX ?? null,
      clientY: gazePoint?.clientY ?? null,
      gazeCell,
      activeCellMappingOwner,
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
      hoveredTargetKey: currentVisualTarget?.key ?? null,
      hoveredTargetId: currentVisualTarget?.trackingId ?? null,
      commitTargetKey: commitSnapshotTarget?.key ?? null,
      commitTargetId: commitSnapshotTarget?.trackingId ?? null,
      commitTargetSource: commitSnapshotTarget?.source ?? null,
      commitTargetInputSource: currentDwellInputSource,
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
      inputSource: currentVisualInputSource,
      hoveredTargetId: currentVisualTarget?.trackingId ?? null,
      activeTargetId:
        currentDwellTarget?.trackingId && dwellState.phase !== 'idle'
          ? currentDwellTarget.trackingId
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
    activeCellMappingOwner,
    currentDwellInputSource,
    currentSelectionBlockReason,
    currentDwellTarget,
    currentVisualInputSource,
    currentVisualTarget,
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

      if (commitGuardTimerRef.current !== null) {
        window.clearTimeout(commitGuardTimerRef.current)
        commitGuardTimerRef.current = null
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
        if (entry.stateTimerId !== null) {
          window.clearTimeout(entry.stateTimerId)
        }
        window.clearTimeout(entry.timerId)
        entry.element?.removeAttribute('data-gaze-cooldown')
        if (entry.element) {
          clearElementInteractionState(entry.element)
        }
      }
      selectionCooldowns.clear()

      if (highlightedElementRef.current) {
        highlightedElementRef.current.removeAttribute('data-gaze-active')
        clearElementInteractionState(highlightedElementRef.current)
        highlightedElementRef.current = null
      }

      useGazeSelectionStore.getState().resetSelectionSnapshot()
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      return
    }

    if (highlightedElementRef.current) {
      highlightedElementRef.current.removeAttribute('data-gaze-active')
      clearElementInteractionState(highlightedElementRef.current)
      highlightedElementRef.current = null
    }

    useGazeSelectionStore.getState().resetSelectionSnapshot()
  }, [enabled])
}

export default usePatientGazeClick
