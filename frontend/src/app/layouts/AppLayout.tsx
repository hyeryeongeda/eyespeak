import { Outlet } from 'react-router-dom'
import GuardianSessionManager from '../../features/auth/components/GuardianSessionManager'

export default function AppLayout() {
  return (
    <>
      <GuardianSessionManager />
      <Outlet />
    </>
  )
}
