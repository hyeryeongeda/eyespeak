import { Navigate } from 'react-router-dom'
import { getAuthPathByRole, ROUTE_PATHS } from '../../app/router/routePaths'
import { getStoredRole } from '../../services/authStorage'

export default function SignupPage() {
  const selectedRole = getStoredRole()

  if (!selectedRole) {
    return <Navigate to={`${ROUTE_PATHS.AUTH_ROLE}?mode=signup`} replace />
  }

  return <Navigate to={getAuthPathByRole('signup', selectedRole)} replace />
}
