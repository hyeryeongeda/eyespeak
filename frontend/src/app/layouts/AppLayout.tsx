import { Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'

const GuardianSessionManager = lazy(() => import('../../features/auth/components/GuardianSessionManager'))

export default function AppLayout() {
  const { isAuthenticated, user } = useAuth()
  const isGuardian = isAuthenticated && user?.role === 'guardian'

  return (
    <>
      {isGuardian && (
        <Suspense fallback={null}>
          <GuardianSessionManager />
        </Suspense>
      )}
      <Outlet />
    </>
  )
}
