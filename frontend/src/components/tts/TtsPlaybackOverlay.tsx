import { useTtsPlaybackStore } from '../../stores/ttsPlaybackStore'

const overlayCardClassName =
  'pointer-events-none flex h-28 w-28 items-center justify-center rounded-full bg-white/52 text-[4rem] leading-none shadow-[0_18px_42px_rgba(15,23,42,0.12)] ring-1 ring-white/65 backdrop-blur-[2px]'
const PREPARING_ICON = '\u{1F508}'
const PLAYING_ICON = '\u{1F50A}'

export default function TtsPlaybackOverlay() {
  const status = useTtsPlaybackStore(state => state.status)

  if (status !== 'preparing' && status !== 'playing') {
    return null
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1500] flex items-center justify-center"
    >
      <div className={overlayCardClassName}>
        <span role="img" aria-label={status === 'preparing' ? 'TTS preparing' : 'TTS playing'}>
          {status === 'preparing' ? PREPARING_ICON : PLAYING_ICON}
        </span>
      </div>
    </div>
  )
}
