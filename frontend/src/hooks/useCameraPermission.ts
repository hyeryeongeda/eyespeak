import { useEffect, useRef, useState } from 'react'
import type { CameraPermissionState } from '../types/calibration'

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => {
    track.stop()
  })
}

export function useCameraPermission() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const stopCamera = () => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setStream(null)

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    if (!videoRef.current) {
      return
    }

    videoRef.current.srcObject = stream

    if (stream) {
      void videoRef.current.play().catch(() => {
        // 모바일 브라우저 자동 재생 제한은 사용자 액션 이후 재시도로 해소한다.
      })
    }
  }, [stream])

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  const requestPermission = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setPermissionState('unavailable')
      setErrorMessage('카메라를 시작할 수 없습니다. 다시 시도해주세요.')
      return false
    }

    stopCamera()
    setPermissionState('requesting')
    setErrorMessage('')

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      })

      streamRef.current = nextStream
      setStream(nextStream)
      setPermissionState('granted')
      return true
    } catch (error) {
      stopCamera()

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
          setPermissionState('denied')
          setErrorMessage('브라우저 설정에서 카메라 권한을 허용한 뒤 다시 시도해주세요.')
          return false
        }

        if (
          error.name === 'NotFoundError' ||
          error.name === 'DevicesNotFoundError' ||
          error.name === 'OverconstrainedError'
        ) {
          setPermissionState('unavailable')
          setErrorMessage('카메라를 시작할 수 없습니다. 다시 시도해주세요.')
          return false
        }
      }

      setPermissionState('error')
      setErrorMessage('카메라를 시작할 수 없습니다. 다시 시도해주세요.')
      return false
    }
  }

  const resetPermissionState = () => {
    stopCamera()
    setPermissionState('idle')
    setErrorMessage('')
  }

  return {
    videoRef,
    stream,
    permissionState,
    errorMessage,
    requestPermission,
    resetPermissionState,
    stopCamera,
  }
}

export default useCameraPermission
