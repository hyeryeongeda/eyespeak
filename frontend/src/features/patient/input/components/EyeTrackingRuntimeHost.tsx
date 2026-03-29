import { useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { emitPatientTrackingStatus } from '../services/patientModeBridge'
import { useGazeInputStore } from '../stores/gazeInputStore'
import { usePatientModeStore } from '../stores/patientModeStore'

interface EyeTrackingRuntimeHostProps {
  enabled?: boolean
  eyeTrackingProfileId: string | null
}

// ── MediaPipe landmark indices ──
const L_IRIS = [468, 469, 470, 471, 472]
const R_IRIS = [473, 474, 475, 476, 477]
const L_EYE_UPPER = [246, 161, 160, 159, 158, 157, 173]
const L_EYE_LOWER = [33, 7, 163, 144, 145, 153, 154, 155, 133]
const R_EYE_UPPER = [466, 388, 387, 386, 385, 384, 398]
const R_EYE_LOWER = [263, 249, 390, 373, 374, 380, 381, 382, 362]
const L_OUTER = 33
const L_INNER = 133
const R_INNER = 362
const R_OUTER = 263
const FOREHEAD = 10
const CHIN = 152
const NOSE_TIP = 1
const L_CHEEK = 234
const R_CHEEK = 454

// ── 파라미터 ──
const SENSITIVITY_X = 8.0
const SENSITIVITY_Y = 12.0
const EDGE_MARGIN = 3
const AUTO_BASELINE_FRAMES = 60

// 블링크
const BLINK_EAR_THRESHOLD = 0.20
const BLINK_MIN_MS = 50
const BLINK_MAX_MS = 600
const BLINK_COOLDOWN_MS = 350

// 더블/트리플 블링크
const MULTI_BLINK_WINDOW_MS = 1000  // 이 시간 안에 연속 블링크 카운트

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// 클릭 히트 영역
const CLICK_SELECTOR = 'button, a[href], [role="button"], input[type="button"], input[type="submit"], [tabindex]:not([tabindex="-1"]), [data-tracking-id]'
const PAD_X = 60
const PAD_Y = 100

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function avgPoint(lm: { x: number; y: number }[], indices: number[]) {
  let sx = 0, sy = 0
  for (const i of indices) { sx += lm[i].x; sy += lm[i].y }
  const n = indices.length
  return { x: sx / n, y: sy / n }
}

function detailedEAR(
  lm: { x: number; y: number }[],
  upperIdx: number[], lowerIdx: number[],
  innerIdx: number, outerIdx: number,
) {
  const upper = avgPoint(lm, upperIdx)
  const lower = avgPoint(lm, lowerIdx)
  const inner = lm[innerIdx]
  const outer = lm[outerIdx]
  const vertical = Math.abs(lower.y - upper.y)
  const horizontal = Math.hypot(inner.x - outer.x, inner.y - outer.y)
  return horizontal > 0.001 ? vertical / horizontal : 1.0
}

function estimateHeadPose(lm: { x: number; y: number }[]) {
  const nose = lm[NOSE_TIP]
  const forehead = lm[FOREHEAD]
  const chin = lm[CHIN]
  const lCheek = lm[L_CHEEK]
  const rCheek = lm[R_CHEEK]
  const faceW = Math.hypot(rCheek.x - lCheek.x, rCheek.y - lCheek.y)
  const faceH = Math.hypot(chin.x - forehead.x, chin.y - forehead.y)
  const faceCenterX = (lCheek.x + rCheek.x) / 2
  const faceCenterY = (forehead.y + chin.y) / 2
  const yaw = faceW > 0.001 ? (nose.x - faceCenterX) / faceW : 0
  const pitch = faceH > 0.001 ? (nose.y - faceCenterY) / faceH : 0
  return { yaw, pitch }
}

function clickElementAtPoint(clientX: number, clientY: number) {
  const direct = document.elementFromPoint(clientX, clientY)
  if (direct instanceof HTMLElement) {
    const clickable = direct.closest<HTMLElement>(CLICK_SELECTOR)
    if (clickable) { fireClick(clickable, clientX, clientY); return }
  }
  const allClickable = document.querySelectorAll<HTMLElement>(CLICK_SELECTOR)
  let best: HTMLElement | null = null
  let bestScore = -1
  for (const el of allClickable) {
    if (el.offsetParent === null) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    const eL = rect.left - PAD_X, eR = rect.right + PAD_X
    const eT = rect.top - PAD_Y, eB = rect.bottom + PAD_Y
    if (clientX >= eL && clientX <= eR && clientY >= eT && clientY <= eB) {
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = Math.abs(clientX - cx) / (rect.width / 2 + PAD_X)
      const dy = Math.abs(clientY - cy) / (rect.height / 2 + PAD_Y)
      const score = 1 - Math.hypot(dx, dy)
      if (score > bestScore) { bestScore = score; best = el }
    }
  }
  if (best) {
    const rect = best.getBoundingClientRect()
    fireClick(best, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
}

function fireClick(target: HTMLElement, clientX: number, clientY: number) {
  console.info('[Eye] BLINK →', target.tagName, target.dataset.trackingId ?? target.textContent?.slice(0, 20))
  target.dispatchEvent(new MouseEvent('pointerdown', { clientX, clientY, bubbles: true, cancelable: true }))
  target.dispatchEvent(new MouseEvent('pointerup', { clientX, clientY, bubbles: true, cancelable: true }))
  target.dispatchEvent(new MouseEvent('click', { clientX, clientY, bubbles: true, cancelable: true }))
}

// ── HUD 오버레이 (블링크 표시 + 인식 메뉴) ──
function createHUD() {
  const hud = document.createElement('div')
  hud.id = 'eye-tracking-hud'
  hud.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999998;'

  // 오른쪽 하단: 블링크 알림
  const blinkBadge = document.createElement('div')
  blinkBadge.id = 'eye-blink-badge'
  blinkBadge.style.cssText = 'position:absolute;bottom:12px;right:12px;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;color:white;opacity:0;transition:opacity 0.15s;pointer-events:none;'
  hud.appendChild(blinkBadge)

  // 왼쪽 하단: 현재 인식 메뉴
  const targetBadge = document.createElement('div')
  targetBadge.id = 'eye-target-badge'
  targetBadge.style.cssText = 'position:absolute;bottom:12px;left:12px;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:600;color:rgba(255,255,255,0.8);background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);opacity:0;transition:opacity 0.2s;pointer-events:none;'
  hud.appendChild(targetBadge)

  document.body.appendChild(hud)
  return { blinkBadge, targetBadge }
}

let hudBlink: HTMLElement | null = null
let hudTarget: HTMLElement | null = null
let blinkTimer: ReturnType<typeof setTimeout> | null = null

function showBlinkFeedback(type: 'double' | 'triple') {
  if (!hudBlink) return
  hudBlink.textContent = type === 'double' ? '  CLICK' : '  MENU'
  hudBlink.style.background = type === 'double' ? 'rgba(59,130,246,0.85)' : 'rgba(168,85,247,0.85)'
  hudBlink.style.opacity = '1'
  if (blinkTimer) clearTimeout(blinkTimer)
  blinkTimer = setTimeout(() => { if (hudBlink) hudBlink.style.opacity = '0' }, 800)
}

function updateTargetHUD(clientX: number, clientY: number) {
  if (!hudTarget) return
  const el = document.elementFromPoint(clientX, clientY)
  if (el instanceof HTMLElement) {
    const clickable = el.closest<HTMLElement>(CLICK_SELECTOR)
    if (clickable) {
      const name = clickable.dataset.trackingId ?? clickable.textContent?.trim().slice(0, 15) ?? ''
      if (name) {
        hudTarget.textContent = name
        hudTarget.style.opacity = '1'
        return
      }
    }
  }
  hudTarget.style.opacity = '0'
}

// ── 1유로 필터 ──
class OneEuroFilter {
  private freq: number
  private minCutoff: number
  private beta: number
  private dCutoff: number
  private xPrev: number | null = null
  private dxPrev = 0
  private tPrev = 0
  constructor(freq = 30, minCutoff = 1.5, beta = 0.5, dCutoff = 1.0) {
    this.freq = freq; this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff
  }
  private alpha(cutoff: number) {
    const tau = 1.0 / (2 * Math.PI * cutoff)
    const te = 1.0 / this.freq
    return 1.0 / (1.0 + tau / te)
  }
  filter(x: number, timestamp?: number): number {
    if (this.xPrev === null) { this.xPrev = x; this.tPrev = timestamp ?? performance.now(); return x }
    const now = timestamp ?? performance.now()
    const dt = (now - this.tPrev) / 1000
    this.tPrev = now
    if (dt > 0) this.freq = 1.0 / dt
    const dx = (x - this.xPrev) * this.freq
    const adx = this.alpha(this.dCutoff)
    const dxHat = adx * dx + (1 - adx) * this.dxPrev
    this.dxPrev = dxHat
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat)
    const ax = this.alpha(cutoff)
    const xHat = ax * x + (1 - ax) * this.xPrev
    this.xPrev = xHat
    return xHat
  }
  reset() { this.xPrev = null; this.dxPrev = 0 }
}

// ── 메인 ──
export default function EyeTrackingRuntimeHost({
  enabled = true,
  eyeTrackingProfileId,
}: EyeTrackingRuntimeHostProps) {
  const filterXRef = useRef(new OneEuroFilter(30, 1.2, 0.7))
  const filterYRef = useRef(new OneEuroFilter(30, 1.0, 0.9))

  useEffect(() => {
    if (!enabled || !eyeTrackingProfileId) {
      useGazeInputStore.getState().clearPoint()
      emitPatientTrackingStatus('idle')
      return
    }

    let active = true
    let faceLandmarker: FaceLandmarker | null = null
    let videoEl: HTMLVideoElement | null = null
    let animFrameId = 0
    let frameCount = 0
    let eyesClosed = false
    let eyeClosedAt = 0

    // 멀티블링크 상태
    let blinkCount = 0
    let firstBlinkAt = 0
    let multiBlinkTimer: ReturnType<typeof setTimeout> | null = null

    // HUD
    const { blinkBadge, targetBadge } = createHUD()
    hudBlink = blinkBadge
    hudTarget = targetBadge

    function handleMultiBlink(now: number) {
      if (now - firstBlinkAt > MULTI_BLINK_WINDOW_MS) {
        blinkCount = 0
      }
      if (blinkCount === 0) firstBlinkAt = now
      blinkCount++

      if (multiBlinkTimer) clearTimeout(multiBlinkTimer)

      multiBlinkTimer = setTimeout(() => {
        const gaze = useGazeInputStore.getState().point
        if (blinkCount === 2) {
          // 더블블링크 → 클릭
          showBlinkFeedback('double')
          if (gaze) clickElementAtPoint(gaze.clientX, gaze.clientY)
        } else if (blinkCount >= 3) {
          // 트리플블링크 → 글로벌 메뉴 토글
          showBlinkFeedback('triple')
          usePatientModeStore.getState().toggleGlobalMenu({ bypassTracking: true })
        }
        blinkCount = 0
      }, BLINK_COOLDOWN_MS)
    }

    async function init() {
      try {
        console.info('[Eye] Loading FaceLandmarker...')
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
        if (!active) return
        faceLandmarker = await FaceLandmarker.createFromModelPath(vision, MODEL_URL)
        if (!active) { faceLandmarker.close(); return }
        await faceLandmarker.setOptions({
          runningMode: 'VIDEO', numFaces: 1,
          outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        })
        console.info('[Eye] Model ready. Starting webcam...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        videoEl = document.createElement('video')
        videoEl.srcObject = stream
        videoEl.autoplay = true
        videoEl.playsInline = true
        videoEl.muted = true
        await videoEl.play()
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }

        filterXRef.current.reset()
        filterYRef.current.reset()

        const baselineRx: number[] = []
        const baselineRy: number[] = []
        const baselinePitch: number[] = []
        let baselineXCenter = 0.5
        let baselineYCenter = 0.33
        let baselinePitchCenter = 0
        let baselineReady = false

        emitPatientTrackingStatus('ready')
        console.info('[Eye] Tracking started — double-blink=click, triple-blink=menu')

        let lastTs = -1

        function detect() {
          if (!active) return
          if (!faceLandmarker || !videoEl || videoEl.readyState < 2) {
            animFrameId = requestAnimationFrame(detect); return
          }
          const now = performance.now()
          if (now <= lastTs) { animFrameId = requestAnimationFrame(detect); return }
          lastTs = now

          try {
            const result = faceLandmarker!.detectForVideo(videoEl!, now)
            if (result.faceLandmarks?.[0] && result.faceLandmarks[0].length > 477) {
              const lm = result.faceLandmarks[0]

              const leftEAR = detailedEAR(lm, L_EYE_UPPER, L_EYE_LOWER, L_INNER, L_OUTER)
              const rightEAR = detailedEAR(lm, R_EYE_UPPER, R_EYE_LOWER, R_INNER, R_OUTER)
              const avgEAR = (leftEAR + rightEAR) / 2

              if (avgEAR < BLINK_EAR_THRESHOLD) {
                if (!eyesClosed) { eyesClosed = true; eyeClosedAt = now }
              } else if (eyesClosed) {
                const dur = now - eyeClosedAt
                eyesClosed = false
                if (dur >= BLINK_MIN_MS && dur <= BLINK_MAX_MS) {
                  handleMultiBlink(now)
                }
                animFrameId = requestAnimationFrame(detect); return
              }
              if (eyesClosed) { animFrameId = requestAnimationFrame(detect); return }

              const leftIris = avgPoint(lm, L_IRIS)
              const rightIris = avgPoint(lm, R_IRIS)
              const lInner = lm[L_INNER], lOuter = lm[L_OUTER]
              const rInner = lm[R_INNER], rOuter = lm[R_OUTER]

              const lDx = lInner.x - lOuter.x
              const lRx = Math.abs(lDx) > 0.001 ? (leftIris.x - lOuter.x) / lDx : 0.5
              const rDx = rOuter.x - rInner.x
              const rRx = Math.abs(rDx) > 0.001 ? (rightIris.x - rInner.x) / rDx : 0.5
              const irisRx = (lRx + rRx) / 2

              const forehead = lm[FOREHEAD], chin = lm[CHIN]
              const faceH = chin.y - forehead.y
              const avgIrisY = (leftIris.y + rightIris.y) / 2
              const irisRy = faceH > 0.001 ? (avgIrisY - forehead.y) / faceH : 0.5

              const head = estimateHeadPose(lm)

              if (!baselineReady) {
                baselineRx.push(irisRx)
                baselineRy.push(irisRy)
                baselinePitch.push(head.pitch)
                if (baselineRx.length >= AUTO_BASELINE_FRAMES) {
                  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b)
                  const med = (arr: number[]) => {
                    const s = sorted(arr); const m = Math.floor(s.length / 2)
                    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
                  }
                  baselineXCenter = med(baselineRx)
                  baselineYCenter = med(baselineRy)
                  baselinePitchCenter = med(baselinePitch)
                  baselineReady = true
                  console.info(`[Eye] Baseline: xC=${baselineXCenter.toFixed(4)} yC=${baselineYCenter.toFixed(4)} pitchC=${baselinePitchCenter.toFixed(4)}`)
                }
                useGazeInputStore.getState().setSnapshot({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, cell: null })
                animFrameId = requestAnimationFrame(detect); return
              }

              const earConf = clamp((avgEAR - 0.12) / 0.2, 0, 1)
              const irisYW = 0.3 + earConf * 0.4
              const pitchW = 0.7 - earConf * 0.4

              const gazeX = (baselineXCenter - irisRx) + head.yaw * 0.6
              const gazeY = (irisRy - baselineYCenter) * irisYW + (head.pitch - baselinePitchCenter) * pitchW

              const rawX = (0.5 + gazeX * SENSITIVITY_X) * window.innerWidth
              const rawY = (0.5 + gazeY * SENSITIVITY_Y) * window.innerHeight

              const sx = filterXRef.current.filter(rawX, now)
              const sy = filterYRef.current.filter(rawY, now)
              const clientX = clamp(sx, EDGE_MARGIN, window.innerWidth - EDGE_MARGIN)
              const clientY = clamp(sy, EDGE_MARGIN, window.innerHeight - EDGE_MARGIN)

              useGazeInputStore.getState().setSnapshot({ clientX, clientY, cell: null })

              // HUD: 인식 중인 메뉴 표시
              if (frameCount % 5 === 0) updateTargetHUD(clientX, clientY)

              frameCount++
              if (frameCount <= 3 || frameCount % 300 === 0) {
                console.info(`[Eye] #${frameCount} iris=(${irisRx.toFixed(3)},${irisRy.toFixed(3)}) head=(${head.yaw.toFixed(3)},${head.pitch.toFixed(3)}) → (${clientX.toFixed(0)},${clientY.toFixed(0)})`)
              }
            }
          } catch { /* skip */ }
          animFrameId = requestAnimationFrame(detect)
        }
        detect()
      } catch (error) {
        console.error('[Eye] Failed:', error)
        if (active) emitPatientTrackingStatus('face-not-detected')
      }
    }

    init()

    return () => {
      active = false
      if (multiBlinkTimer) clearTimeout(multiBlinkTimer)
      cancelAnimationFrame(animFrameId)
      if (videoEl?.srcObject) {
        ;(videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        videoEl.srcObject = null
      }
      videoEl = null
      faceLandmarker?.close()
      faceLandmarker = null
      filterXRef.current.reset()
      filterYRef.current.reset()
      document.getElementById('eye-tracking-hud')?.remove()
      hudBlink = null
      hudTarget = null
      useGazeInputStore.getState().clearPoint()
      emitPatientTrackingStatus('idle')
    }
  }, [enabled, eyeTrackingProfileId])

  return null
}
