import { useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/routePaths';
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
} from './authPageStyles';

type AuthRole = 'caregiver' | 'patient';

const STORAGE_KEY = 'selectedRole';

const selectedStyle: CSSProperties = {
  ...roleCard,
  ...roleCardSelected,
};

export default function RoleSelectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved === 'caregiver' || saved === 'patient' ? saved : null;
  });

  const handleSelect = (role: AuthRole) => {
    setSelectedRole(role);
    sessionStorage.setItem(STORAGE_KEY, role);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    if (mode === 'login') {
      navigate(ROUTE_PATHS.AUTH_LOGIN);
      return;
    }

    navigate(ROUTE_PATHS.AUTH_SIGNUP);
  };

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>가입 유형 선택</p>
        </div>

        <h1 style={pageTitle}>사용자 유형을 선택해주세요</h1>
        <p style={pageDesc}>
          {mode === 'login' ? '로그인' : '회원가입'} 전에 현재 역할을 먼저 선택합니다.
        </p>

        <div style={roleGrid}>
          <button
            type="button"
            onClick={() => handleSelect('patient')}
            style={selectedRole === 'patient' ? selectedStyle : roleCard}
          >
            <p style={roleTitle}>환자</p>
            <p style={roleDesc}>
              팀코드 인증 후
              <br />
              서비스를 이용합니다
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelect('caregiver')}
            style={selectedRole === 'caregiver' ? selectedStyle : roleCard}
          >
            <p style={roleTitle}>보호자</p>
            <p style={roleDesc}>
              환자 연결 및
              <br />
              관리 기능을 사용합니다
            </p>
          </button>
        </div>

        <p style={helperText}>
          현재 선택: {selectedRole === 'patient' ? '환자' : selectedRole === 'caregiver' ? '보호자' : '선택 전'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" style={primaryButton} onClick={handleContinue} disabled={!selectedRole}>
            {mode === 'login' ? '로그인 계속' : '회원가입 계속'}
          </button>

          <button type="button" style={backButton} onClick={() => navigate(ROUTE_PATHS.HOME)}>
            이전
          </button>
        </div>
      </div>
    </div>
  );
}