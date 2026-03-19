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

  return {
    isAuthenticated,
    user,
    isPending,
    login,
    logout,
    refreshSession,
    setSession,
    clearSession,
  }
}

export default useAuth
