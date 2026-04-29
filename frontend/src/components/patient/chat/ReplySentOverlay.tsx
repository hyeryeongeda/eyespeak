import type { CSSProperties } from 'react'

interface ReplySentOverlayProps {
  visible: boolean
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'rgba(239, 245, 251, 0.72)',
  backdropFilter: 'blur(8px)',
  zIndex: 1130,
}

const panelStyle: CSSProperties = {
  width: 'min(520px, 100%)',
  borderRadius: '28px',
  padding: '32px 28px',
  background:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 253, 0.96) 100%)',
  border: '1px solid rgba(212, 225, 236, 0.96)',
  boxShadow: '0 24px 56px rgba(60, 80, 104, 0.16)',
  textAlign: 'center',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#213244',
  fontSize: 'clamp(1.7rem, 2.8vw, 2.2rem)',
  fontWeight: 900,
  lineHeight: 1.3,
  letterSpacing: '-0.03em',
}

const descriptionStyle: CSSProperties = {
  margin: '12px 0 0',
  color: '#66788f',
  fontSize: 'clamp(1rem, 1.5vw, 1.1rem)',
  fontWeight: 700,
  lineHeight: 1.6,
}

export default function ReplySentOverlay({ visible }: ReplySentOverlayProps) {
  if (!visible) {
    return null
  }

  return (
    <div style={backdropStyle} role="status" aria-live="polite" aria-label="답장 전송 완료">
      <div style={panelStyle}>
        <h2 style={titleStyle}>보호자에게 답장을 보냈어요.</h2>
        <p style={descriptionStyle}>잠시 후 대화하기 메인으로 이동합니다.</p>
      </div>
    </div>
  )
}
