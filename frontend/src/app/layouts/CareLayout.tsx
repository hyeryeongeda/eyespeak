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
    <div className="flex flex-col bg-[#FEFEFE] overflow-hidden h-full">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      <nav className="flex border-t border-[#F0F4F8] pt-2 pb-3 bg-[#FEFEFE] flex-shrink-0">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.path
            || (item.path === ROUTE_PATHS.CARE_SETTINGS && pathname.startsWith('/care/settings'))

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center min-h-[52px] justify-center ${
                isActive ? 'text-[#3D405B]' : 'text-[#A0AEC0]'
              }`}
            >
              <span className="text-[22px]">{item.icon}</span>
              <span className="text-[13px] font-bold mt-1">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}