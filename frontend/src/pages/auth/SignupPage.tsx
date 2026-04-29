import { Navigate, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../../app/router/routePaths'
import { resolveAuthEntryRoute } from '../../features/auth/authRedirect'
import { getStoredRole } from '../../services/authStorage'

export default function SignupPage() {
  const location = useLocation()
  const selectedRole = getStoredRole()

  if (!selectedRole) {
    return <Navigate to={`${ROUTE_PATHS.AUTH_ROLE}?mode=signup`} replace state={location.state} />
  }

  const authEntryRoute = resolveAuthEntryRoute('signup', selectedRole, location.state)

  return <Navigate to={authEntryRoute.path} replace state={authEntryRoute.state} />
}
