import type { CalibrationTrackingStatus } from '../../../../../types/calibration'
import type { EyeTrackingFrame } from '../../../../../types/eyeTracking'
import {
  getBrowserFaceLandmarker,
  type BrowserFaceLandmarkerResult,
} from './browserEyeTrackingModel'
import {
  loadBrowserEyeTrackingCalibration,
  saveBrowserEyeTrackingCalibration,
  type BrowserEyeTrackingCalibrationRecord,
} from './browserEyeTrackingStorage'

const FRAME_MIN_WIDTH = 480
const GRID_YAW_RANGE = 25
const GRID_PITCH_RANGE = 20
const HEAD_POSE_WEIGHT = 0.35
const IRIS_GAZE_WEIGHT = 0.65
const DRIFT_THRESHOLD = 0.05
const ONLINE_FIT_AFTER_SAMPLES = 10
const BLINK_SELECT_MIN_SEC = 0.3
const BLINK_SELECT_MAX_SEC = 1.0
const DOUBLE_BLINK_WINDOW_SEC = 2.0
const LONG_CLOSE_SEC = 3.0
const TRIPLE_BLINK_WINDOW_SEC = 3.0
const CALIB_TARGET_RX = [0.03, 0.2, 0.4, 0.6, 0.8, 0.97, 0.03, 0.2, 0.4, 0.6, 0.8, 0.97]
const CALIB_TARGET_RY = [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.97, 0.97, 0.97, 0.97, 0.97, 0.97]
const CELL_CENTER_RX = [1 / 6, 0.5, 5 / 6, 1 / 6, 0.5, 5 / 6]
const CELL_CENTER_RY = [0.25, 0.25, 0.25, 0.75, 0.75, 0.75]

const RIGHT_EYE_OUTER = 33
const RIGHT_EYE_INNER = 133
const LEFT_EYE_INNER = 362
const LEFT_EYE_OUTER = 263
const RIGHT_EYE_UPPER = [159, 160, 158, 161]
const RIGHT_EYE_LOWER = [145, 144, 153, 154]
const LEFT_EYE_UPPER = [386, 387, 385, 388]
const LEFT_EYE_LOWER = [374, 373, 380, 381]
const RIGHT_IRIS = [469, 470, 471, 472]
const LEFT_IRIS = [474, 475, 476, 477]
const RIGHT_EAR = [33, 160, 158, 133, 153, 144]
const LEFT_EAR = [263, 387, 385, 362, 380, 373]

type PixelLandmark = [number, number]

interface WorkingFrame {
  width: number
  height: number
  canvas: HTMLCanvasElement
}

interface CalibrationPointSample {
  rx: number
  ry: number
}

export interface BrowserEyeTrackingFrame extends EyeTrackingFrame {
  status: CalibrationTrackingStatus
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function distance(a: PixelLandmark, b: PixelLandmark) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function computeEar(landmarks: PixelLandmark[], indices: number[]) {
  const points = indices.map(index => landmarks[index])
  const verticalOne = distance(points[1], points[5])
  const verticalTwo = distance(points[2], points[4])
  const horizontal = distance(points[0], points[3])

  if (horizontal < 1) {
    return 0
  }

  return (verticalOne + verticalTwo) / (2 * horizontal)
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const sortedValues = [...values].sort((left, right) => left - right)
  const middleIndex = Math.floor(sortedValues.length / 2)

  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex]
}

