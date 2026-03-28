import type { CSSProperties } from 'react'

export const customTalkPanelStyle: CSSProperties = {
  padding: '18px',
  borderRadius: '24px',
  backgroundColor: '#ffffff',
  border: '1px solid #dde7ed',
  boxShadow: '0 20px 40px rgba(63, 86, 111, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

export const customTalkActionRowStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

export const customTalkButtonStyle: CSSProperties = {
  minWidth: '140px',
  minHeight: '56px',
  padding: '0 20px',
  borderRadius: '999px',
  border: '1px solid #cfd9e2',
  backgroundColor: '#ffffff',
  color: '#31455e',
  fontSize: '17px',
  fontWeight: 800,
  cursor: 'pointer',
}

export const customTalkPrimaryButtonStyle: CSSProperties = {
  ...customTalkButtonStyle,
  border: '1px solid #5f8cc9',
  background: 'linear-gradient(135deg, #e8f2ff 0%, #dbe9ff 100%)',
}

export const customTalkNoticeStyle: CSSProperties = {
  padding: '16px 18px',
  borderRadius: '20px',
  fontSize: '16px',
  fontWeight: 700,
  lineHeight: 1.55,
}

export const customTalkErrorNoticeStyle: CSSProperties = {
  ...customTalkNoticeStyle,
  backgroundColor: '#fff4f4',
  border: '1px solid #efc8c8',
  color: '#b24d4d',
}

export const customTalkSuccessNoticeStyle: CSSProperties = {
  ...customTalkNoticeStyle,
  backgroundColor: '#eef8f1',
  border: '1px solid #cce4d2',
  color: '#3f6e4c',
}

export const customTalkLoadingNoticeStyle: CSSProperties = {
  ...customTalkNoticeStyle,
  backgroundColor: '#f6f9fc',
  border: '1px solid #dce6ed',
  color: '#607389',
}

export const customTalkQuietNoticeStyle: CSSProperties = {
  ...customTalkNoticeStyle,
  backgroundColor: '#f6f9fc',
  border: '1px solid #dce6ed',
  color: '#607389',
}

const quietNoticeMessages = new Set([
  '지금은 바로 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.',
])

export function getCustomTalkNoticeStyle(message: string) {
  return quietNoticeMessages.has(message)
    ? customTalkQuietNoticeStyle
    : customTalkErrorNoticeStyle
}
