import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../../app/router/routePaths'

interface CareSettingLayoutProps {
  title: string
  children: React.ReactNode
}

export default function CareSettingLayout({ title, children }: CareSettingLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="px-[18px] py-3 border-b border-[#E2E8F0] bg-[#FEFEFE] flex-shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTE_PATHS.CARE_SETTINGS)}
          className="text-[20px] text-[#3D405B] min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          ‹
        </button>
        <span className="text-[17px] font-bold text-[#3D405B]">{title}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-[18px] pb-6">
        {children}
      </main>
    </div>
  )
}