function computeIrisPosition(
  landmarks: PixelLandmark[],
  blinkThreshold: number,
): { rx: number | null; ry: number | null; ear: number; blink: boolean } {
  if (landmarks.length < 478) {
    return { rx: null, ry: null, ear: 0, blink: true }
  }

  const rightEar = computeEar(landmarks, RIGHT_EAR)
  const leftEar = computeEar(landmarks, LEFT_EAR)
  const averageEar = (rightEar + leftEar) / 2

  if (averageEar < blinkThreshold) {
    return { rx: null, ry: null, ear: averageEar, blink: true }
  }

  const ratioXs: number[] = []
  const ratioYs: number[] = []
  const confidenceValues: number[] = []

  ;[
    [RIGHT_EYE_OUTER, RIGHT_EYE_INNER, RIGHT_IRIS, RIGHT_EYE_UPPER, RIGHT_EYE_LOWER, rightEar],
    [LEFT_EYE_INNER, LEFT_EYE_OUTER, LEFT_IRIS, LEFT_EYE_UPPER, LEFT_EYE_LOWER, leftEar],
  ].forEach(([outer, inner, irisIndices, upperIndices, lowerIndices, eyeEar]) => {
    const outerPoint = landmarks[outer as number]
    const innerPoint = landmarks[inner as number]

    if (!outerPoint || !innerPoint) {
      return
    }

    let leftX = outerPoint[0]
    let rightX = innerPoint[0]

    if (leftX > rightX) {
      leftX = innerPoint[0]
      rightX = outerPoint[0]
    }

    const eyeWidth = rightX - leftX

    if (eyeWidth < 3) {
      return
    }

    const upperYs = (upperIndices as number[]).map(index => landmarks[index][1])
    const lowerYs = (lowerIndices as number[]).map(index => landmarks[index][1])
    const topYMedian = median(upperYs)
    const bottomYMedian = median(lowerYs)
    const eyeHeight = Math.abs(bottomYMedian - topYMedian)

    const irisCenterX =
      (irisIndices as number[]).reduce((sum, index) => sum + landmarks[index][0], 0) / 4
    const irisCenterY =
      (irisIndices as number[]).reduce((sum, index) => sum + landmarks[index][1], 0) / 4

    ratioXs.push(clamp01((irisCenterX - leftX) / eyeWidth))
    ratioYs.push(clamp01(eyeHeight > 1 ? (irisCenterY - topYMedian) / eyeHeight : 0.5))
    confidenceValues.push(eyeWidth * (eyeEar as number))
  })

  if (ratioXs.length === 0) {
    return { rx: null, ry: null, ear: averageEar, blink: true }
  }

  const confidenceSum = confidenceValues.reduce((sum, value) => sum + value, 0)

  if (confidenceSum > 0) {
    return {
      rx:
        confidenceValues.reduce((sum, confidence, index) => sum + confidence * ratioXs[index], 0) /
        confidenceSum,
      ry:
        confidenceValues.reduce((sum, confidence, index) => sum + confidence * ratioYs[index], 0) /
        confidenceSum,
      ear: averageEar,
      blink: false,
    }
  }

  return {
    rx: ratioXs.reduce((sum, value) => sum + value, 0) / ratioXs.length,
    ry: ratioYs.reduce((sum, value) => sum + value, 0) / ratioYs.length,
    ear: averageEar,
    blink: false,
  }
}

function extractPixelLandmarks(result: BrowserFaceLandmarkerResult, width: number, height: number) {
  const firstFace = result.faceLandmarks[0]

  if (!firstFace) {
    return null
  }

  return firstFace.map(landmark => [landmark.x * width, landmark.y * height] as PixelLandmark)
}

function getFaceBounds(landmarks: PixelLandmark[]) {
  const xs = landmarks.map(point => point[0])
  const ys = landmarks.map(point => point[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY
  const padX = Math.max(2, width * 0.15)
  const padY = Math.max(2, height * 0.15)

  return {
    x: minX - padX,
    y: minY - padY,
    width: width + padX * 2,
    height: height + padY * 2,
  }
}

function computeHeadPoseFromMatrix(result: BrowserFaceLandmarkerResult) {
  const matrix = result.facialTransformationMatrixes[0]

  if (!matrix || !Array.isArray(matrix.data) || matrix.data.length < 16) {
    return { yaw: null, pitch: null }
  }

  const data = matrix.data
  const r20 = data[8]
  const r21 = data[9]
  const r22 = data[10]
  const pitchRad = Math.asin(Math.max(-1, Math.min(1, -r20)))
  const cosPitch = Math.cos(pitchRad)
  const yawRad = Math.abs(cosPitch) > 1e-6 ? Math.atan2(r21 / cosPitch, r22 / cosPitch) : 0

  return {
    yaw: (yawRad * 180) / Math.PI,
    pitch: (pitchRad * 180) / Math.PI,
  }
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length
  const augmentedMatrix = matrix.map((row, rowIndex) => [...row, vector[rowIndex]])

  for (let pivot = 0; pivot < size; pivot += 1) {
    let bestRow = pivot

    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmentedMatrix[row][pivot]) > Math.abs(augmentedMatrix[bestRow][pivot])) {
        bestRow = row
      }
    }

    if (Math.abs(augmentedMatrix[bestRow][pivot]) < 1e-9) {
      return null
    }

    if (bestRow !== pivot) {
      const temp = augmentedMatrix[pivot]
      augmentedMatrix[pivot] = augmentedMatrix[bestRow]
      augmentedMatrix[bestRow] = temp
    }

    const pivotValue = augmentedMatrix[pivot][pivot]

    for (let column = pivot; column <= size; column += 1) {
      augmentedMatrix[pivot][column] /= pivotValue
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue
      }

      const factor = augmentedMatrix[row][pivot]

      for (let column = pivot; column <= size; column += 1) {
        augmentedMatrix[row][column] -= factor * augmentedMatrix[pivot][column]
      }
    }
  }

  return augmentedMatrix.map(row => row[size])
}

