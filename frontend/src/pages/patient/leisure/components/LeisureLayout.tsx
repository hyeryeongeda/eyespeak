import type { CSSProperties, ReactNode } from 'react'
import { leisureInteractiveCss } from './leisureTheme'

const pageStyle: CSSProperties = {
  height: '100dvh',
  minHeight: '100dvh',
  width: '100%',
  padding: 0,
  background:
    'radial-gradient(circle at top left, rgba(255, 255, 255, 0.92) 0%, rgba(240, 246, 251, 0.9) 34%, #eaf2f7 100%)',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
}

const shellStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  padding: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
}

const titleWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  minWidth: 0,
}

const codeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'fit-content',
  minHeight: '32px',
  padding: '0 14px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  color: '#5c7188',
  fontSize: '15px',
  fontWeight: 800,
  letterSpacing: '-0.01em',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#203042',
  fontSize: 'clamp(2.35rem, 3.4vw, 3.25rem)',
  fontWeight: 900,
  letterSpacing: '-0.04em',
  lineHeight: 1.05,
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: '#62768c',
  fontSize: 'clamp(1.15rem, 1.6vw, 1.3rem)',
  fontWeight: 700,
  lineHeight: 1.5,
}

const metaWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '10px',
}

const metaItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '40px',
  padding: '0 16px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.86)',
  border: '1px solid rgba(213, 222, 233, 0.84)',
  color: '#53667d',
  fontSize: '16px',
  fontWeight: 800,
}

const contentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const responsiveStyle = `
  ${leisureInteractiveCss}
`

interface LeisureLayoutProps {
  code: string
  title: string
  description: string
  statusText: string
  contextLabel?: string
  hideHeader?: boolean
  children: ReactNode
}

export default function LeisureLayout({
  code,
  title,
  description,
  statusText,
  contextLabel,
  hideHeader = false,
  children,
}: LeisureLayoutProps) {
  const liveText = [code, title, description, statusText, contextLabel].filter(Boolean).join(' · ')

  return (
    <main style={pageStyle} aria-label={title}>
      <style>{responsiveStyle}</style>

      <div aria-live="polite" style={srOnlyStyle}>
        {liveText}
      </div>

      <div className="leisure-layout-shell" style={shellStyle}>
        {hideHeader ? null : (
          <header className="leisure-layout-header" style={headerStyle}>
            <div style={titleWrapStyle}>
              <span style={codeStyle}>{code}</span>
              <h1 style={titleStyle}>{title}</h1>
              <p style={descriptionStyle}>{description}</p>
            </div>

            <div className="leisure-layout-meta" style={metaWrapStyle}>
              <span style={metaItemStyle}>{statusText}</span>
              {contextLabel ? <span style={metaItemStyle}>{contextLabel}</span> : null}
            </div>
          </header>
        )}

        <div style={contentStyle}>{children}</div>
      </div>
    </main>
  )
}
