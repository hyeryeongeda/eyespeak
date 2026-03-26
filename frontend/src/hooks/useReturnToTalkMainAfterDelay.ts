import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../app/router/routePaths'

interface UseReturnToTalkMainAfterDelayOptions {
  delayMs?: number
  replace?: boolean
  onBeforeNavigate?: () => void
}

export const RETURN_TO_TALK_MAIN_DELAY_MS = 1200

export default function useReturnToTalkMainAfterDelay(
  enabled: boolean,
  options?: UseReturnToTalkMainAfterDelayOptions,
) {
  const navigate = useNavigate()
  const onBeforeNavigateRef = useRef(options?.onBeforeNavigate)
  const delayMs = options?.delayMs ?? RETURN_TO_TALK_MAIN_DELAY_MS
  const replace = options?.replace ?? true

  useEffect(() => {
    onBeforeNavigateRef.current = options?.onBeforeNavigate
  }, [options?.onBeforeNavigate])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const timerId = window.setTimeout(() => {
      onBeforeNavigateRef.current?.()
      navigate(ROUTE_PATHS.PATIENT_TALK_MAIN, { replace })
    }, delayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [delayMs, enabled, navigate, replace])
}
