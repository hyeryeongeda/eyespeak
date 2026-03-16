import { Link, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/routePaths';
import {
  card,
  formStack,
  input,
  linkRow,
  logoText,
  logoWrap,
  pageDesc,
  pageTitle,
  pageWrapper,
  primaryButton,
  subtitle,
  textLink,
} from './authPageStyles';

const STORAGE_KEY = 'selectedRole';

export default function LoginPage() {
  const navigate = useNavigate();
  const selectedRole = sessionStorage.getItem(STORAGE_KEY);

  const roleLabel =
    selectedRole === 'caregiver'
      ? '보호자'
      : selectedRole === 'patient'
      ? '환자'
      : '선택 안 됨';

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>로그인</p>
        </div>

        <h1 style={pageTitle}>로그인</h1>
        <p style={pageDesc}>현재 선택 역할: {roleLabel}</p>

        <div style={formStack}>
          <input type="text" placeholder="아이디 또는 이메일" style={input} />
          <input type="password" placeholder="비밀번호" style={input} />

          <button type="button" style={primaryButton}>
            로그인
          </button>
        </div>

        <div style={linkRow}>
          <Link to={ROUTE_PATHS.AUTH_RESET_PASSWORD} style={textLink}>
            비밀번호 재설정
          </Link>
          <Link to={ROUTE_PATHS.AUTH_ROLE} style={textLink}>
            역할 다시 선택
          </Link>
          <button
            type="button"
            onClick={() => navigate(ROUTE_PATHS.HOME)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#7b8696',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}