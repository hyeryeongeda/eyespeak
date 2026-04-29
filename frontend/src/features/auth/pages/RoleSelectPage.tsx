import { useState, type CSSProperties } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { resolveAuthEntryRoute } from '../authRedirect'
import {
  getStoredEntryMode,
  getStoredRole,
  setStoredEntryMode,
  setStoredRole,
} from '../../../services/authStorage'
import type { AuthEntryMode, UserRole } from '../../../types/auth'
import AuthBrand from '../components/AuthBrand'
import {
  backButton,
  card,
  helperText,
  pageDesc,
  pageTitle,
  primaryButton,
  roleCard,
  roleCardSelected,
  roleDesc,
  roleGrid,
  roleTitle,
} from '../ui/authPageStyles'
import AuthPageFrame from '../components/AuthPageFrame'

const selectedStyle: CSSProperties = {
  ...roleCard,
  ...roleCardSelected,
}

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const savedMode = getStoredEntryMode()
  const modeParam = searchParams.get('mode')
  const mode: AuthEntryMode =
    modeParam === 'signup' || modeParam === 'login'
      ? modeParam
      : savedMode === 'signup' || savedMode === 'login'
        ? savedMode
        : 'login'

  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(() => {
    return getStoredRole()
  })

  const handleSelect = (role: UserRole) => {
    setSelectedRoleState(role)
    setStoredRole(role)
  }

  const handleContinue = () => {
    if (!selectedRole) {
      return
    }

    setStoredEntryMode(mode)
    const authEntryRoute = resolveAuthEntryRoute(mode, selectedRole, location.state)
    navigate(authEntryRoute.path, { replace: true, state: authEntryRoute.state })
  }

  return (
    <AuthPageFrame>
      <div style={card}>
        <AuthBrand subtitleText="역할 선택" />

        <h1 style={pageTitle}>이용할 역할을 선택해주세요</h1>
        <p style={pageDesc}>
          {mode === 'login'
            ? '로그인에 사용할 역할을 먼저 선택합니다.'
            : '회원가입에 사용할 역할을 먼저 선택합니다.'}
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
            onClick={() => handleSelect('guardian')}
            style={selectedRole === 'guardian' ? selectedStyle : roleCard}
          >
            <p style={roleTitle}>보호자</p>
            <p style={roleDesc}>환자 연결과 관리 기능을 사용하는 보호자 계정으로 진입합니다.</p>
          </button>
        </div>

        <p style={helperText}>
          현재 선택:{' '}
          {selectedRole === 'patient'
            ? '환자'
            : selectedRole === 'guardian'
              ? '보호자'
              : '선택 없음'}
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

          <button
            type="button"
            style={backButton}
            onClick={() => navigate(ROUTE_PATHS.HOME, { replace: true })}
          >
            이전으로
          </button>
        </div>
      </div>
    </AuthPageFrame>
  )
}
