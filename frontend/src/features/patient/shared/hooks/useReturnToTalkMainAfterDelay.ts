import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'
import { useTtsPlaybackStore } from '../../../../stores/ttsPlaybackStore'

interface UseReturnToTalkMainAfterDelayOptions {
  delayMs?: number
  replace?: boolean
  onBeforeNavigate?: () => void
  onAfterNavigate?: () => void
  targetPath?: string
}

export const RETURN_TO_TALK_MAIN_DELAY_MS = 1200

export default function useReturnToTalkMainAfterDelay(
  enabled: boolean,
  options?: UseReturnToTalkMainAfterDelayOptions,
) {
  const navigate = useNavigate()
  const hasActiveTtsRequest = useTtsPlaybackStore(state => state.activeRequestId !== null)
  const onBeforeNavigateRef = useRef(options?.onBeforeNavigate)
  const onAfterNavigateRef = useRef(options?.onAfterNavigate)
  const targetPathRef = useRef(options?.targetPath ?? ROUTE_PATHS.PATIENT_TALK_MAIN)
  const delayMs = options?.delayMs ?? RETURN_TO_TALK_MAIN_DELAY_MS
  const replace = options?.replace ?? true

  useEffect(() => {
    onBeforeNavigateRef.current = options?.onBeforeNavigate
  }, [options?.onBeforeNavigate])

  useEffect(() => {
    onAfterNavigateRef.current = options?.onAfterNavigate
  }, [options?.onAfterNavigate])

  useEffect(() => {
    targetPathRef.current = options?.targetPath ?? ROUTE_PATHS.PATIENT_TALK_MAIN
  }, [options?.targetPath])

  useEffect(() => {
    if (!enabled || hasActiveTtsRequest) {
      return
    }

    const timerId = window.setTimeout(() => {
      onBeforeNavigateRef.current?.()
      navigate(targetPathRef.current, { replace })
      if (onAfterNavigateRef.current) {
        window.setTimeout(() => {
          onAfterNavigateRef.current?.()
        }, 0)
      }
    }, delayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [delayMs, enabled, hasActiveTtsRequest, navigate, replace])
}
