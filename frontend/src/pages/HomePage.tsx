import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../app/router/routePaths'
import { setStoredEntryMode } from '../services/authStorage'

export default function HomePage() {
  const navigate = useNavigate()

  const moveToRoleSelect = (mode: 'login' | 'signup') => {
    setStoredEntryMode(mode)
    navigate(`${ROUTE_PATHS.AUTH_ROLE}?mode=${mode}`)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f4f9fc 0%, #eef4f7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          backgroundColor: '#ffffff',
          borderRadius: '32px',
          padding: '56px 40px',
          boxShadow: '0 24px 56px rgba(44, 73, 100, 0.12)',
          border: '1px solid #dbe6ee',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            color: '#5f8bb0',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          CARE SERVICE
        </p>

        <h1
          style={{
            margin: '12px 0 16px',
            fontSize: '36px',
            color: '#203042',
            lineHeight: 1.25,
          }}
        >
          시선 추적 기반 의사소통 서비스
        </h1>

        <p
          style={{
            margin: '0 auto 32px',
            maxWidth: '520px',
            color: '#617486',
            fontSize: '17px',
            lineHeight: 1.6,
          }}
        >
          로그인 또는 회원가입을 진행하기 전에
          <br />
          사용할 역할을 먼저 선택해 다음 단계로 이동해주세요.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => moveToRoleSelect('login')}
            style={{
              minWidth: '200px',
              height: '58px',
              borderRadius: '16px',
              border: '1px solid #c9d7e6',
              backgroundColor: '#ffffff',
              color: '#203042',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() => moveToRoleSelect('signup')}
            style={{
              minWidth: '200px',
              height: '58px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#5d8ec7',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}
