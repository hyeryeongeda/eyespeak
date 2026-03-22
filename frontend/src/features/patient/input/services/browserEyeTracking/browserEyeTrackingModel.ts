import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

function joinBasePath(basePath: string | undefined, suffix: string) {
  const normalizedBasePath = basePath?.trim().replace(/\/+$/, '') ?? ''
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`

  return normalizedBasePath && normalizedBasePath !== '/'
    ? `${normalizedBasePath}${normalizedSuffix}`
    : normalizedSuffix
}

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null

export function getBrowserFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = (async () => {
      const wasmFileset = await FilesetResolver.forVisionTasks(
        joinBasePath(import.meta.env.BASE_URL, '/vendor/mediapipe'),
      )

      return FaceLandmarker.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath: joinBasePath(import.meta.env.BASE_URL, '/models/face_landmarker.task'),
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.3,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.3,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      })
    })()
  }

  return faceLandmarkerPromise
}

export type BrowserFaceLandmarkerResult = FaceLandmarkerResult
