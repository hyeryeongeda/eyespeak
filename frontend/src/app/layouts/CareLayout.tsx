import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../router/routePaths'

const NAV_ITEMS = [
  { icon: '🏠', label: '홈', path: ROUTE_PATHS.CARE_HOME },
  { icon: '💬', label: '채팅', path: ROUTE_PATHS.CARE_CHAT },
  { icon: '📊', label: '기록', path: ROUTE_PATHS.CARE_RECORD },
  { icon: '⚙️', label: '설정', path: ROUTE_PATHS.CARE_SETTINGS },
] as const

export default function CareLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FEFEFE]">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      <nav className="flex border-t border-[#F0F4F8] pt-2 pb-[18px] bg-[#FEFEFE] flex-shrink-0">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.path

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center min-h-[44px] ${
                isActive ? 'text-[#3D405B]' : 'text-[#A0AEC0]'
              }`}
            >
              <span className="text-[18px]">{item.icon}</span>
              <span className="text-[10px] font-semibold mt-0.5">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
