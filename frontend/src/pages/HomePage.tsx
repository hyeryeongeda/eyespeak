import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../app/router/routePaths';

export default function HomePage() {
  const navigate = useNavigate();

  const moveToRoleSelect = (mode: 'login' | 'signup') => {
    navigate(`${ROUTE_PATHS.AUTH_ROLE}?mode=${mode}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fbff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          padding: '48px 40px',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e5edf5',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            color: '#5b8fd9',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          CARE SERVICE
        </p>

        <h1
          style={{
            margin: '12px 0 16px',
            fontSize: '36px',
            color: '#203042',
          }}
        >
          안구 추적 기반 의사소통 서비스
        </h1>

        <p
          style={{
            margin: '0 auto 32px',
            maxWidth: '480px',
            color: '#607080',
            fontSize: '16px',
            lineHeight: 1.6,
          }}
        >
          로그인 또는 회원가입을 진행하기 전에
          <br />
          사용자 역할을 선택하여 다음 단계로 이동합니다.
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
              minWidth: '180px',
              height: '52px',
              borderRadius: '14px',
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
              minWidth: '180px',
              height: '52px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#5b8fd9',
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
  );
}