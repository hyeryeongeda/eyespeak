import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { useAuth } from '../../features/auth/hooks/useAuth'
import eyespeakLogo from '../../assets/eyespeak_logo.svg'

const TODAY_LOG = [
  { time: '14:20', text: '불을 꺼주세요' },
  { time: '13:45', text: '배가 고파요' },
  { time: '13:10', text: '물 마시고 싶어요' },
  { time: '11:30', text: '도와주세요' },
  { time: '10:15', text: '불편해요' },
  { time: '09:40', text: '고마워요' },
]

export default function CareHomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const patientName = user?.name ?? '환자'
  const initials = patientName.slice(0, 2)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 상단 헤더 */}
      <header className="flex items-center px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0">
        <img src={eyespeakLogo} alt="eyespeak" className="h-[22px]" />
      </header>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-[18px] pb-4">
        {/* 프로필 + 오늘 요약 통합 카드 */}
        <div className="bg-[#3D405B] rounded-[20px] p-4 mt-[14px]">
          <div className="flex items-center gap-[14px]">
            <div className="w-12 h-12 rounded-[14px] bg-[#D9E6F2] flex items-center justify-center text-[15px] font-bold text-[#3D405B] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-white leading-tight">
                {patientName} 환자
              </p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#48BB78] flex-shrink-0" />
          </div>
          <div className="border-t border-white/20 mt-3 pt-3 flex items-baseline justify-between">
            <div>
              <p className="text-[13px] text-white/70">오늘 표현</p>
              <p className="text-[26px] font-extrabold text-white leading-tight">24회</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/60">최근</p>
              <p className="text-[13px] text-white font-semibold">"불을 꺼주세요"</p>
              <p className="text-[11px] text-white/50">10분 전</p>
            </div>
          </div>
        </div>

        {/* 채팅 진입 버튼 */}
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_CHAT)}
          className="w-full flex items-center gap-3 bg-white border-2 border-[#3D405B] rounded-[16px] p-4 mt-3 text-left min-h-[44px] active:bg-[#F0F4F8] transition-colors"
        >
          <span className="text-[28px]">💬</span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#3D405B]">채팅하기</p>
            <p className="text-[13px] text-[#718096] mt-0.5">환자와 실시간 대화</p>
          </div>
          <span className="text-[#3D405B] text-[18px] font-bold">›</span>
        </button>

        {/* 오늘의 소통 기록 */}
        <p className="text-[14px] font-bold text-[#2D3748] mt-4 mb-2">오늘의 소통</p>
        <div className="flex flex-col gap-[6px]">
          {TODAY_LOG.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-3 py-[10px] bg-[#F8FAFC] border border-[#E8EDF2] rounded-[10px]"
            >
              <span className="text-[13px] text-[#A0AEC0] font-semibold w-[40px] flex-shrink-0">
                {item.time}
              </span>
              <span className="text-[15px] text-[#1A202C]">{item.text}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_RECORD)}
          className="w-full text-center text-[12px] text-[#718096] font-semibold py-3 min-h-[44px]"
        >
          전체 기록 보기 ›
        </button>
      </main>
    </div>
  )
}
