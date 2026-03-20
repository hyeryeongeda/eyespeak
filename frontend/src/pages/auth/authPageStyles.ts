import type { CSSProperties } from 'react'

export const pageWrapper: CSSProperties = {
  height: '100%',
  overflowY: 'auto',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
}

export const card: CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  padding: '32px 28px',
  boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
  border: '1px solid #dde7ed',
}

export const logoWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '20px',
}

export const logoImage: CSSProperties = {
  display: 'block',
  width: '176px',
  maxWidth: '100%',
  height: 'auto',
}

export const logoText: CSSProperties = {
  margin: 0,
  fontSize: '28px',
  fontWeight: 800,
  color: '#203042',
  letterSpacing: '-0.02em',
}

export const subtitle: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: '#7c8b99',
  textAlign: 'center',
}

export const pageTitle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: '24px',
  fontWeight: 700,
  color: '#203042',
  textAlign: 'center',
}

export const pageDesc: CSSProperties = {
  margin: '0 0 20px',
  fontSize: '14px',
  color: '#708191',
  textAlign: 'center',
  lineHeight: 1.5,
}

export const formStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

export const input: CSSProperties = {
  width: '100%',
  height: '52px',
  borderRadius: '14px',
  border: '1px solid #d4dfe7',
  padding: '0 16px',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
}

export const primaryButton: CSSProperties = {
  width: '100%',
  height: '54px',
  borderRadius: '14px',
  border: 'none',
  backgroundColor: '#5d8ec7',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
}

export const secondaryButton: CSSProperties = {
  width: '100%',
  height: '54px',
  borderRadius: '14px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#f7fafc',
  color: '#203042',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
}

export const buttonStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

export const linkRow: CSSProperties = {
  marginTop: '18px',
  display: 'flex',
  justifyContent: 'center',
  gap: '14px',
  flexWrap: 'wrap',
  fontSize: '13px',
}

export const textLink: CSSProperties = {
  color: '#6f8090',
  textDecoration: 'none',
}

export const roleGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
  marginBottom: '18px',
}

export const roleCard: CSSProperties = {
  minHeight: '172px',
  border: '1px solid #d4dfe7',
  borderRadius: '18px',
  padding: '20px 16px',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  textAlign: 'center',
}

export const roleCardSelected: CSSProperties = {
  border: '2px solid #8ab6de',
  backgroundColor: '#f2f8fd',
}

export const roleTitle: CSSProperties = {
  margin: '6px 0 8px',
  fontSize: '18px',
  fontWeight: 700,
  color: '#203042',
}

export const roleDesc: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: '#708191',
  lineHeight: 1.55,
}

export const helperText: CSSProperties = {
  margin: '0 0 16px',
  fontSize: '13px',
  color: '#708191',
  textAlign: 'center',
}

export const backButton: CSSProperties = {
  width: '100%',
  height: '48px',
  borderRadius: '14px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#ffffff',
  color: '#203042',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

export const successBox: CSSProperties = {
  borderRadius: '16px',
  backgroundColor: '#f2f9f3',
  border: '1px solid #cfe5d1',
  padding: '16px',
  textAlign: 'center',
  marginBottom: '16px',
}

export const teamCodeBox: CSSProperties = {
  borderRadius: '16px',
  backgroundColor: '#f6fbff',
  border: '1px solid #d7e6ef',
  padding: '16px',
  textAlign: 'left',
  marginBottom: '16px',
}

export const infoBox: CSSProperties = {
  borderRadius: '16px',
  backgroundColor: '#f5f9fc',
  border: '1px solid #dce6ee',
  padding: '16px',
  marginBottom: '16px',
}

export const errorMessage: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: '14px',
  backgroundColor: '#fff3f3',
  border: '1px solid #efc8c8',
  color: '#b14b4b',
  fontSize: '13px',
  lineHeight: 1.5,
}

export const successMessage: CSSProperties = {
  margin: 0,
  padding: '12px 14px',
  borderRadius: '14px',
  backgroundColor: '#eff9f0',
  border: '1px solid #cfe5d1',
  color: '#36734a',
  fontSize: '13px',
  lineHeight: 1.5,
}

export const progressRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '8px',
  marginBottom: '18px',
}

export const progressStep: CSSProperties = {
  borderRadius: '14px',
  border: '1px solid #dbe4ec',
  backgroundColor: '#f7fafc',
  padding: '10px 8px',
  textAlign: 'center',
}

export const progressStepActive: CSSProperties = {
  borderColor: '#9ec3e4',
  backgroundColor: '#eef6fd',
}

export const progressStepDone: CSSProperties = {
  borderColor: '#b8d7c0',
  backgroundColor: '#f2f9f3',
}

export const sectionTitle: CSSProperties = {
  margin: '0 0 6px',
  color: '#203042',
  fontSize: '16px',
  fontWeight: 700,
}

export const sectionDesc: CSSProperties = {
  margin: '0 0 16px',
  color: '#708191',
  fontSize: '13px',
  lineHeight: 1.55,
}

export const choiceGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
}

export const choiceButton: CSSProperties = {
  minHeight: '52px',
  borderRadius: '14px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#ffffff',
  color: '#203042',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
}

export const choiceButtonSelected: CSSProperties = {
  border: '2px solid #8ab6de',
  backgroundColor: '#f2f8fd',
}

export const routineSection: CSSProperties = {
  borderRadius: '18px',
  border: '1px solid #dce6ee',
  backgroundColor: '#f7fafc',
  padding: '16px',
}

export const tagWrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
}

export const tagButton: CSSProperties = {
  minHeight: '38px',
  padding: '8px 12px',
  borderRadius: '999px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#ffffff',
  color: '#4b6073',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

export const tagButtonSelected: CSSProperties = {
  border: '1px solid #8ab6de',
  backgroundColor: '#eaf4fd',
  color: '#2f5d84',
}

export const buttonRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
}

export const summaryBox: CSSProperties = {
  borderRadius: '16px',
  backgroundColor: '#f8fbfd',
  border: '1px solid #dce6ee',
  padding: '16px',
}

export const teamCodeValue: CSSProperties = {
  margin: '0 0 12px',
  color: '#203042',
  fontSize: '28px',
  fontWeight: 800,
  letterSpacing: '0.06em',
}