function fitLeastSquares(features: number[][], targets: number[]) {
  const columnCount = features[0]?.length ?? 0
  const normalMatrix = Array.from({ length: columnCount }, () => Array(columnCount).fill(0))
  const normalVector = Array(columnCount).fill(0)

  features.forEach((row, rowIndex) => {
    for (let leftColumn = 0; leftColumn < columnCount; leftColumn += 1) {
      normalVector[leftColumn] += row[leftColumn] * targets[rowIndex]

      for (let rightColumn = 0; rightColumn < columnCount; rightColumn += 1) {
        normalMatrix[leftColumn][rightColumn] += row[leftColumn] * row[rightColumn]
      }
    }
  })

  return solveLinearSystem(normalMatrix, normalVector)
}

function fitRidgeRegression(samples: Array<[number, number]>, targets: number[], alpha = 1) {
  if (samples.length < 3 || samples.length !== targets.length) {
    return null
  }

  const columnCount = 3
  const normalMatrix = Array.from({ length: columnCount }, () => Array(columnCount).fill(0))
  const normalVector = Array(columnCount).fill(0)

  samples.forEach(([x, y], index) => {
    const row = [1, x, y]

    for (let leftColumn = 0; leftColumn < columnCount; leftColumn += 1) {
      normalVector[leftColumn] += row[leftColumn] * targets[index]

      for (let rightColumn = 0; rightColumn < columnCount; rightColumn += 1) {
        normalMatrix[leftColumn][rightColumn] += row[leftColumn] * row[rightColumn]
      }
    }
  })

  for (let column = 1; column < columnCount; column += 1) {
    normalMatrix[column][column] += alpha
  }

  return solveLinearSystem(normalMatrix, normalVector)
}

function computeOneEuroAlpha(cutoff: number, timeElapsedSeconds: number) {
  if (timeElapsedSeconds <= 0) {
    return 1
  }

  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / timeElapsedSeconds)
}

class OneEuroAxis {
  private readonly minCutoff: number

  private readonly beta: number

  private previousValue: number | null = null

  private previousDerivative = 0

  constructor(minCutoff: number, beta: number) {
    this.minCutoff = minCutoff
    this.beta = beta
  }

  update(value: number, timeElapsedSeconds: number) {
    const safeTimeElapsed = timeElapsedSeconds > 0 ? timeElapsedSeconds : 0.033

    if (this.previousValue === null) {
      this.previousValue = value
      return value
    }

    const rawDerivative = (value - this.previousValue) / safeTimeElapsed
    const derivativeAlpha = computeOneEuroAlpha(this.minCutoff, safeTimeElapsed)
    const filteredDerivative =
      derivativeAlpha * rawDerivative + (1 - derivativeAlpha) * this.previousDerivative
    const cutoff = this.minCutoff + this.beta * Math.abs(filteredDerivative)
    const valueAlpha = computeOneEuroAlpha(cutoff, safeTimeElapsed)
    const filteredValue = valueAlpha * value + (1 - valueAlpha) * this.previousValue

    this.previousValue = filteredValue
    this.previousDerivative = filteredDerivative

    return filteredValue
  }

  reset() {
    this.previousValue = null
    this.previousDerivative = 0
  }
}

class TriggerDetector {
  private threshold: number

  private eyesClosed = false

  private closeStartedAtSeconds = 0

  private blinkHistory: Array<[number, number]> = []

  private stopFired = false

  constructor(blinkThreshold: number) {
    this.threshold = blinkThreshold
  }

  update(ear: number, timestampSeconds: number) {
    this.blinkHistory = this.blinkHistory.filter(entry => timestampSeconds - entry[0] <= 5)
    const isClosed = ear < this.threshold

    if (isClosed && !this.eyesClosed) {
      this.eyesClosed = true
      this.closeStartedAtSeconds = timestampSeconds
      this.stopFired = false
      return 'none'
    }

    if (isClosed && this.eyesClosed) {
      const durationSeconds = timestampSeconds - this.closeStartedAtSeconds

      if (durationSeconds >= LONG_CLOSE_SEC && !this.stopFired) {
        this.stopFired = true
        return 'stop'
      }

      return 'none'
    }

    if (!isClosed && this.eyesClosed) {
      this.eyesClosed = false
      const durationSeconds = timestampSeconds - this.closeStartedAtSeconds

      if (this.stopFired) {
        this.stopFired = false
        this.blinkHistory = []
        return 'none'
      }

      if (
        durationSeconds >= BLINK_SELECT_MIN_SEC &&
        durationSeconds <= BLINK_SELECT_MAX_SEC
      ) {
        this.blinkHistory.push([timestampSeconds, durationSeconds])
        const recentThreeSeconds = this.blinkHistory.filter(
          entry => timestampSeconds - entry[0] <= TRIPLE_BLINK_WINDOW_SEC,
        )
        const recentTwoSeconds = this.blinkHistory.filter(
          entry => timestampSeconds - entry[0] <= DOUBLE_BLINK_WINDOW_SEC,
        )

        if (recentThreeSeconds.length >= 3) {
          this.blinkHistory = []
          return 'sos'
        }

        if (recentTwoSeconds.length >= 2) {
          this.blinkHistory = []
          return 'start'
        }

        return 'select'
      }
    }

    return 'none'
  }

