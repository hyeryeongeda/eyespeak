import type { CSSProperties } from 'react';

export const pageWrapper: CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#eef2f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
};

export const card: CSSProperties = {
  width: '100%',
  maxWidth: '360px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '24px 20px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  border: '1px solid #e5eaf0',
};

export const logoWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '20px',
};

export const logoText: CSSProperties = {
  margin: 0,
  fontSize: '28px',
  fontWeight: 800,
  color: '#202939',
  letterSpacing: '-0.02em',
};

export const subtitle: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  color: '#7b8696',
  textAlign: 'center',
};

export const pageTitle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: '20px',
  fontWeight: 700,
  color: '#202939',
  textAlign: 'center',
};

export const pageDesc: CSSProperties = {
  margin: '0 0 18px',
  fontSize: '13px',
  color: '#7b8696',
  textAlign: 'center',
  lineHeight: 1.5,
};

export const formStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

export const input: CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: '1px solid #d6dde7',
  padding: '0 14px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
};

export const primaryButton: CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#2f3556',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
};

export const secondaryButton: CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: '1px solid #d6dde7',
  backgroundColor: '#f7f8fb',
  color: '#202939',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
};

export const buttonStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

export const linkRow: CSSProperties = {
  marginTop: '14px',
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  fontSize: '12px',
};

export const textLink: CSSProperties = {
  color: '#7b8696',
  textDecoration: 'none',
};

export const roleGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
  marginBottom: '16px',
};

export const roleCard: CSSProperties = {
  border: '1px solid #d6dde7',
  borderRadius: '12px',
  padding: '14px',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  textAlign: 'center',
};

export const roleCardSelected: CSSProperties = {
  border: '2px solid #8bb8ff',
  backgroundColor: '#f3f8ff',
};

export const roleTitle: CSSProperties = {
  margin: '6px 0 4px',
  fontSize: '14px',
  fontWeight: 700,
  color: '#202939',
};

export const roleDesc: CSSProperties = {
  margin: 0,
  fontSize: '11px',
  color: '#7b8696',
  lineHeight: 1.4,
};

export const helperText: CSSProperties = {
  margin: '0 0 14px',
  fontSize: '12px',
  color: '#7b8696',
  textAlign: 'center',
};

export const backButton: CSSProperties = {
  width: '100%',
  height: '40px',
  borderRadius: '10px',
  border: '1px solid #d6dde7',
  backgroundColor: '#ffffff',
  color: '#202939',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

export const successBox: CSSProperties = {
  borderRadius: '12px',
  backgroundColor: '#f6f8fc',
  border: '1px solid #dde4ee',
  padding: '16px',
  textAlign: 'center',
  marginBottom: '14px',
};

export const teamCodeBox: CSSProperties = {
  borderRadius: '12px',
  backgroundColor: '#f9fbff',
  border: '1px solid #dbe6f8',
  padding: '14px',
  textAlign: 'center',
  marginBottom: '14px',
};