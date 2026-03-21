import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { getPatientCalibrationStatusSnapshot } from '../../features/patient/input/services/calibration/patientCalibrationService'
import type { UserRole } from '../../types/auth'
import { getAuthPathByRole, getHomePathByRole, ROUTE_PATHS } from './routePaths'

interface ProtectedRouteProps {
  allowedRole: UserRole
  children?: ReactNode
}

interface PublicOnlyRouteProps {
  children?: ReactNode
}

interface PatientCalibrationRouteProps {
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

export function PatientCalibrationRoute({ children }: PatientCalibrationRouteProps) {
  const { user } = useAuth()
  const location = useLocation()
  const calibrationStatus = getPatientCalibrationStatusSnapshot(user)
  const calibrationRequired = calibrationStatus?.required ?? true
  const isCalibrationRoute = location.pathname === ROUTE_PATHS.PATIENT_CALIBRATION

  if (calibrationRequired && !isCalibrationRoute) {
    return <Navigate to={ROUTE_PATHS.PATIENT_CALIBRATION} replace />
  }

  if (!calibrationRequired && isCalibrationRoute) {
    return <Navigate to={ROUTE_PATHS.PATIENT_MAIN} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