  reset() {
    this.eyesClosed = false
    this.closeStartedAtSeconds = 0
    this.blinkHistory = []
    this.stopFired = false
  }

  setThreshold(threshold: number) {
    this.threshold = threshold
  }
}

class CalibrationRefiner {
  private raw: Array<[number, number]> = []

  private target: Array<[number, number]> = []

  private modelX: number[] | null = null

  private modelY: number[] | null = null

  addSample(rawX: number, rawY: number, targetX: number, targetY: number) {
    this.raw.push([rawX, rawY])
    this.target.push([targetX, targetY])
    this.modelX = null
    this.modelY = null
  }

  fit() {
    const modelX = fitRidgeRegression(
      this.raw,
      this.target.map(entry => entry[0]),
    )
    const modelY = fitRidgeRegression(
      this.raw,
      this.target.map(entry => entry[1]),
    )

    if (!modelX || !modelY) {
      return false
    }

    this.modelX = modelX
    this.modelY = modelY
    return true
  }

  correct(rawX: number, rawY: number) {
    if (!this.modelX || !this.modelY) {
      return [rawX, rawY] as const
    }

    const features = [1, rawX, rawY]

    return [
      features.reduce((sum, value, index) => sum + value * this.modelX![index], 0),
      features.reduce((sum, value, index) => sum + value * this.modelY![index], 0),
    ] as const
  }

  clear() {
    this.raw = []
    this.target = []
    this.modelX = null
    this.modelY = null
  }

  get sampleCount() {
    return this.raw.length
  }

  get isFitted() {
    return this.modelX !== null && this.modelY !== null
  }

  exportState() {
    return {
      raw: this.raw.map(entry => [entry[0], entry[1]] as [number, number]),
      target: this.target.map(entry => [entry[0], entry[1]] as [number, number]),
    }
  }
}

function rgbToXyz(red: number, green: number, blue: number) {
  const transformChannel = (value: number) => {
    const normalizedValue = value / 255
    return normalizedValue > 0.04045
      ? ((normalizedValue + 0.055) / 1.055) ** 2.4
      : normalizedValue / 12.92
  }

  const r = transformChannel(red)
  const g = transformChannel(green)
  const b = transformChannel(blue)

  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    z: r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  }
}

