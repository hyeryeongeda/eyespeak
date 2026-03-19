import { create } from 'zustand'
import { clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from '../services/authStorage'
import { login as loginService, logout as logoutService, refreshSession as refreshSessionService } from '../services/authService'
import type { AuthSession, LoginFormValues } from '../types/auth'
import type { ServiceResult } from '../types/api'

interface AuthStoreState {
  isAuthenticated: boolean
  user: AuthSession | null
  isPending: boolean
  login: (payload: LoginFormValues) => Promise<ServiceResult<AuthSession>>
  logout: () => Promise<void>
  refreshSession: () => Promise<ServiceResult<AuthSession>>
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

const initialSession = getStoredAuthSession()

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isAuthenticated: initialSession !== null,
  user: initialSession,
  isPending: false,
  login: async payload => {
    set({ isPending: true })

    const result = await loginService(payload)

    if (!result.success) {
      clearStoredAuthSession()
      set({
        isAuthenticated: false,
        user: null,
        isPending: false,
      })
      return result
    }

    persistAuthSession(result.data)
    set({
      isAuthenticated: true,
      user: result.data,
      isPending: false,
    })
    return result
  },
  logout: async () => {
    const currentSession = get().user

    set({ isPending: true })
    await logoutService(currentSession)
    clearStoredAuthSession()

    set({
      isAuthenticated: false,
      user: null,
      isPending: false,
    })
  },
  refreshSession: async () => {
    const currentSession = get().user

    const result = await refreshSessionService(currentSession)

    if (!result.success) {
      clearStoredAuthSession()
      set({
        isAuthenticated: false,
        user: null,
      })
      return result
    }

    persistAuthSession(result.data)
    set({
      isAuthenticated: true,
      user: result.data,
    })

    return result
  },
  setSession: session => {
    persistAuthSession(session)
    set({
      isAuthenticated: true,
      user: session,
    })
  },
  clearSession: () => {
    clearStoredAuthSession()
    set({
      isAuthenticated: false,
      user: null,
    })
  },
}))
