import { useEffect, useRef } from 'react'
import { type NavigateOptions, type To, useNavigate } from 'react-router-dom'

export const PATIENT_NAVIGATION_FEEDBACK_DELAY_MS = 180

type NavigateWithFeedbackOptions = NavigateOptions & {
  delayMs?: number
  beforeNavigate?: () => void
}

export default function usePatientNavigateWithFeedback(
  defaultDelayMs = PATIENT_NAVIGATION_FEEDBACK_DELAY_MS,
) {
  const navigate = useNavigate()
  const navigationTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
      }
    }
  }, [])

  return (to: To, options: NavigateWithFeedbackOptions = {}) => {
    const {
      delayMs = defaultDelayMs,
      beforeNavigate,
      ...navigateOptions
    } = options

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current)
    }

    navigationTimerRef.current = window.setTimeout(() => {
      navigationTimerRef.current = null
      beforeNavigate?.()
      navigate(to, navigateOptions)
    }, delayMs)
  }
}
