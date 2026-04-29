import { useAuthStore } from '../../../stores/authStore'

export function useAuth() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const isPending = useAuthStore(state => state.isPending)
  const login = useAuthStore(state => state.login)
  const logout = useAuthStore(state => state.logout)
  const refreshSession = useAuthStore(state => state.refreshSession)
  const setSession = useAuthStore(state => state.setSession)
  const clearSession = useAuthStore(state => state.clearSession)
  const patientPostAuth = useAuthStore(state => state.patientPostAuth)
  const setPatientPostAuth = useAuthStore(state => state.setPatientPostAuth)
  const clearPatientPostAuth = useAuthStore(state => state.clearPatientPostAuth)

  return {
    isAuthenticated,
    user,
    isPending,
    login,
    logout,
    refreshSession,
    setSession,
    clearSession,
    patientPostAuth,
    setPatientPostAuth,
    clearPatientPostAuth,
  }
}

export default useAuth
