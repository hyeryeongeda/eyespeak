import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  const login = useAuthStore(state => state.login)
  const logout = useAuthStore(state => state.logout)

  return {
    isAuthenticated,
    user,
    login,
    logout,
  }
}

export default useAuth
