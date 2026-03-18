import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'

const wrap: CSSProperties = {
  minHeight: '100dvh',
  padding: '20px',
  background: 'linear-gradient(180deg, #f3f8fb 0%, #ecf3f6 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
}
const title: CSSProperties = { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#203042' }
const backBtn: CSSProperties = {
  padding: '12px 24px',
  borderRadius: '14px',
  border: '1px solid #d4dfe7',
  backgroundColor: '#ffffff',
  color: '#203042',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

export default function CustomTalkDirectionPage() {
  const navigate = useNavigate()
  return (
    <div style={wrap}>
      <h1 style={title}>맞춤대화 (PAT-CUSTOM-001)</h1>
      <button type="button" style={backBtn} onClick={() => navigate(ROUTE_PATHS.PATIENT_TALK_MAIN)}>
        대화하기로 돌아가기
      </button>
    </div>
  )
}
