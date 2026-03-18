import { useNavigate } from 'react-router-dom'
import { CARE_ROUTE_PATHS, ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../hooks/useAuth'

const MENU_ITEMS = [
  {
    icon: '💬',
    label: '실시간 채팅',
    sub: '환자와의 대화',
    path: CARE_ROUTE_PATHS.CARE_CHAT,
  },
  {
    icon: '📊',
    label: '소통 통계',
    sub: '기록 및 빈도',
    path: null,
  },
  {
    icon: '⚙️',
    label: '기기 설정',
    sub: 'Dwell Time 등',
    path: null,
  },
  {
    icon: '🎙️',
    label: '음성 관리',
    sub: '맞춤 TTS 설정',
    path: CARE_ROUTE_PATHS.CARE_VOICE,
  },
]

const TOP_PHRASES = [
  { rank: 1, text: '불편해요', count: '8회' },
  { rank: 2, text: '물 마시고 싶어요', count: '5회' },
  { rank: 3, text: '불을 꺼주세요', count: '4회' },
  { rank: 4, text: '도와주세요', count: '4회' },
  { rank: 5, text: '배가 고파요', count: '3회' },
]

export default function CareHomePage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME, { replace: true })
  }

  const initials = user?.name ? user.name.slice(0, 2) : 'EY'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FEFEFE]">
      {/* 상단 헤더 */}
      <header className="flex items-center px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] sticky top-0 z-10">
        <span className="text-[17px] font-bold text-[#3D405B] tracking-tight">eyespeak</span>
        <button
          type="button"
          onClick={handleLogout}
          className="ml-auto text-[12px] font-semibold text-[#A0AEC0] min-h-[44px] px-2"
        >
          로그아웃
        </button>
      </header>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-[18px] pb-6">
        {/* 프로필 카드 */}
        <div className="flex items-center gap-[14px] bg-[#F0F4F8] rounded-[20px] p-4 mt-[14px]">
          <div className="w-12 h-12 rounded-[14px] bg-[#D9E6F2] flex items-center justify-center text-[15px] font-bold text-[#3D405B] flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1A202C] leading-tight">
              {user?.name ?? '환자'} 환자
            </p>
            <p className="text-[12px] text-[#718096] mt-0.5">ALS · 상태: 안정</p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#48BB78] flex-shrink-0" />
        </div>

        {/* 서비스 메뉴 */}
        <p className="text-[12px] font-bold text-[#2D3748] mt-[14px] mb-2">서비스 메뉴</p>
        <div className="grid grid-cols-2 gap-[10px]">
          {MENU_ITEMS.map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => item.path && navigate(item.path)}
              disabled={!item.path}
              className="bg-white border border-[#E8EDF2] rounded-[12px] p-3 text-left min-h-[44px] active:border-[#3D405B] transition-colors disabled:opacity-40"
            >
              <p className="text-[20px] mb-1">{item.icon}</p>
              <p className="text-[13px] font-bold text-[#1A202C]">{item.label}</p>
              <p className="text-[11px] text-[#718096] mt-0.5">{item.sub}</p>
            </button>
          ))}
        </div>

        {/* 오늘의 요약 */}
        <p className="text-[12px] font-bold text-[#2D3748] mt-[14px] mb-2">오늘의 요약</p>
        <div className="bg-[#3D405B] text-white rounded-[12px] p-4">
          <p className="text-[12px] opacity-80">총 의사표현 횟수</p>
          <p className="text-[26px] font-extrabold my-1">24회</p>
          <p className="text-[11px] border-t border-white/20 pt-2 mt-2 opacity-90">
            최근 표현: "불을 꺼주세요" (10분 전)
          </p>
        </div>

        {/* 자주 쓰는 표현 TOP 5 */}
        <p className="text-[12px] font-bold text-[#2D3748] mt-[14px] mb-2">자주 사용한 표현 TOP 5</p>
        <div className="flex flex-col gap-[7px]">
          {TOP_PHRASES.map(item => (
            <div
              key={item.rank}
              className="flex items-center gap-[10px] px-3 py-[11px] bg-[#F0F4F8] rounded-[10px]"
            >
              <span className="text-[13px] font-bold text-[#3D405B] w-[18px]">{item.rank}</span>
              <span className="flex-1 text-[13px] text-[#1A202C]">{item.text}</span>
              <span className="text-[12px] text-[#718096]">{item.count}</span>
            </div>
          ))}
        </div>
      </main>

      {/* 하단 네비게이션 */}
      <nav className="flex border-t border-[#F0F4F8] pt-2 pb-[18px] bg-[#FEFEFE] flex-shrink-0">
        <div className="flex-1 flex flex-col items-center text-[#3D405B]">
          <span className="text-[18px]">🏠</span>
          <span className="text-[10px] font-semibold mt-0.5">홈</span>
        </div>
        <button
          type="button"
          onClick={() => navigate(CARE_ROUTE_PATHS.CARE_CHAT)}
          className="flex-1 flex flex-col items-center text-[#A0AEC0] min-h-[44px]"
        >
          <span className="text-[18px]">💬</span>
          <span className="text-[10px] font-semibold mt-0.5">채팅</span>
        </button>
        <button type="button" disabled className="flex-1 flex flex-col items-center text-[#A0AEC0] min-h-[44px] disabled:opacity-40">
          <span className="text-[18px]">📊</span>
          <span className="text-[10px] font-semibold mt-0.5">기록</span>
        </button>
        <button type="button" disabled className="flex-1 flex flex-col items-center text-[#A0AEC0] min-h-[44px] disabled:opacity-40">
          <span className="text-[18px]">⚙️</span>
          <span className="text-[10px] font-semibold mt-0.5">설정</span>
        </button>
      </nav>
    </div>
  )
}
