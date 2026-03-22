import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../features/auth/hooks/useAuth'

const PATIENT_SETTINGS = [
  {
    icon: '👤',
    label: '환자 기본 정보',
    sub: '이름 · 생년월일 · 성별',
    path: ROUTE_PATHS.CARE_SETTINGS_PATIENT_INFO,
  },
  {
    icon: '🗓️',
    label: '루틴 관리',
    sub: '시간대별 활동',
    path: ROUTE_PATHS.CARE_SETTINGS_ROUTINE,
  },
  {
    icon: '⭐',
    label: '표현 즐겨찾기',
    sub: '카테고리별 설정',
    path: ROUTE_PATHS.CARE_SETTINGS_FAVORITES,
  },
  {
    icon: '📋',
    label: '맞춤 표현 조회',
    sub: '환자 개인화 표현',
    path: ROUTE_PATHS.CARE_SETTINGS_EXPRESSIONS,
  },
  {
    icon: '🎬',
    label: '여가 콘텐츠',
    sub: '유튜브 설정',
    path: ROUTE_PATHS.CARE_SETTINGS_LEISURE,
  },
  {
    icon: '🔧',
    label: '기기 설정',
    sub: 'Dwell Time · 입력 잠금',
    path: ROUTE_PATHS.CARE_SETTINGS_DEVICE,
  },
  {
    icon: '🎙️',
    label: '맞춤 음성 (TTS)',
    sub: '음성 파일 관리',
    path: ROUTE_PATHS.CARE_SETTINGS_TTS,
  },
] as const

const MY_PROFILE_SETTINGS = [
  {
    icon: '👤',
    label: '계정 정보',
    sub: '이름 · 연락처',
    path: ROUTE_PATHS.CARE_SETTINGS, // TODO: 계정 정보 라우트 연결
  },
  {
    icon: '🔔',
    label: '알림 설정',
    sub: '호출 · SOS · 채팅 알림',
    path: ROUTE_PATHS.CARE_SETTINGS, // TODO: 알림 설정 라우트 연결
  },
] as const

interface SettingItemProps {
  icon: string
  label: string
  sub: string
  onClick: () => void
}

function SettingItem({ icon, label, sub, onClick }: SettingItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-[14px] border-b border-[#F0F4F8] text-left min-h-[44px] active:bg-[#F8FAFC] transition-colors"
    >
      <div className="w-9 h-9 rounded-[10px] bg-[#F0F4F8] flex items-center justify-center text-[16px] flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#1A202C]">{label}</p>
        <p className="text-[11px] text-[#718096] mt-0.5">{sub}</p>
      </div>
      <span className="text-[#A0AEC0] text-[14px]">›</span>
    </button>
  )
}

export default function CareSettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0">
        <span className="text-[17px] font-bold text-[#3D405B]">설정</span>
      </header>

      <main className="flex-1 overflow-y-auto px-[18px] pb-6">
        <p className="text-[12px] font-bold text-[#2D3748] mt-4 mb-1">환자 설정</p>
        <div>
          {PATIENT_SETTINGS.map(item => (
            <SettingItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              sub={item.sub}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>

        <p className="text-[12px] font-bold text-[#2D3748] mt-6 mb-1">내 프로필</p>
        <div>
          {MY_PROFILE_SETTINGS.map(item => (
            <SettingItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              sub={item.sub}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-6 py-[14px] rounded-[12px] bg-[#F0F4F8] text-[14px] font-bold text-[#E53E3E] min-h-[44px] active:bg-[#E2E8F0] transition-colors"
        >
          로그아웃
        </button>
      </main>
    </div>
  )
}
