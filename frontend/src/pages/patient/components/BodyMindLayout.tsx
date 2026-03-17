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
  padding: '4px',
  background: 'linear-gradient(180deg, #f5fafc 0%, #edf4f7 100%)',
  boxSizing: 'border-box',
}

const shellStyle: CSSProperties = {
  minHeight: 'calc(100dvh - 8px)',
  width: '100%',
  display: 'flex',
}

const contentStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
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
  .body-mind-option-card:hover:not(:disabled),
  .body-mind-option-card:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 28px 54px rgba(40, 66, 90, 0.16);
    outline: none;
  }

  .body-mind-option-card:active:not(:disabled) {
    transform: translateY(0);
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
  const liveText = [
    code,
    title,
    description,
    statusTextMap[status],
    contextLabel,
    feedbackText,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <main style={pageWrap} aria-label={title}>
      <style>{responsiveStyle}</style>

      <div aria-live="polite" style={srOnlyStyle}>
        {liveText}
      </div>

      <div style={shellStyle}>
        <div style={contentStyle}>{children}</div>
      </div>
    </main>
  )
}
