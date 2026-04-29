import { Navigate, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../../app/router/routePaths'
import { resolveAuthEntryRoute } from '../authRedirect'
import { getStoredRole } from '../../../services/authStorage'

export default function LoginPage() {
  const location = useLocation()
  const selectedRole = getStoredRole()

  if (!selectedRole) {
    return <Navigate to={`${ROUTE_PATHS.AUTH_ROLE}?mode=login`} replace state={location.state} />
  }

  const authEntryRoute = resolveAuthEntryRoute('login', selectedRole, location.state)

  return <Navigate to={authEntryRoute.path} replace state={authEntryRoute.state} />
}
