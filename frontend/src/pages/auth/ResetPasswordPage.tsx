import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../app/router/routePaths';

export default function ResetPasswordPage() {
  return (
    <div style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
      <h1>비밀번호 재설정</h1>

      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        <input
          type="text"
          placeholder="아이디 또는 이메일"
          style={{ height: '44px', padding: '0 12px' }}
        />
        <button type="button" style={{ height: '44px' }}>
          재설정 요청
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Link to={ROUTE_PATHS.AUTH_LOGIN}>로그인으로 돌아가기</Link>
      </div>
    </div>
  );
}