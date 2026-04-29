import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'
import { pageWrapper } from '../ui/authPageStyles'

interface ViewportMetrics {
  height: number
  keyboardInset: number
}

interface AuthPageFrameProps {
  children: ReactNode
}

function getViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      height: 0,
      keyboardInset: 0,
    }
  }

  const viewport = window.visualViewport
  const height = Math.round(viewport?.height ?? window.innerHeight)
  const keyboardInset = Math.max(
    0,
    Math.round(window.innerHeight - height - (viewport?.offsetTop ?? 0)),
  )

  return {
    height,
    keyboardInset,
  }
}

function isSameViewportMetrics(previous: ViewportMetrics, next: ViewportMetrics) {
  return (
    previous.height === next.height &&
    previous.keyboardInset === next.keyboardInset
  )
}

export default function AuthPageFrame({ children }: AuthPageFrameProps) {
  const location = useLocation()
  const containerRef = useRef<HTMLElement | null>(null)
  const focusTimerRef = useRef<number | null>(null)
  const keyboardInsetRef = useRef(0)
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>(() => getViewportMetrics())

  useEffect(() => {
    keyboardInsetRef.current = viewportMetrics.keyboardInset
  }, [viewportMetrics.keyboardInset])

  const syncViewportMetrics = useCallback(() => {
    const nextMetrics = getViewportMetrics()

    setViewportMetrics(previousMetrics => {
      return isSameViewportMetrics(previousMetrics, nextMetrics)
        ? previousMetrics
        : nextMetrics
    })
  }, [])

  useEffect(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }

    const frameId = window.requestAnimationFrame(() => {
      syncViewportMetrics()
      containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [location.key, syncViewportMetrics])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(syncViewportMetrics)

    const viewport = window.visualViewport

    viewport?.addEventListener('resize', syncViewportMetrics)
    viewport?.addEventListener('scroll', syncViewportMetrics)
    window.addEventListener('resize', syncViewportMetrics)

    return () => {
      window.cancelAnimationFrame(frameId)
      viewport?.removeEventListener('resize', syncViewportMetrics)
      viewport?.removeEventListener('scroll', syncViewportMetrics)
      window.removeEventListener('resize', syncViewportMetrics)
    }
  }, [syncViewportMetrics])

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      if (!target.matches('input, textarea, select')) {
        return
      }

      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
      }

      const keyboardInset = keyboardInsetRef.current

      focusTimerRef.current = window.setTimeout(() => {
        target.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: keyboardInset > 0 ? 'smooth' : 'auto',
        })
        focusTimerRef.current = null
      }, keyboardInset > 0 ? 220 : 0)
    }

    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
    }
  }, [])

  const frameStyle: CSSProperties = {
    ...pageWrapper,
    minHeight: viewportMetrics.height > 0 ? `${viewportMetrics.height}px` : '100dvh',
    height: viewportMetrics.height > 0 ? `${viewportMetrics.height}px` : '100%',
    paddingBottom: `${40 + viewportMetrics.keyboardInset}px`,
    scrollPaddingBottom: `${40 + viewportMetrics.keyboardInset}px`,
    overscrollBehaviorY: 'contain',
  }

  return (
    <main ref={containerRef} style={frameStyle}>
      {children}
    </main>
  )
}
