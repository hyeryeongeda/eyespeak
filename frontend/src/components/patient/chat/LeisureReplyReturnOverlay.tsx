import type { CSSProperties } from 'react'
import usePatientGlobalMenuActionTarget from '../../../features/patient/input/hooks/usePatientGlobalMenuActionTarget'

interface LeisureReplyReturnOverlayProps {
  visible: boolean
  onReturnToLeisure: () => void
  onReturnToMain: () => void
}

const overlayCopy = {
  title: '\uB2F5\uBCC0\uC744 \uBCF4\uB0C8\uC5B4\uC694.\n\uC5B4\uB514\uB85C \uB3CC\uC544\uAC08\uAE4C\uC694?',
  leisure: '\uC5EC\uAC00\uB85C\n\uB3CC\uC544\uAC00\uAE30',
  main: '\uBA54\uC778\uD654\uBA74\uC73C\uB85C\n\uB3CC\uC544\uAC00\uAE30',
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  padding: 'clamp(12px, 2vw, 28px)',
  background:
    'radial-gradient(circle at top, rgba(255, 255, 255, 0.72) 0%, rgba(247, 249, 252, 0.92) 44%, rgba(237, 241, 246, 0.96) 100%)',
  backdropFilter: 'blur(10px)',
  zIndex: 1135,
}

const shellStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 0.94fr) minmax(0, 1.08fr) minmax(0, 0.94fr)',
  gap: '0',
  borderRadius: '30px',
  overflow: 'hidden',
  border: '1px solid rgba(200, 208, 221, 0.92)',
  boxShadow: '0 28px 60px rgba(70, 88, 112, 0.14)',
}

const panelBaseStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'clamp(24px, 4vw, 40px)',
  textAlign: 'center',
}

const choiceButtonBaseStyle: CSSProperties = {
  ...panelBaseStyle,
  width: '100%',
  height: '100%',
  appearance: 'none',
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  transition: 'transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease',
}

const leisureChoiceStyle: CSSProperties = {
  ...choiceButtonBaseStyle,
  background: 'linear-gradient(180deg, #eef4ee 0%, #eaf1ea 100%)',
  borderRight: '1px solid rgba(194, 204, 214, 0.92)',
}

const centerPanelStyle: CSSProperties = {
  ...panelBaseStyle,
  background:
    'linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(252, 252, 252, 0.98) 100%)',
  borderRight: '1px solid rgba(194, 204, 214, 0.92)',
}

const mainChoiceStyle: CSSProperties = {
  ...choiceButtonBaseStyle,
  background: 'linear-gradient(180deg, #f2f4fa 0%, #eceff6 100%)',
}

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#111111',
  fontSize: 'clamp(2rem, 3.2vw, 3rem)',
  fontWeight: 900,
  lineHeight: 1.24,
  letterSpacing: '-0.04em',
  whiteSpace: 'pre-line',
  wordBreak: 'keep-all',
}

const choiceLabelStyle: CSSProperties = {
  margin: 0,
  color: '#111111',
  fontSize: 'clamp(2rem, 3vw, 2.8rem)',
  fontWeight: 900,
  lineHeight: 1.18,
  letterSpacing: '-0.04em',
  whiteSpace: 'pre-line',
  wordBreak: 'keep-all',
}

const overlayCss = `
  .leisure-reply-return-choice:hover,
  .leisure-reply-return-choice:focus-visible {
    transform: scale(1.012);
    filter: brightness(0.985);
    box-shadow: inset 0 0 0 2px rgba(98, 121, 150, 0.22);
    outline: none;
  }

  .leisure-reply-return-choice:active {
    transform: scale(1);
  }

  @media (max-width: 920px) {
    .leisure-reply-return-shell {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(180px, 0.84fr) minmax(160px, 1fr) minmax(160px, 1fr);
    }

    .leisure-reply-return-panel-center {
      border-right: none !important;
      border-bottom: 1px solid rgba(194, 204, 214, 0.92);
    }

    .leisure-reply-return-panel-left {
      border-right: none !important;
      border-bottom: 1px solid rgba(194, 204, 214, 0.92);
    }
  }
`

export default function LeisureReplyReturnOverlay({
  visible,
  onReturnToLeisure,
  onReturnToMain,
}: LeisureReplyReturnOverlayProps) {
  usePatientGlobalMenuActionTarget({
    enabled: visible,
    priority: 340,
    onPositiveAction: onReturnToLeisure,
    onNegativeAction: onReturnToMain,
  })

  if (!visible) {
    return null
  }

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="reply-return-title">
      <style>{overlayCss}</style>
      <div className="leisure-reply-return-shell" style={shellStyle}>
        <button
          type="button"
          className="leisure-reply-return-choice leisure-reply-return-panel-left"
          style={leisureChoiceStyle}
          onClick={onReturnToLeisure}
          aria-label="\uC5EC\uAC00\uB85C \uB3CC\uC544\uAC00\uAE30"
        >
          <p style={choiceLabelStyle}>{overlayCopy.leisure}</p>
        </button>

        <div
          className="leisure-reply-return-panel-center"
          style={centerPanelStyle}
          aria-live="polite"
        >
          <h2 id="reply-return-title" style={titleStyle}>
            {overlayCopy.title}
          </h2>
        </div>

        <button
          type="button"
          className="leisure-reply-return-choice"
          style={mainChoiceStyle}
          onClick={onReturnToMain}
          aria-label="\uBA54\uC778\uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30"
        >
          <p style={choiceLabelStyle}>{overlayCopy.main}</p>
        </button>
      </div>
    </div>
  )
}
