import { create } from 'zustand'
import {
  authenticateMockUser,
  clearStoredAuthSession,
  getStoredAuthSession,
  persistAuthSession,
} from '../services/authService'
import type { AuthSession, MockLoginPayload, MockLoginResult } from '../types/auth'

interface AuthStoreState {
  isAuthenticated: boolean
  user: AuthSession | null
  login: (payload: MockLoginPayload) => MockLoginResult
  logout: () => void
}

const initialSession = getStoredAuthSession()

export const useAuthStore = create<AuthStoreState>(set => ({
  isAuthenticated: initialSession !== null,
  user: initialSession,
  login: payload => {
    const result = authenticateMockUser(payload)

    if (!result.success) {
      clearStoredAuthSession()
      set({
        isAuthenticated: false,
        user: null,
      })
      return result
    }

    persistAuthSession(result.user)
    set({
      isAuthenticated: true,
      user: result.user,
    })
    return result
  },
  logout: () => {
    clearStoredAuthSession()
    set({
      isAuthenticated: false,
      user: null,
    })
  },
}))
