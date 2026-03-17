import type { CSSProperties, ReactNode } from 'react'
import type { BodyMindUiStatus } from '../../../types/communication'

const statusTextMap: Record<BodyMindUiStatus, string> = {
  idle: '대기',
  visible: '항목을 선택하세요',
  selecting: '선택 반영 중',
  completed: '선택 완료',
  transitioning: '화면 이동 중',
  area_selected: '부위를 선택했습니다',
}

const pageWrap: CSSProperties = {
  minHeight: '100dvh',
  width: '100%',
  padding: '16px',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  boxSizing: 'border-box',
}

const shellStyle: CSSProperties = {
  minHeight: 'calc(100dvh - 32px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const statusBarStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 16px',
  borderRadius: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid #dde7ed',
  color: '#203042',
}

const statusCodeStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#5d8ec7',
}

const statusLabelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
}

const headerStyle: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '20px 22px',
  borderRadius: '24px',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid #dde7ed',
  boxShadow: '0 18px 40px rgba(40, 66, 90, 0.08)',
}

const headerTextStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const codeStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  fontWeight: 800,
  color: '#5d8ec7',
  letterSpacing: '0.02em',
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
  fontWeight: 800,
  lineHeight: 1.1,
  color: '#203042',
}

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(0.98rem, 1.6vw, 1.1rem)',
  fontWeight: 600,
  lineHeight: 1.5,
  color: '#66788b',
}

const contextBadgeStyle: CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 16px',
  borderRadius: '999px',
  backgroundColor: '#edf4ff',
  border: '1px solid #d7e5fb',
  fontSize: '14px',
  fontWeight: 700,
  color: '#355783',
  textAlign: 'center',
}

const feedbackStyle: CSSProperties = {
  flexShrink: 0,
  padding: '12px 16px',
  borderRadius: '16px',
  backgroundColor: 'rgba(255, 255, 255, 0.82)',
  border: '1px solid #dde7ed',
  fontSize: '14px',
  fontWeight: 600,
  color: '#506273',
}

const contentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  overflow: 'auto',
}

const responsiveStyle = `
  .body-mind-option-card:hover:not(:disabled),
  .body-mind-option-card:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 28px 54px rgba(40, 66, 90, 0.16);
    outline: none;
  }

  .body-mind-option-card:active:not(:disabled) {
    transform: translateY(0);
  }

  @media (max-width: 900px) {
    .body-mind-header {
      flex-direction: column;
      align-items: stretch;
    }
  }
`

interface BodyMindLayoutProps {
  code: string
  title: string
  description: string
  status: BodyMindUiStatus
  contextLabel?: string
  feedbackText?: string
  children: ReactNode
}

export default function BodyMindLayout({
  code,
  title,
  description,
  status,
  contextLabel,
  feedbackText,
  children,
}: BodyMindLayoutProps) {
  return (
    <main style={pageWrap}>
      <style>{responsiveStyle}</style>

      <div style={shellStyle}>
        <div style={statusBarStyle}>
          <span style={statusCodeStyle}>{code}</span>
          <span style={statusLabelStyle}>{statusTextMap[status]}</span>
        </div>

        <section className="body-mind-header" style={headerStyle}>
          <div style={headerTextStyle}>
            <p style={codeStyle}>{code}</p>
            <h1 style={titleStyle}>{title}</h1>
            <p style={descriptionStyle}>{description}</p>
          </div>

          {contextLabel ? <div style={contextBadgeStyle}>{contextLabel}</div> : null}
        </section>

        {feedbackText ? <div style={feedbackStyle}>{feedbackText}</div> : null}

        <div style={contentStyle}>{children}</div>
      </div>
    </main>
  )
}
