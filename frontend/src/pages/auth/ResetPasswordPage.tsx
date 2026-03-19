import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import AuthBrand from './AuthBrand'
import {
  card,
  formStack,
  input,
  pageDesc,
  pageTitle,
  pageWrapper,
  primaryButton,
  textLink,
} from './authPageStyles'

export default function ResetPasswordPage() {
  return (
    <div style={pageWrapper}>
      <div style={card}>
        <AuthBrand subtitleText="비밀번호 재설정" />

        <h1 style={pageTitle}>비밀번호 재설정</h1>
        <p style={pageDesc}>
          기본 UI만 제공하는 화면입니다. 실제 재설정 요청 API는 아직 연결되지 않았습니다.
        </p>

        <div style={formStack}>
          <input type="text" placeholder="아이디 또는 이메일" style={input} />
          <button type="button" style={primaryButton}>
            재설정 요청
          </button>
        </div>

        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <Link to={ROUTE_PATHS.AUTH_LOGIN} style={textLink}>
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
