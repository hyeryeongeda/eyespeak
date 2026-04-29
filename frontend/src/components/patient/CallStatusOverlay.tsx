import { type CSSProperties, useEffect } from 'react'
import { useCallStatusStore } from '../../stores/callStatusStore'

const PENDING_AUTO_DISMISS_MS = 2600
const CONFIRMED_AUTO_DISMISS_MS = 4000

const overlayBaseStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 1200,
  backdropFilter: 'blur(8px)',
}

const contentStyle: CSSProperties = {
  width: '100%',
  maxWidth: '920px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '48px',
  padding: '0 22px',
  borderRadius: '999px',
  fontSize: '18px',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  boxShadow: '0 10px 26px rgba(29, 37, 52, 0.12)',
}

const titleStyle: CSSProperties = {
  margin: '20px 0 0',
  color: '#2d384f',
  fontSize: 'clamp(2.5rem, 5vw, 4.4rem)',
  fontWeight: 900,
  lineHeight: 1.18,
  letterSpacing: '-0.05em',
}

const descriptionStyle: CSSProperties = {
  margin: '18px 0 0',
  color: '#52627d',
  fontSize: 'clamp(1.05rem, 1.8vw, 1.5rem)',
  fontWeight: 700,
  lineHeight: 1.6,
}

function getOverlayCopy(status: 'pending' | 'confirmed', tone: 'call' | 'sos', message: string | null) {
  if (status === 'pending') {
    if (tone === 'sos') {
      return {
        label: 'SOS 호출 전송',
        title: message ?? '보호자에게 SOS 호출 신호가 전송되었습니다.',
        description: '긴급 호출이 접수되면 다시 안내합니다.',
      }
    }

    return {
      label: '호출 전송',
      title: message ?? '보호자에게 호출 신호가 전송되었습니다.',
      description: '잠시 후 메인 화면으로 돌아갑니다.',
    }
  }

  if (tone === 'sos') {
    return {
      label: 'SOS 확인 완료',
      title: message ?? '보호자가 SOS 호출을 확인했습니다.',
      description: '필요한 응답이 곧 전달될 수 있습니다.',
    }
  }

  return {
    label: '호출 확인 완료',
    title: message ?? '보호자가 호출을 확인했습니다.',
    description: '필요한 응답이 곧 전달될 수 있습니다.',
  }
}

export default function CallStatusOverlay() {
  const status = useCallStatusStore((s) => s.status)
  const tone = useCallStatusStore((s) => s.tone)
  const message = useCallStatusStore((s) => s.message)
  const reset = useCallStatusStore((s) => s.reset)

  useEffect(() => {
    if (status === 'idle') return

    const timer = setTimeout(() => {
      reset()
    }, status === 'pending' ? PENDING_AUTO_DISMISS_MS : CONFIRMED_AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [status, reset])

  if (status === 'idle') return null

  const copy = getOverlayCopy(status, tone, message)
  const isSosTone = tone === 'sos'

  return (
    <div
      style={{
        ...overlayBaseStyle,
        background:
          status === 'confirmed'
            ? 'rgba(216, 243, 220, 0.58)'
            : isSosTone
              ? 'rgba(244, 220, 220, 0.62)'
              : 'rgba(236, 225, 185, 0.56)',
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="patient-call-status-title"
    >
      <div style={contentStyle}>
        <div
          style={{
            ...chipStyle,
            color: isSosTone ? '#9a3d2a' : '#5d6f8e',
          }}
        >
          {copy.label}
        </div>
        <h2 id="patient-call-status-title" style={titleStyle}>
          {copy.title}
        </h2>
        <p style={descriptionStyle}>{copy.description}</p>
      </div>
    </div>
  )
}
