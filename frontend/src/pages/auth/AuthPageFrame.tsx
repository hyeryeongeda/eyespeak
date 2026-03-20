import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const containerRef = useRef<HTMLElement | null>(null)
  const focusTimerRef = useRef<number | null>(null)
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>(() => getViewportMetrics())

  useEffect(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }

    const frameId = window.requestAnimationFrame(() => {
      setViewportMetrics(getViewportMetrics())
      containerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [location.key])

  useEffect(() => {
    const handleViewportChange = () => {
      setViewportMetrics(getViewportMetrics())
    }

    handleViewportChange()

    const viewport = window.visualViewport

    viewport?.addEventListener('resize', handleViewportChange)
    viewport?.addEventListener('scroll', handleViewportChange)
    window.addEventListener('resize', handleViewportChange)

    return () => {
      viewport?.removeEventListener('resize', handleViewportChange)
      viewport?.removeEventListener('scroll', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [])

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

      focusTimerRef.current = window.setTimeout(() => {
        target.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: viewportMetrics.keyboardInset > 0 ? 'smooth' : 'auto',
        })
      }, viewportMetrics.keyboardInset > 0 ? 220 : 0)
    }

    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [viewportMetrics.keyboardInset])

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
    <main key={location.key} ref={containerRef} style={frameStyle}>
      {children}
    </main>
  )
}
