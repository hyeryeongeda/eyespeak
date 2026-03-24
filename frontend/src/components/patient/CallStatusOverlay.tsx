import { useEffect } from 'react'
import { useCallStatusStore } from '../../stores/callStatusStore'

const AUTO_DISMISS_MS = 4000

export default function CallStatusOverlay() {
  const status = useCallStatusStore((s) => s.status)
  const reset = useCallStatusStore((s) => s.reset)

  useEffect(() => {
    if (status !== 'confirmed') return

    const timer = setTimeout(() => {
      reset()
    }, AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [status, reset])

  if (status === 'idle') return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        minWidth: 280,
        padding: '16px 28px',
        borderRadius: 16,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 700,
        color: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        background: status === 'pending'
          ? 'linear-gradient(135deg, #e55a3a 0%, #c0392b 100%)'
          : 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
        transition: 'background 0.3s ease',
      }}
    >
      {status === 'pending' && '호출 중...'}
      {status === 'confirmed' && '보호자가 확인하였습니다'}
    </div>
  )
}
