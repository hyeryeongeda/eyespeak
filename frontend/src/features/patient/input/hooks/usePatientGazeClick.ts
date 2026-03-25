import { useEffect, useMemo, useRef, useState } from 'react'
import { useDwell } from './useDwell'
import {
  CARE_ACTIVATION_DELAY_PRESET_UPDATED_EVENT,
  getActivationDelayPreset,
  type CareActivationDelayPresetUpdatedDetail,
} from '../../../../services/careSettingService'
import { submitActiveEyeTrackingSelectionFeedback } from '../services/eyeTrackingSelectionFeedbackService'
import {
  getInteractiveElementFromPoint,
  getInteractiveElementSelectionKey,
  isInteractiveElementEligibleForGlobalGazeSelection,
} from '../services/trackingService'
import {
  PATIENT_DOUBLE_BLINK_EVENT,
  type PatientDoubleBlinkDetail,
} from '../services/patientModeBridge'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { useCellMappingStore } from '../stores/cellMappingStore'
import { usePatientModeStore } from '../stores/patientModeStore'
import {
  ACTIVATION_DELAY_OPTIONS,
  type ActivationDelayPreset,
} from '../../../../types/care'

interface UsePatientGazeClickOptions {
  enabled?: boolean
}

const DOUBLE_BLINK_COMMIT_GUARD_MS = 400
const GAZE_TARGET_SWITCH_GRACE_MS = 500
const SELECTION_CONFIRM_FEEDBACK_MS = 900
const TARGET_RESELECTION_COOLDOWN_MS = 2000

interface GazeTarget {
  element: HTMLElement
  key: string
  source: 'cell-mapping' | 'point-hit-test' | 'cell-dom-fallback'
  cell: number | null
}

type PatientSelectionCommitSource = 'dwell' | 'double-blink'

interface SelectionCooldownEntry {
  element: HTMLElement | null
  expiresAt: number
  timerId: number
}

function isActivationDelayPreset(value: unknown): value is ActivationDelayPreset {
  return typeof value === 'string' && value in ACTIVATION_DELAY_OPTIONS
}

