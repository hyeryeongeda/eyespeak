import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'

export default function ChatPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_HOME)}
          className="text-[20px] text-[#3D405B] min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          ‹
        </button>
        <span className="text-[17px] font-bold text-[#3D405B]">채팅</span>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[14px] text-[#A0AEC0]">채팅 화면 준비 중</p>
      </div>
    </div>
  )
}