function xyzToLab(x: number, y: number, z: number) {
  const refX = 0.95047
  const refY = 1
  const refZ = 1.08883
  const delta = 6 / 29
  const transform = (value: number) =>
    value > delta ** 3 ? Math.cbrt(value) : value / (3 * delta * delta) + 4 / 29

  const fx = transform(x / refX)
  const fy = transform(y / refY)
  const fz = transform(z / refZ)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

function labToXyz(l: number, a: number, b: number) {
  const refX = 0.95047
  const refY = 1
  const refZ = 1.08883
  const delta = 6 / 29
  const fy = (l + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const transform = (value: number) =>
    value > delta ? value ** 3 : 3 * delta * delta * (value - 4 / 29)

  return {
    x: refX * transform(fx),
    y: refY * transform(fy),
    z: refZ * transform(fz),
  }
}

function xyzToRgb(x: number, y: number, z: number) {
  const encode = (value: number) => {
    const linearValue =
      value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
    return Math.round(clamp01(linearValue) * 255)
  }

  const red = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  const green = x * -0.969266 + y * 1.8760108 + z * 0.041556
  const blue = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

  return {
    red: encode(red),
    green: encode(green),
    blue: encode(blue),
  }
}

function applyClaheToImageData(imageData: ImageData, clipLimit = 2, tilesX = 8, tilesY = 8) {
  const { width, height, data } = imageData
  const pixelCount = width * height
  const lValues = new Uint8ClampedArray(pixelCount)
  const aValues = new Float32Array(pixelCount)
  const bValues = new Float32Array(pixelCount)

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4
    const xyz = rgbToXyz(data[offset], data[offset + 1], data[offset + 2])
    const lab = xyzToLab(xyz.x, xyz.y, xyz.z)
    lValues[index] = Math.max(0, Math.min(255, Math.round((lab.l / 100) * 255)))
    aValues[index] = lab.a
    bValues[index] = lab.b
  }

  const tileWidth = Math.ceil(width / tilesX)
  const tileHeight = Math.ceil(height / tilesY)
  const lookupTables: number[][][] = Array.from({ length: tilesY }, () =>
    Array.from({ length: tilesX }, () => Array(256).fill(0)),
  )

  for (let tileY = 0; tileY < tilesY; tileY += 1) {
    for (let tileX = 0; tileX < tilesX; tileX += 1) {
      const startX = tileX * tileWidth
      const startY = tileY * tileHeight
      const endX = Math.min(width, startX + tileWidth)
      const endY = Math.min(height, startY + tileHeight)
      const histogram = Array(256).fill(0)
      const tileArea = Math.max(1, (endX - startX) * (endY - startY))

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          histogram[lValues[y * width + x]] += 1
        }
      }

      const clipValue = Math.max(1, Math.floor((clipLimit * tileArea) / 256))
      let clippedPixels = 0

      for (let index = 0; index < 256; index += 1) {
        if (histogram[index] > clipValue) {
          clippedPixels += histogram[index] - clipValue
          histogram[index] = clipValue
        }
      }

      const redistBatch = Math.floor(clippedPixels / 256)
      let remainder = clippedPixels % 256

      for (let index = 0; index < 256; index += 1) {
        histogram[index] += redistBatch

        if (remainder > 0) {
          histogram[index] += 1
          remainder -= 1
        }
      }

      let cumulative = 0
      const lut = lookupTables[tileY][tileX]

      for (let index = 0; index < 256; index += 1) {
        cumulative += histogram[index]
        lut[index] = Math.round((cumulative / tileArea) * 255)
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    const tilePositionY = Math.min(tilesY - 1, y / tileHeight)
    const topTileY = Math.floor(tilePositionY)
    const bottomTileY = Math.min(tilesY - 1, topTileY + 1)
    const blendY = tilePositionY - topTileY

    for (let x = 0; x < width; x += 1) {
      const tilePositionX = Math.min(tilesX - 1, x / tileWidth)
      const leftTileX = Math.floor(tilePositionX)
      const rightTileX = Math.min(tilesX - 1, leftTileX + 1)
      const blendX = tilePositionX - leftTileX
      const lightness = lValues[y * width + x]
      const topLeft = lookupTables[topTileY][leftTileX][lightness]
      const topRight = lookupTables[topTileY][rightTileX][lightness]
      const bottomLeft = lookupTables[bottomTileY][leftTileX][lightness]
      const bottomRight = lookupTables[bottomTileY][rightTileX][lightness]
      const top = topLeft + (topRight - topLeft) * blendX
      const bottom = bottomLeft + (bottomRight - bottomLeft) * blendX
      const nextLightness = top + (bottom - top) * blendY
      const xyz = labToXyz(
        (nextLightness / 255) * 100,
        aValues[y * width + x],
        bValues[y * width + x],
      )
      const rgb = xyzToRgb(xyz.x, xyz.y, xyz.z)
      const offset = (y * width + x) * 4
      data[offset] = rgb.red
      data[offset + 1] = rgb.green
      data[offset + 2] = rgb.blue
    }
  }
}

export class BrowserEyeTrackingSession {
  private readonly frameCanvas = document.createElement('canvas')

  private readonly claheCanvas = document.createElement('canvas')

  private mediaStream: MediaStream | null = null

  private videoElement: HTMLVideoElement | null = null

  private filterX = new OneEuroAxis(1.2, 0.15)

  private filterY = new OneEuroAxis(0.8, 0.05)

  private lastFilterTimestamp: number | null = null

  private cellBuffer: number[] = []

  private stableCell: number | null = null

  private polyCoeffX: number[] | null = null

  private polyCoeffY: number[] | null = null

  private calibrationRefiner = new CalibrationRefiner()

  private blinkThreshold = 0.18

  private triggerDetector = new TriggerDetector(this.blinkThreshold)

  private earSamples: number[] = []

  private lastScreenX: number | null = null

  private lastScreenY: number | null = null

  private recentScreen: Array<[number, number]> = []

  private driftBaselineX: number | null = null

  private driftBaselineY: number | null = null

  private driftOffsetX = 0

  private driftOffsetY = 0

  private calibrated = false

  async start(signal?: AbortSignal) {
    if (this.mediaStream && this.videoElement) {
      return this.videoElement
    }

    if (import.meta.env.DEV) {
      console.info('[eye-tracking] camera init start', {
        mode: 'browser',
      })
    }

    const videoElement = document.createElement('video')
    videoElement.autoplay = true
    videoElement.muted = true
    videoElement.playsInline = true

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
      },
      audio: false,
    })

    if (signal?.aborted) {
      mediaStream.getTracks().forEach(track => track.stop())
      throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
    }

    this.mediaStream = mediaStream
    this.videoElement = videoElement
    videoElement.srcObject = mediaStream
    await videoElement.play().catch(() => undefined)

    if (import.meta.env.DEV) {
      console.info('[eye-tracking] camera init success', {
        mode: 'browser',
      })
    }

    return videoElement
  }

  getVideoElement() {
    return this.videoElement
  }

  private getWorkingFrame() {
    const videoElement = this.videoElement

    if (!videoElement || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
      return null
    }

    const sourceWidth = videoElement.videoWidth
    const sourceHeight = videoElement.videoHeight
    const scale = sourceWidth < FRAME_MIN_WIDTH ? FRAME_MIN_WIDTH / sourceWidth : 1
    const width = Math.round(sourceWidth * scale)
    const height = Math.round(sourceHeight * scale)

    this.frameCanvas.width = width
    this.frameCanvas.height = height
    const frameContext = this.frameCanvas.getContext('2d', { alpha: false })

    if (!frameContext) {
      return null
    }

    frameContext.drawImage(videoElement, 0, 0, width, height)

    this.claheCanvas.width = width
    this.claheCanvas.height = height
    const claheContext = this.claheCanvas.getContext('2d', { alpha: false })

    if (!claheContext) {
      return null
    }

    claheContext.drawImage(this.frameCanvas, 0, 0, width, height)
    const imageData = claheContext.getImageData(0, 0, width, height)
    applyClaheToImageData(imageData)
    claheContext.putImageData(imageData, 0, 0)

    return {
      width,
      height,
      canvas: this.claheCanvas,
    } satisfies WorkingFrame
  }

  private smoothPoint(rx: number, ry: number, timestampMs: number) {
    const timeElapsedSeconds =
      this.lastFilterTimestamp === null ? 0.033 : (timestampMs - this.lastFilterTimestamp) / 1000
    this.lastFilterTimestamp = timestampMs

    return [
      this.filterX.update(rx, timeElapsedSeconds),
      this.filterY.update(ry, timeElapsedSeconds),
    ] as const
  }

  private ratioToCellDefault(rx: number, ry: number) {
    const column = rx > 0.55 ? 0 : rx < 0.45 ? 2 : 1
    const row = ry < 0.45 ? 0 : 1
    return row * 3 + column
  }

  private predictPolynomial(rx: number, ry: number) {
    if (!this.polyCoeffX || !this.polyCoeffY) {
      return [rx, ry] as const
    }

    const features = [1, rx, ry, rx * ry, rx * rx, ry * ry]

    return [
      features.reduce((sum, value, index) => sum + value * this.polyCoeffX![index], 0),
      features.reduce((sum, value, index) => sum + value * this.polyCoeffY![index], 0),
    ] as const
  }

  private ratioToCellCalibrated(rx: number, ry: number) {
    const [predictedX, predictedY] = this.predictPolynomial(rx, ry)
    const screenX = clamp01(predictedX)
    const screenY = clamp01(predictedY)
    const column = screenX < 1 / 3 ? 0 : screenX < 2 / 3 ? 1 : 2
    const row = screenY < 0.5 ? 0 : 1
    return row * 3 + column
  }

  private stabilizeCell(rawCell: number) {
    this.cellBuffer.push(rawCell)

    if (this.cellBuffer.length > 5) {
      this.cellBuffer.shift()
    }

    const counts = this.cellBuffer.reduce<Record<number, number>>((accumulator, cell) => {
      accumulator[cell] = (accumulator[cell] ?? 0) + 1
      return accumulator
    }, {})

    const dominantEntry = Object.entries(counts).sort((left, right) => right[1] - left[1])[0]

    if (dominantEntry && dominantEntry[1] >= 3) {
      this.stableCell = Number(dominantEntry[0])
    }

    return this.stableCell ?? rawCell
  }

  async step(timestampMs = performance.now()): Promise<BrowserEyeTrackingFrame> {
    const defaultFrame: BrowserEyeTrackingFrame = {
      cell: null,
      ratioX: null,
      ratioY: null,
      rawRatioX: null,
      rawRatioY: null,
      eyeAspectRatio: 0,
      faceDetected: false,
      blinkDetected: false,
      trigger: 'none',
      screenX: 0.5,
      screenY: 0.5,
      status: 'face-not-detected',
    }

    const workingFrame = this.getWorkingFrame()

    if (!workingFrame) {
      return defaultFrame
    }

    const faceLandmarker = await getBrowserFaceLandmarker()
    const detectionResult = faceLandmarker.detectForVideo(workingFrame.canvas, timestampMs)
    const landmarks = extractPixelLandmarks(detectionResult, workingFrame.width, workingFrame.height)

    if (!landmarks) {
      return defaultFrame
    }

    const iris = computeIrisPosition(landmarks, this.blinkThreshold)
    const timestampSeconds = timestampMs / 1000
    const trigger = this.triggerDetector.update(iris.ear, timestampSeconds)
    this.earSamples.push(iris.ear)

    if (this.earSamples.length > 120) {
      this.earSamples.shift()
    }

    if (iris.rx === null || iris.ry === null) {
      return {
        ...defaultFrame,
        faceDetected: true,
        blinkDetected: iris.blink,
        eyeAspectRatio: Number(iris.ear.toFixed(3)),
        trigger,
        status: 'tracking-unstable',
      }
    }

    const headPose = computeHeadPoseFromMatrix(detectionResult)
    let fusedRx = iris.rx
    let fusedRy = iris.ry

    if (headPose.yaw !== null && headPose.pitch !== null) {
      const normalizedYaw = clamp01((headPose.yaw + GRID_YAW_RANGE) / (2 * GRID_YAW_RANGE))
      const normalizedPitch = clamp01((headPose.pitch + GRID_PITCH_RANGE) / (2 * GRID_PITCH_RANGE))
      fusedRx = IRIS_GAZE_WEIGHT * iris.rx + HEAD_POSE_WEIGHT * normalizedYaw
      fusedRy = IRIS_GAZE_WEIGHT * iris.ry + HEAD_POSE_WEIGHT * normalizedPitch
    }

    const [smoothedRx, smoothedRy] = this.smoothPoint(fusedRx, fusedRy, timestampMs)
    const rawCell = this.calibrated
      ? this.ratioToCellCalibrated(smoothedRx, smoothedRy)
      : this.ratioToCellDefault(smoothedRx, smoothedRy)
    const cell = this.stabilizeCell(rawCell)

    let screenX = smoothedRx
    let screenY = smoothedRy

    if (this.calibrated && this.polyCoeffX && this.polyCoeffY) {
      ;[screenX, screenY] = this.predictPolynomial(smoothedRx, smoothedRy)
      screenX = clamp01(screenX)
      screenY = clamp01(screenY)
    }

    if (this.calibrationRefiner.isFitted) {
      ;[screenX, screenY] = this.calibrationRefiner.correct(screenX, screenY)
      screenX = clamp01(screenX)
      screenY = clamp01(screenY)
    }

    this.recentScreen.push([screenX, screenY])

    if (this.recentScreen.length > 90) {
      this.recentScreen.shift()
    }

    if (this.driftBaselineX !== null && this.driftBaselineY !== null && this.recentScreen.length > 0) {
      const movingAverageX =
        this.recentScreen.reduce((sum, point) => sum + point[0], 0) / this.recentScreen.length
      const movingAverageY =
        this.recentScreen.reduce((sum, point) => sum + point[1], 0) / this.recentScreen.length

      if (
        Math.abs(movingAverageX - this.driftBaselineX) >= DRIFT_THRESHOLD ||
        Math.abs(movingAverageY - this.driftBaselineY) >= DRIFT_THRESHOLD
      ) {
        this.driftOffsetX = movingAverageX - this.driftBaselineX
        this.driftOffsetY = movingAverageY - this.driftBaselineY
        screenX = clamp01(screenX - this.driftOffsetX)
        screenY = clamp01(screenY - this.driftOffsetY)
      }
    }

    this.lastScreenX = screenX
    this.lastScreenY = screenY
    const faceBounds = getFaceBounds(landmarks)
    const hasFaceBounds = faceBounds.width > 10 && faceBounds.height > 10

    return {
      cell,
      ratioX: Number(smoothedRx.toFixed(4)),
      ratioY: Number(smoothedRy.toFixed(4)),
      rawRatioX: Number(fusedRx.toFixed(4)),
      rawRatioY: Number(fusedRy.toFixed(4)),
      eyeAspectRatio: Number(iris.ear.toFixed(3)),
      faceDetected: hasFaceBounds,
      blinkDetected: false,
      trigger,
      screenX: Number(screenX.toFixed(4)),
      screenY: Number(screenY.toFixed(4)),
      status: hasFaceBounds ? 'ready' : 'tracking-unstable',
    }
  }

  setCalibration(points: CalibrationPointSample[]) {
    if (this.earSamples.length > 0) {
      const meanEar = this.earSamples.reduce((sum, value) => sum + value, 0) / this.earSamples.length
      this.blinkThreshold = Math.max(0.1, meanEar * 0.6)
      this.triggerDetector.setThreshold(this.blinkThreshold)
      this.earSamples = []
    }

    const pointCount = Math.min(CALIB_TARGET_RX.length, points.length)
    const features = Array.from({ length: pointCount }, (_, index) => {
      const point = points[index]
      return [1, point.rx, point.ry, point.rx * point.ry, point.rx * point.rx, point.ry * point.ry]
    })

    const nextPolyCoeffX = fitLeastSquares(features, CALIB_TARGET_RX.slice(0, pointCount))
    const nextPolyCoeffY = fitLeastSquares(features, CALIB_TARGET_RY.slice(0, pointCount))

    if (!nextPolyCoeffX || !nextPolyCoeffY) {
      throw new Error('Calibration polynomial fitting failed.')
    }

    this.polyCoeffX = nextPolyCoeffX
    this.polyCoeffY = nextPolyCoeffY
    this.calibrationRefiner.clear()

    for (let index = 0; index < pointCount; index += 1) {
      this.calibrationRefiner.addSample(
        points[index].rx,
        points[index].ry,
        CALIB_TARGET_RX[index],
        CALIB_TARGET_RY[index],
      )
    }

    this.calibrationRefiner.fit()
    this.calibrated = true
    this.cellBuffer = []
    this.stableCell = null
    this.filterX.reset()
    this.filterY.reset()
    this.lastFilterTimestamp = null

    if (this.recentScreen.length > 0) {
      this.driftBaselineX =
        this.recentScreen.reduce((sum, point) => sum + point[0], 0) / this.recentScreen.length
      this.driftBaselineY =
        this.recentScreen.reduce((sum, point) => sum + point[1], 0) / this.recentScreen.length
    }
  }

  exportCalibrationRecord(profileId: string): BrowserEyeTrackingCalibrationRecord | null {
    if (!this.calibrated || !this.polyCoeffX || !this.polyCoeffY) {
      return null
    }

    const exportedRefinerState = this.calibrationRefiner.exportState()

    return {
      userId: profileId,
      createdAt: new Date().toISOString(),
      blinkThreshold: this.blinkThreshold,
      polyCoeffX: [...this.polyCoeffX],
      polyCoeffY: [...this.polyCoeffY],
      calRefinerRaw: exportedRefinerState.raw,
      calRefinerTarget: exportedRefinerState.target,
    }
  }

  saveCalibration(profileId: string) {
    const record = this.exportCalibrationRecord(profileId)

    if (!record) {
      return false
    }

    const saved = saveBrowserEyeTrackingCalibration(profileId, record)

    if (saved && import.meta.env.DEV) {
      console.info('[eye-tracking] calibration saved', {
        profileId,
      })
    }

    return saved
  }

  loadCalibration(profileId: string) {
    const record = loadBrowserEyeTrackingCalibration(profileId)

    if (!record) {
      return false
    }

    this.polyCoeffX = [...record.polyCoeffX]
    this.polyCoeffY = [...record.polyCoeffY]
    this.blinkThreshold = record.blinkThreshold
    this.triggerDetector.setThreshold(this.blinkThreshold)
    this.calibrationRefiner.clear()
    record.calRefinerRaw.forEach((rawPoint, index) => {
      const targetPoint = record.calRefinerTarget[index]

      if (!targetPoint) {
        return
      }

      this.calibrationRefiner.addSample(rawPoint[0], rawPoint[1], targetPoint[0], targetPoint[1])
    })
    this.calibrationRefiner.fit()
    this.calibrated = true
    this.cellBuffer = []
    this.stableCell = null
    this.filterX.reset()
    this.filterY.reset()
    this.lastFilterTimestamp = null

    if (import.meta.env.DEV) {
      console.info('[eye-tracking] calibration loaded', {
        profileId,
      })
    }

    return true
  }

  recordSelection(cellIndex: number) {
    if (
      cellIndex < 0 ||
      cellIndex >= CELL_CENTER_RX.length ||
      this.lastScreenX === null ||
      this.lastScreenY === null
    ) {
      return
    }

    this.calibrationRefiner.addSample(
      this.lastScreenX,
      this.lastScreenY,
      CELL_CENTER_RX[cellIndex],
      CELL_CENTER_RY[cellIndex],
    )

    if (this.calibrationRefiner.sampleCount >= ONLINE_FIT_AFTER_SAMPLES) {
      this.calibrationRefiner.fit()
    }
  }

  dispose() {
    this.mediaStream?.getTracks().forEach(track => track.stop())
    this.mediaStream = null

    if (this.videoElement) {
      this.videoElement.srcObject = null
      this.videoElement = null
    }
  }
}

let activeRuntimeSession: BrowserEyeTrackingSession | null = null

export function createBrowserEyeTrackingSession() {
  return new BrowserEyeTrackingSession()
}

export function setActiveBrowserEyeTrackingSession(session: BrowserEyeTrackingSession | null) {
  activeRuntimeSession = session
}

export function recordActiveBrowserEyeTrackingSelection(cellIndex: number) {
  activeRuntimeSession?.recordSelection(cellIndex)
}

export function getBrowserEyeTrackingStatus(frame: BrowserEyeTrackingFrame | null) {
  return frame?.status ?? 'face-not-detected'
}
