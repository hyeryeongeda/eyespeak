import { useEffect } from 'react'
import { useCustomTalkStore } from '../store/customTalkStore'

const CUSTOM_TALK_ERROR_AUTO_DISMISS_MS = 2000

export default function useAutoDismissCustomTalkError(errorMessage?: string | null) {
  const clearErrorMessage = useCustomTalkStore(state => state.clearErrorMessage)

  useEffect(() => {
    if (!errorMessage) {
      return
    }

    const timerId = window.setTimeout(() => {
      clearErrorMessage()
    }, CUSTOM_TALK_ERROR_AUTO_DISMISS_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [clearErrorMessage, errorMessage])
}
