import { useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAuthPathByRole, ROUTE_PATHS } from '../../app/router/routePaths'
import {
  backButton,
  card,
  helperText,
  logoText,
  logoWrap,
  pageDesc,
  pageTitle,
  pageWrapper,
  primaryButton,
  roleCard,
  roleCardSelected,
  roleDesc,
  roleGrid,
  roleTitle,
  subtitle,
} from './authPageStyles'
import {
  getStoredEntryMode,
  getStoredRole,
  setStoredEntryMode,
  setStoredRole,
} from '../../services/authService'
import type { AuthEntryMode } from '../../types/auth'

type AuthRole = 'caregiver' | 'patient'

const selectedStyle: CSSProperties = {
  ...roleCard,
  ...roleCardSelected,
}

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const savedMode = getStoredEntryMode()
  const modeParam = searchParams.get('mode')
  const mode: AuthEntryMode =
    modeParam === 'signup' || modeParam === 'login'
      ? modeParam
      : savedMode === 'signup' || savedMode === 'login'
        ? savedMode
        : 'login'

  const [selectedRole, setSelectedRoleState] = useState<AuthRole | null>(() => {
    return getStoredRole()
  })

  const handleSelect = (role: AuthRole) => {
    setSelectedRoleState(role)
    setStoredRole(role)
  }

  const handleContinue = () => {
    if (!selectedRole) {
      return
    }

    setStoredEntryMode(mode)
    navigate(getAuthPathByRole(mode, selectedRole))
  }

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>역할 선택</p>
        </div>

        <h1 style={pageTitle}>이용할 역할을 선택해주세요</h1>
        <p style={pageDesc}>
          {mode === 'login'
            ? '로그인 전에 사용할 역할을 먼저 선택합니다.'
            : '회원가입 전에 사용할 역할을 먼저 선택합니다.'}
        </p>

        <div style={roleGrid}>
          <button
            type="button"
            onClick={() => handleSelect('patient')}
            style={selectedRole === 'patient' ? selectedStyle : roleCard}
          >
            <p style={roleTitle}>환자</p>
            <p style={roleDesc}>팀코드를 확인한 뒤 환자 전용 계정을 생성하거나 로그인합니다.</p>
          </button>

          <button
            type="button"
            onClick={() => handleSelect('caregiver')}
            style={selectedRole === 'caregiver' ? selectedStyle : roleCard}
          >
            <p style={roleTitle}>보호자</p>
            <p style={roleDesc}>환자 연결과 관리 기능을 사용하는 보호자 계정으로 진입합니다.</p>
          </button>
        </div>

        <p style={helperText}>
          현재 선택:{' '}
          {selectedRole === 'patient'
            ? '환자'
            : selectedRole === 'caregiver'
              ? '보호자'
              : '선택 전'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            style={
              !selectedRole
                ? { ...primaryButton, opacity: 0.5, cursor: 'not-allowed' }
                : primaryButton
            }
            onClick={handleContinue}
            disabled={!selectedRole}
          >
            {mode === 'login' ? '로그인 계속하기' : '회원가입 계속하기'}
          </button>

          <button type="button" style={backButton} onClick={() => navigate(ROUTE_PATHS.HOME)}>
            이전으로
          </button>
        </div>
      </div>
    </div>
  )
}
