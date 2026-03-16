import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/routePaths';
import {
  card,
  formStack,
  helperText,
  input,
  linkRow,
  logoText,
  logoWrap,
  pageDesc,
  pageTitle,
  pageWrapper,
  primaryButton,
  secondaryButton,
  subtitle,
  successBox,
  teamCodeBox,
  textLink,
} from './authPageStyles';

const STORAGE_KEY = 'selectedRole';
const TEAM_CODE_KEY = 'verifiedTeamCode';

export default function SignupPage() {
  const navigate = useNavigate();
  const selectedRole = sessionStorage.getItem(STORAGE_KEY);

  const [teamCode, setTeamCode] = useState(sessionStorage.getItem(TEAM_CODE_KEY) ?? '');
  const [isVerified, setIsVerified] = useState(Boolean(sessionStorage.getItem(TEAM_CODE_KEY)));

  const handleVerifyTeamCode = () => {
    if (!teamCode.trim()) return;

    sessionStorage.setItem(TEAM_CODE_KEY, teamCode.trim());
    setIsVerified(true);
  };

  const handleResetTeamCode = () => {
    sessionStorage.removeItem(TEAM_CODE_KEY);
    setTeamCode('');
    setIsVerified(false);
  };

  if (selectedRole !== 'caregiver' && selectedRole !== 'patient') {
    return (
      <div style={pageWrapper}>
        <div style={card}>
          <div style={logoWrap}>
            <p style={logoText}>eyespeak</p>
            <p style={subtitle}>회원가입</p>
          </div>

          <h1 style={pageTitle}>역할 선택이 필요합니다</h1>
          <p style={pageDesc}>회원가입 전에 사용자 유형을 먼저 선택해주세요.</p>

          <button
            type="button"
            style={primaryButton}
            onClick={() => navigate(`${ROUTE_PATHS.AUTH_ROLE}?mode=signup`)}
          >
            역할 선택하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoWrap}>
          <p style={logoText}>eyespeak</p>
          <p style={subtitle}>회원가입</p>
        </div>

        {selectedRole === 'caregiver' ? (
          <>
            <h1 style={pageTitle}>보호자 회원가입</h1>
            <p style={pageDesc}>보호자 계정을 생성합니다.</p>

            <div style={formStack}>
              <input type="text" placeholder="이름" style={input} />
              <input type="text" placeholder="이메일" style={input} />
              <input type="text" placeholder="아이디" style={input} />
              <input type="password" placeholder="비밀번호" style={input} />
              <input type="password" placeholder="비밀번호 확인" style={input} />

              <button type="button" style={primaryButton}>
                회원가입
              </button>
            </div>
          </>
        ) : (
          <>
            {!isVerified ? (
              <>
                <h1 style={pageTitle}>환자 팀코드 인증</h1>
                <p style={pageDesc}>보호자가 발급한 팀코드를 먼저 입력해주세요.</p>

                <div style={teamCodeBox}>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#202939', fontWeight: 700 }}>
                    팀코드 입력
                  </p>
                  <input
                    type="text"
                    placeholder="예: CARE-1234"
                    style={input}
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                  />
                </div>

                <div style={formStack}>
                  <button type="button" style={primaryButton} onClick={handleVerifyTeamCode}>
                    팀코드 확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 style={pageTitle}>환자 계정 생성</h1>
                <p style={pageDesc}>인증된 팀코드로 환자 계정을 생성합니다.</p>

                <div style={successBox}>
                  <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#7b8696' }}>
                    인증된 팀코드
                  </p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2f3556' }}>
                    {teamCode}
                  </p>
                </div>

                <div style={formStack}>
                  <input type="text" placeholder="이름" style={input} />
                  <input type="text" placeholder="아이디" style={input} />
                  <input type="password" placeholder="비밀번호" style={input} />
                  <input type="password" placeholder="비밀번호 확인" style={input} />

                  <button type="button" style={primaryButton}>
                    계정 생성
                  </button>

                  <button type="button" style={secondaryButton} onClick={handleResetTeamCode}>
                    팀코드 다시 입력
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <p style={helperText}>
          현재 역할: {selectedRole === 'caregiver' ? '보호자' : '환자'}
        </p>

        <div style={linkRow}>
          <Link to={ROUTE_PATHS.AUTH_LOGIN} style={textLink}>
            로그인
          </Link>
          <Link to={`${ROUTE_PATHS.AUTH_ROLE}?mode=signup`} style={textLink}>
            역할 다시 선택
          </Link>
        </div>
      </div>
    </div>
  );
}