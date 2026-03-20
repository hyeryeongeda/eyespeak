import { type CSSProperties, type FocusEvent as ReactFocusEvent, type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react'
import { pageWrapper } from './authPageStyles'

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

export default function AuthPageFrame({ children }: AuthPageFrameProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  const focusTimerRef = useRef<number | null>(null)
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>(() => getViewportMetrics())

  const syncViewportMetrics = useEffectEvent(() => {
    setViewportMetrics(getViewportMetrics())
  })

  const scrollFocusedFieldIntoView = useEffectEvent((field: HTMLElement) => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
    }

    focusTimerRef.current = window.setTimeout(() => {
      field.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: viewportMetrics.keyboardInset > 0 ? 'smooth' : 'auto',
      })
    }, viewportMetrics.keyboardInset > 0 ? 220 : 0)
  })

  useEffect(() => {
    syncViewportMetrics()

    const viewport = window.visualViewport

    viewport?.addEventListener('resize', syncViewportMetrics)
    viewport?.addEventListener('scroll', syncViewportMetrics)
    window.addEventListener('resize', syncViewportMetrics)

    return () => {
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

    const handleFocusIn = (event: FocusEvent | ReactFocusEvent<HTMLElement>) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      if (!target.matches('input, textarea, select')) {
        return
      }

      scrollFocusedFieldIntoView(target)
    }

    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [scrollFocusedFieldIntoView])

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current)
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