function getElementByTrackingId(trackingId: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  const escapedTrackingId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(trackingId)
      : trackingId.replace(/["\\]/g, '\\$&')

  return document.querySelector<HTMLElement>(`[data-tracking-id="${escapedTrackingId}"]`)
}

function isPatientMainTrackingId(value: string | null | undefined) {
  return value === 'talk' || value === 'call' || value === 'leisure'
}

function getPatientMainPointTarget(gazePoint: { clientX: number; clientY: number } | null): GazeTarget | null {
  if (!gazePoint) {
    return null
  }

  const element = getInteractiveElementFromPoint(gazePoint.clientX, gazePoint.clientY)

  if (!element) {
    return null
  }

  const trackingId = element.dataset.trackingId

  if (!isPatientMainTrackingId(trackingId)) {
    return null
  }

  return {
    element,
    key: getInteractiveElementSelectionKey(element),
    source: 'point-hit-test',
    cell: null,
  }
}

function getFallbackPatientMainCellMapping(): Record<number, string | null> | null {
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

function getMappedGazeTarget(
  cell: number | null,
  mapping: Record<number, string | null> | null,
): GazeTarget | null {
  const mappedTrackingId = typeof cell === 'number' && mapping ? (mapping[cell] ?? null) : null

  if (!mappedTrackingId) {
    return null
  }

  const mappedElement = getElementByTrackingId(mappedTrackingId)

  if (!mappedElement) {
    return null
  }

  return {
    element: mappedElement,
    key: getInteractiveElementSelectionKey(mappedElement),
    source: 'cell-mapping',
    cell,
  }
}

function isElementVisuallyInteractive(element: HTMLElement) {
  if (!element.isConnected) {
    return false
  }

  if (!isInteractiveElementEligibleForGlobalGazeSelection(element)) {
    return false
  }

  if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') {
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

function getNearestInteractiveTargetFromPoint(
  point: { clientX: number; clientY: number } | null,
): GazeTarget | null {
  if (typeof document === 'undefined' || !point) {
    return null
  }

  const interactiveElements = Array.from(
    document.querySelectorAll<HTMLElement>('button, a[href], input[type="button"], input[type="submit"], [role="button"]')
  ).filter(isElementVisuallyInteractive)

  if (interactiveElements.length === 0) {
    return null
  }

  const nearest = interactiveElements.reduce<HTMLElement | null>((best, current) => {
    if (!best) {
      return current
    }

    const cr = current.getBoundingClientRect()
    const br = best.getBoundingClientRect()

    const ccx = cr.left + cr.width / 2
    const ccy = cr.top + cr.height / 2
    const bcx = br.left + br.width / 2
    const bcy = br.top + br.height / 2

    const currentDist = Math.hypot(point.clientX - ccx, point.clientY - ccy)
    const bestDist = Math.hypot(point.clientX - bcx, point.clientY - bcy)

    return currentDist < bestDist ? current : best
  }, null)

  if (!nearest) {
    return null
  }

  return {
    element: nearest,
    key: getInteractiveElementSelectionKey(nearest),
    source: 'point-hit-test',
    cell: null,
  }
}

function getInteractiveElementBlockReason(element: HTMLElement | null) {
  if (!element) {
    return 'missing-target'
  }

  if (!element.isConnected) {
    return 'disconnected'
  }

  if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') {
    return 'disabled'
  }

  const computedStyle = window.getComputedStyle(element)

  if (computedStyle.display === 'none') {
    return 'display-none'
  }

  if (computedStyle.visibility === 'hidden') {
    return 'visibility-hidden'
  }

  if (!isInteractiveElementEligibleForGlobalGazeSelection(element)) {
    return 'mouse-only'
  }

  return null
}

export function usePatientGazeClick({
  enabled = true,
}: UsePatientGazeClickOptions = {}) {
  const gazePoint = useGazeInputStore(state => state.point)
  const gazeCell = useGazeInputStore(state => state.cell)
  const cellMapping = useCellMappingStore(state => state.cellMapping)
  const dwellDurationMs = usePatientModeStore(state => state.globalMenuDwellDurationMs)
  const [activationDelayMs, setActivationDelayMs] =
    useState(ACTIVATION_DELAY_OPTIONS.medium.value)
  const activeElementRef = useRef<HTMLElement | null>(null)
  const lastDoubleBlinkAtRef = useRef(0)
  const targetSwitchTimerRef = useRef<number | null>(null)
  const targetSwitchGraceStartedAtRef = useRef<number | null>(null)
  const targetSwitchPendingKeyRef = useRef<string | null>(null)
  const lastGazeTargetDebugSignatureRef = useRef<string | null>(null)
  const highlightedElementRef = useRef<HTMLElement | null>(null)
  const confirmedElementRef = useRef<HTMLElement | null>(null)
  const confirmedTimerRef = useRef<number | null>(null)
  const selectionCooldownsRef = useRef<Map<string, SelectionCooldownEntry>>(new Map())
  const [stableGazeTarget, setStableGazeTarget] = useState<GazeTarget | null>(null)

  const clearConfirmedTimer = () => {
    if (confirmedTimerRef.current !== null) {
      window.clearTimeout(confirmedTimerRef.current)
      confirmedTimerRef.current = null
    }
  }

  const clearConfirmedSelection = (element?: HTMLElement | null) => {
    const targetElement = element ?? confirmedElementRef.current
    if (targetElement) {
      targetElement.removeAttribute('data-gaze-confirmed')
    }

    if (!element || confirmedElementRef.current === element) {
      confirmedElementRef.current = null
    }

    clearConfirmedTimer()
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

  const startSelectionCooldown = (targetKey: string, element: HTMLElement) => {
    clearSelectionCooldown(targetKey)

    element.setAttribute('data-gaze-cooldown', 'true')

    const expiresAt = Date.now() + TARGET_RESELECTION_COOLDOWN_MS
    const timerId = window.setTimeout(() => {
      const currentEntry = selectionCooldownsRef.current.get(targetKey)
      if (!currentEntry || currentEntry.timerId !== timerId) {
        return
      }

      currentEntry.element?.removeAttribute('data-gaze-cooldown')
      selectionCooldownsRef.current.delete(targetKey)
    }, TARGET_RESELECTION_COOLDOWN_MS)

    selectionCooldownsRef.current.set(targetKey, {
      element,
      expiresAt,
      timerId,
    })
  }

  const rawGazeTarget = useMemo(() => {
    if (!enabled) {
      return null
    }

    // DEV flag: window.__DEV_GAZE_DISABLE_POINT_HIT_TEST = true で
    // point-hit-test を完全スキップして cell-mapping のみ使用
    // 브라우저 콘솔에서 토글 가능, 다음 gaze 업데이트부터 반영
    const disablePointHitTest =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__DEV_GAZE_DISABLE_POINT_HIT_TEST === true

    if (gazePoint && !disablePointHitTest) {
      const patientMainPointTarget = getPatientMainPointTarget(gazePoint)
      if (patientMainPointTarget) {
        return patientMainPointTarget
      }

      const element = getInteractiveElementFromPoint(gazePoint.clientX, gazePoint.clientY)

      if (element) {
        return {
          element,
          key: getInteractiveElementSelectionKey(element),
          source: 'point-hit-test' as const,
          cell: gazeCell,
        }
      }

      const nearest = getNearestInteractiveTargetFromPoint(gazePoint)
      if (nearest) {
        return nearest
      }
    }

    const mappedTarget = getMappedGazeTarget(
      gazeCell,
      cellMapping ?? getFallbackPatientMainCellMapping(),
    )

    return mappedTarget
  }, [cellMapping, enabled, gazeCell, gazePoint])

  const resolveCurrentGazeTarget = () => {
    if (stableGazeTarget?.element && stableGazeTarget.element.isConnected) {
      return stableGazeTarget
    }

    if (rawGazeTarget?.element && rawGazeTarget.element.isConnected) {
      return rawGazeTarget
    }

    const latestPoint = useGazeInputStore.getState().point
    const latestCell = useGazeInputStore.getState().cell

    if (latestPoint) {
      const patientMainPointTarget = getPatientMainPointTarget(latestPoint)
      if (patientMainPointTarget?.element.isConnected) {
        return patientMainPointTarget
      }

      const element = getInteractiveElementFromPoint(latestPoint.clientX, latestPoint.clientY)

      if (element) {
        return {
          element,
          key: getInteractiveElementSelectionKey(element),
          source: 'point-hit-test',
          cell: useGazeInputStore.getState().cell,
        }
      }

      const nearest = getNearestInteractiveTargetFromPoint(latestPoint)
      if (nearest?.element.isConnected) {
        return nearest
      }
    }

    const mappedTarget = getMappedGazeTarget(
      latestCell,
      useCellMappingStore.getState().cellMapping ?? getFallbackPatientMainCellMapping(),
    )
    if (mappedTarget?.element.isConnected) {
      return mappedTarget
    }

    return null
  }

  const commitSelection = (source: PatientSelectionCommitSource) => {
    const { isGlobalMenuOpen, trackingStatus } = usePatientModeStore.getState()

    if (import.meta.env.DEV) {
      console.info('[patient-input] selection-commit-attempt', {
        source,
        stableTargetKey: stableGazeTarget?.key ?? null,
        rawTargetKey: rawGazeTarget?.key ?? null,
        globalMenuOpen: isGlobalMenuOpen,
        trackingStatus,
      })
    }

    if (isGlobalMenuOpen) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'global-menu-open',
        trackingStatus,
      })

      return false
    }

    const resolvedTarget = resolveCurrentGazeTarget()

    if (!resolvedTarget) {
      activeElementRef.current = null

      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'no-active-target',
        trackingStatus,
      })

      return false
    }

    activeElementRef.current = resolvedTarget.element

    if (isTargetCoolingDown(resolvedTarget.key)) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: 'cooldown',
        targetKey: resolvedTarget.key,
        trackingStatus,
      })

      return false
    }

    const blockReason = getInteractiveElementBlockReason(resolvedTarget.element)

    if (blockReason) {
      console.info('[patient-input] selection-commit-blocked', {
        source,
        reason: blockReason,
        targetKey: resolvedTarget.key,
        targetSource: resolvedTarget.source,
        targetCell: resolvedTarget.cell,
        trackingStatus,
      })

      return false
    }

    const computedStyle = window.getComputedStyle(resolvedTarget.element)

    if (import.meta.env.DEV) {
      console.info('[patient-input] selection-commit-ready', {
        source,
        targetKey: resolvedTarget.key,
        trackingId: resolvedTarget.element.dataset.trackingId ?? null,
        tagName: resolvedTarget.element.tagName,
        pointerEvents: computedStyle.pointerEvents,
        visibility: computedStyle.visibility,
        targetSource: resolvedTarget.source,
        targetCell: resolvedTarget.cell,
        trackingStatus,
      })
    }

    submitActiveEyeTrackingSelectionFeedback()
    markSelectionConfirmed(resolvedTarget.element)
    startSelectionCooldown(resolvedTarget.key, resolvedTarget.element)
    resolvedTarget.element.click()

    console.info('[patient-input] selection-commit-success', {
      source,
      targetKey: resolvedTarget.key,
      trackingId: resolvedTarget.element.dataset.trackingId ?? null,
      tagName: resolvedTarget.element.tagName,
      pointerEvents: computedStyle.pointerEvents,
      trackingStatus,
    })

    return true
  }

  useEffect(() => {
    const clearTargetSwitchTimer = () => {
      if (targetSwitchTimerRef.current !== null) {
        window.clearTimeout(targetSwitchTimerRef.current)
        targetSwitchTimerRef.current = null
      }
    }
    const resetTargetSwitchGraceTracking = () => {
      targetSwitchGraceStartedAtRef.current = null
      targetSwitchPendingKeyRef.current = null
    }

    if (!enabled) {
      clearTargetSwitchTimer()
      resetTargetSwitchGraceTracking()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStableGazeTarget(null)
      return
    }

    const currentTargetKey = stableGazeTarget?.key ?? null
    const nextTargetKey = rawGazeTarget?.key ?? null

    if (currentTargetKey === nextTargetKey) {
      clearTargetSwitchTimer()
      resetTargetSwitchGraceTracking()

      if (
        stableGazeTarget &&
        rawGazeTarget &&
        stableGazeTarget.element !== rawGazeTarget.element
      ) {
        setStableGazeTarget(rawGazeTarget)
      }

      return
    }

    clearTargetSwitchTimer()

    if (!stableGazeTarget && rawGazeTarget) {
      resetTargetSwitchGraceTracking()
      setStableGazeTarget(rawGazeTarget)
      return
    }

    const pendingTargetSwitchKey = `${currentTargetKey ?? 'null'}=>${nextTargetKey ?? 'null'}`
    if (targetSwitchPendingKeyRef.current !== pendingTargetSwitchKey) {
      targetSwitchPendingKeyRef.current = pendingTargetSwitchKey
      targetSwitchGraceStartedAtRef.current = Date.now()
    }

    targetSwitchTimerRef.current = window.setTimeout(() => {
      targetSwitchTimerRef.current = null
      resetTargetSwitchGraceTracking()
      setStableGazeTarget(rawGazeTarget)
    }, GAZE_TARGET_SWITCH_GRACE_MS)

    return clearTargetSwitchTimer
  }, [enabled, rawGazeTarget, stableGazeTarget])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      lastGazeTargetDebugSignatureRef.current = null
      return
    }

    const gracePending = targetSwitchTimerRef.current !== null
    const disablePointHitTestFlag =
      typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__DEV_GAZE_DISABLE_POINT_HIT_TEST === true
    const debugPayload = {
      // 좌표계 확인용: hit-test에 실제 사용된 viewport 픽셀 좌표
      clientX: gazePoint?.clientX ?? null,
      clientY: gazePoint?.clientY ?? null,
      viewport: typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : null,
      // rawTargetSource: 'point-hit-test' | 'cell-mapping' | 'cell-dom-fallback'
      // point-hit-test → clientX/clientY 기반 document.elementsFromPoint() 결과
      // cell-mapping   → iframe이 보낸 cell 번호 기반 매핑 결과
      rawTargetSource: rawGazeTarget?.source ?? null,
      gazeCell,
      rawTargetKey: rawGazeTarget?.key ?? null,
      stableTargetKey: stableGazeTarget?.key ?? null,
      stableTargetSource: stableGazeTarget?.source ?? null,
      rawTargetCell: rawGazeTarget?.cell ?? null,
      stableTargetCell: stableGazeTarget?.cell ?? null,
      gracePending,
      targetSwitchGraceMs: gracePending ? GAZE_TARGET_SWITCH_GRACE_MS : null,
      targetSwitchGraceStartedAt: gracePending ? targetSwitchGraceStartedAtRef.current : null,
      gazePointUpdatedAt: gazePoint?.updatedAt ?? null,
      DEV_GAZE_DISABLE_POINT_HIT_TEST: disablePointHitTestFlag,
    }
    const nextDebugSignature = JSON.stringify({
      gazeCell: debugPayload.gazeCell,
      rawTargetKey: debugPayload.rawTargetKey,
      stableTargetKey: debugPayload.stableTargetKey,
      rawTargetSource: debugPayload.rawTargetSource,
      stableTargetSource: debugPayload.stableTargetSource,
      rawTargetCell: debugPayload.rawTargetCell,
      stableTargetCell: debugPayload.stableTargetCell,
      gracePending: debugPayload.gracePending,
      targetSwitchGraceMs: debugPayload.targetSwitchGraceMs,
      targetSwitchGraceStartedAt: debugPayload.targetSwitchGraceStartedAt,
    })

    if (lastGazeTargetDebugSignatureRef.current === nextDebugSignature) {
      return
    }

    lastGazeTargetDebugSignatureRef.current = nextDebugSignature
    console.info('[patient-input] gaze-target-state', debugPayload)
  }, [
    enabled,
    gazeCell,
    gazePoint?.updatedAt,
    rawGazeTarget?.cell,
    rawGazeTarget?.key,
    rawGazeTarget?.source,
    stableGazeTarget?.cell,
    stableGazeTarget?.key,
    stableGazeTarget?.source,
  ])

  useEffect(() => {
    const nextHighlightedElement = stableGazeTarget?.element ?? null
    const previousHighlightedElement = highlightedElementRef.current

    if (previousHighlightedElement && previousHighlightedElement !== nextHighlightedElement) {
      previousHighlightedElement.removeAttribute('data-gaze-active')
    }

    if (nextHighlightedElement) {
      nextHighlightedElement.setAttribute('data-gaze-active', 'true')
    }

    highlightedElementRef.current = nextHighlightedElement
    activeElementRef.current = nextHighlightedElement

    return () => {
      if (highlightedElementRef.current) {
        highlightedElementRef.current.removeAttribute('data-gaze-active')
        highlightedElementRef.current = null
      }
    }
  }, [stableGazeTarget])

  useEffect(() => {
    return () => {
      clearConfirmedSelection()

      for (const targetKey of selectionCooldownsRef.current.keys()) {
        clearSelectionCooldown(targetKey)
      }
    }
  }, [])

  // useEffect(() => {
  //   if (!enabled || !import.meta.env.DEV) {
  //     return
  //   }
  //
  //   console.info('[patient-input] gaze-target-observed', {
  //     gazePointPresent: gazePoint !== null,
  //     hasCellMapping: cellMapping !== null,
  //     hasFallbackPatientMainMapping: getFallbackPatientMainCellMapping() !== null,
  //     hasGenericCellDomFallback: getFallbackInteractiveElementFromCell(gazeCell) !== null,
  //     patientMainPointTargetFound: getPatientMainPointTarget(gazePoint) !== null,
  //     hasNearestPointFallback: getNearestInteractiveTargetFromPoint(gazePoint) !== null,
  //     rawTargetKey: rawGazeTarget?.key ?? null,
  //     rawTargetSource: rawGazeTarget?.source ?? null,
  //     rawTargetCell: rawGazeTarget?.cell ?? null,
  //     stableTargetKey: stableGazeTarget?.key ?? null,
  //     stableTargetSource: stableGazeTarget?.source ?? null,
  //     stableTargetCell: stableGazeTarget?.cell ?? null,
  //     mappedTrackingId:
  //       typeof gazeCell === 'number' && cellMapping ? (cellMapping[gazeCell] ?? null) : null,
  //     gazeCell,
  //     updatedAt: gazePoint?.updatedAt ?? null,
  //   })
  // }, [
  //   cellMapping,
  //   enabled,
  //   gazeCell,
  //   gazePoint?.updatedAt,
  //   rawGazeTarget?.cell,
  //   rawGazeTarget?.key,
  //   rawGazeTarget?.source,
  //   stableGazeTarget?.cell,
  //   stableGazeTarget?.key,
  //   stableGazeTarget?.source,
  // ])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const handleDoubleBlink = (event: Event) => {
      const doubleBlinkEvent = event as CustomEvent<PatientDoubleBlinkDetail>
      lastDoubleBlinkAtRef.current = Date.now()

      if (import.meta.env.DEV) {
        console.info('[patient-input] double blink confirmed', {
          source: doubleBlinkEvent.detail?.source ?? 'unknown',
        })
      }

      if (commitSelection('double-blink')) {
        doubleBlinkEvent.preventDefault()
        return
      }

      if (import.meta.env.DEV) {
        console.info('[patient-input] double blink fell through because confirmSelection did not commit')
      }
    }

    window.addEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink as EventListener)

    return () => {
      window.removeEventListener(PATIENT_DOUBLE_BLINK_EVENT, handleDoubleBlink as EventListener)
    }
  }, [enabled, rawGazeTarget, stableGazeTarget])

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

  useDwell<string>({
    hoveredTargetId: stableGazeTarget?.key ?? null,
    dwellDurationMs,
    activationDelayMs,
    disabled: !enabled || !stableGazeTarget,
    onCommit: () => {
      const now = Date.now()

      if (now - lastDoubleBlinkAtRef.current <= DOUBLE_BLINK_COMMIT_GUARD_MS) {
        console.info('[patient-input] skipped dwell commit because a double blink just fired', {
          targetKey: stableGazeTarget?.key ?? null,
        })

        return
      }

      if (usePatientModeStore.getState().isGlobalMenuOpen) {
        console.info('[patient-input] skipped dwell commit because the global menu is open', {
          targetKey: stableGazeTarget?.key ?? null,
        })

        return
      }

      console.info('[patient-input] dwell commit', {
        targetKey: stableGazeTarget?.key ?? null,
        dwellDurationMs,
        activationDelayMs,
      })

      commitSelection('dwell')
    },
  })
}

export default usePatientGazeClick
