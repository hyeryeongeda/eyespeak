import { useEffect, useRef } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { emitPatientTrackingStatus } from '../services/patientModeBridge'
import { useGazeInputStore } from '../stores/gazeInputStore'

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
const BLINK_EAR_THRESHOLD = 0.18
const BLINK_MIN_MS = 60
const BLINK_MAX_MS = 400
const BLINK_COOLDOWN_MS = 500

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

// ── 1€ 필터 ──
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
    let lastClickAt = 0

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

        // 자동 베이스라인
        const baselineRx: number[] = []
        const baselineRy: number[] = []
        const baselinePitch: number[] = []
        let baselineXCenter = 0.5
        let baselineYCenter = 0.33
        let baselinePitchCenter = 0
        let baselineReady = false

        emitPatientTrackingStatus('ready')
        console.info('[Eye] Tracking started — auto-baseline, EAR-weighted, head pose fusion')

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
                const gaze = useGazeInputStore.getState().point
                if (dur >= BLINK_MIN_MS && dur <= BLINK_MAX_MS && now - lastClickAt > BLINK_COOLDOWN_MS && gaze) {
                  lastClickAt = now
                  clickElementAtPoint(gaze.clientX, gaze.clientY)
                }
                animFrameId = requestAnimationFrame(detect); return
              }
              if (eyesClosed) { animFrameId = requestAnimationFrame(detect); return }

              // 홍채 5점 평균
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

              // 자동 베이스라인 수집 (처음 ~2초)
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

              // EAR 기반 가중치
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

              frameCount++
              if (frameCount <= 3 || frameCount % 300 === 0) {
                console.info(`[Eye] #${frameCount} iris=(${irisRx.toFixed(3)},${irisRy.toFixed(3)}) head=(${head.yaw.toFixed(3)},${head.pitch.toFixed(3)}) earConf=${earConf.toFixed(2)} → (${clientX.toFixed(0)},${clientY.toFixed(0)})`)
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
      useGazeInputStore.getState().clearPoint()
      emitPatientTrackingStatus('idle')
    }
  }, [enabled, eyeTrackingProfileId])

  return null
}
