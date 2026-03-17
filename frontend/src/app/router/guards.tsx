import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth'
import { getAuthPathByRole, getHomePathByRole } from './routePaths'

interface ProtectedRouteProps {
  allowedRole: UserRole
  children?: ReactNode
}

interface PublicOnlyRouteProps {
  children?: ReactNode
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={getAuthPathByRole('login', allowedRole)}
        replace
        state={{ from: location }}
      />
    )
  }

  if (user.role !== allowedRole) {
    return <Navigate to={getHomePathByRole(user.role)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={getHomePathByRole(user.role)} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
