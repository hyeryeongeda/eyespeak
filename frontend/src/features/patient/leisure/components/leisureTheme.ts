import type { CSSProperties } from 'react'
import type { LeisureCardTone } from '../../../../types/leisure'

export const leisureToneMap: Record<
  LeisureCardTone,
  { background: string; accent: string; border: string }
> = {
  sky: {
    background: 'linear-gradient(135deg, #edf3ff 0%, #e4ecff 100%)',
    accent: '#6887d9',
    border: 'rgba(181, 198, 236, 0.96)',
  },
  sand: {
    background: 'linear-gradient(135deg, #fff8de 0%, #fff0c3 100%)',
    accent: '#d29d3f',
    border: 'rgba(231, 214, 160, 0.96)',
  },
  mint: {
    background: 'linear-gradient(135deg, #eef8f2 0%, #e2f5ee 100%)',
    accent: '#5c9c8b',
    border: 'rgba(176, 219, 208, 0.96)',
  },
  rose: {
    background: 'linear-gradient(135deg, #fff3f2 0%, #ffe7e2 100%)',
    accent: '#d57566',
    border: 'rgba(239, 201, 193, 0.96)',
  },
  slate: {
    background: 'linear-gradient(135deg, #f4f6fa 0%, #edf1f6 100%)',
    accent: '#778494',
    border: 'rgba(207, 216, 228, 0.96)',
  },
}

export const leisureCardBaseStyle: CSSProperties = {
  width: '100%',
  minHeight: 0,
  borderRadius: '28px',
  border: '1px solid rgba(203, 214, 228, 0.95)',
  boxShadow: '0 20px 46px rgba(66, 86, 113, 0.12)',
  padding: '22px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
}

export const leisurePanelSurfaceStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '32px',
  border: '1px solid rgba(213, 222, 233, 0.88)',
  backgroundColor: 'rgba(255, 255, 255, 0.82)',
  boxShadow: '0 24px 48px rgba(73, 92, 117, 0.1)',
  backdropFilter: 'blur(14px)',
  padding: '18px',
  boxSizing: 'border-box',
}

export const leisurePillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '36px',
  width: 'fit-content',
  padding: '0 16px',
  borderRadius: '999px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  color: '#54667c',
  fontSize: '15px',
  fontWeight: 800,
  letterSpacing: '-0.01em',
  boxShadow: '0 8px 16px rgba(90, 109, 133, 0.08)',
}

export const leisureInteractiveCss = `
  html:not([data-patient-mode='true']) .leisure-interactive:hover:not(:disabled),
  html:not([data-patient-mode='true']) .leisure-interactive:focus-visible:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 28px 54px rgba(66, 86, 113, 0.16);
    outline: none;
  }

  html:not([data-patient-mode='true']) .leisure-interactive:active:not(:disabled) {
    transform: translateY(0);
  }
`

export const lineClampTwoStyle: CSSProperties = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
}

export const lineClampThreeStyle: CSSProperties = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
}
