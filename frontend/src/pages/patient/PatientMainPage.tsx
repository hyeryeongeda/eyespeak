import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'

export default function PatientMainPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        background: 'linear-gradient(180deg, #f4f9fc 0%, #edf4f8 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          padding: '40px 32px',
          border: '1px solid #dbe5ec',
          boxShadow: '0 20px 48px rgba(40, 66, 90, 0.12)',
        }}
      >
        <p style={{ margin: 0, color: '#5f8bb0', fontWeight: 700, fontSize: '14px' }}>
          PATIENT MODE
        </p>
        <h1 style={{ margin: '12px 0 14px', color: '#203042', fontSize: '32px' }}>환자 메인</h1>
        <p style={{ margin: '0 0 20px', color: '#6d7f8f', lineHeight: 1.6 }}>
          목업 로그인이 정상적으로 완료되었습니다. 이후 환자 메인 기능은 이 페이지에서 이어서
          연결하면 됩니다.
        </p>

        <div
          style={{
            borderRadius: '18px',
            padding: '18px 20px',
            backgroundColor: '#f5f9fc',
            border: '1px solid #dce6ee',
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '0 0 8px', color: '#203042', fontWeight: 700 }}>현재 세션</p>
          <p style={{ margin: '0 0 6px', color: '#6d7f8f' }}>아이디: {user?.id ?? '-'}</p>
          <p style={{ margin: 0, color: '#6d7f8f' }}>이름: {user?.name ?? '-'}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            height: '54px',
            border: 'none',
            borderRadius: '16px',
            backgroundColor: '#5d8ec7',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
