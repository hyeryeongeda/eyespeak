import { create } from 'zustand'
import { clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from '../services/authStorage'
import { login as loginService, logout as logoutService, refreshSession as refreshSessionService } from '../services/authService'
import {
  registerAuthSessionUpdater,
  syncActiveAuthSession,
} from '../services/authSessionRegistry'
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

function isSameSession(previous: AuthSession | null, next: AuthSession | null) {
  if (previous === next) {
    return true
  }

  if (!previous || !next) {
    return false
  }

  return (
    previous.id === next.id &&
    previous.userId === next.userId &&
    previous.matchingId === next.matchingId &&
    previous.role === next.role &&
    previous.name === next.name &&
    previous.accessToken === next.accessToken &&
    previous.refreshToken === next.refreshToken &&
    previous.email === next.email &&
    previous.teamCode === next.teamCode
  )
}

function getNextAuthStoreState(
  state: AuthStoreState,
  session: AuthSession | null,
  isPending: boolean,
) {
  const hasSameSession = isSameSession(state.user, session)
  const nextIsAuthenticated = session !== null

  if (
    state.isAuthenticated === nextIsAuthenticated &&
    state.isPending === isPending &&
    hasSameSession
  ) {
    return state
  }

  return {
    ...state,
    isAuthenticated: nextIsAuthenticated,
    user: hasSameSession ? state.user : session,
    isPending,
  }
}

const initialSession = getStoredAuthSession()
syncActiveAuthSession(initialSession)

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isAuthenticated: initialSession !== null,
  user: initialSession,
  isPending: false,
  login: async payload => {
    const applySession = (session: AuthSession | null, isPending = false) => {
      set(state => getNextAuthStoreState(state, session, isPending))
    }

    set({ isPending: true })

    const result = await loginService(payload)

    if (!result.success) {
      clearStoredAuthSession()
      syncActiveAuthSession(null)
      applySession(null, false)
      return result
    }

    persistAuthSession(result.data)
    syncActiveAuthSession(result.data)
    applySession(result.data, false)
    return result
  },
  logout: async () => {
    const applySession = (session: AuthSession | null, isPending = false) => {
      set(state => getNextAuthStoreState(state, session, isPending))
    }

    const currentSession = get().user

    set({ isPending: true })
    await logoutService(currentSession)
    clearStoredAuthSession()
    syncActiveAuthSession(null)

    applySession(null, false)
  },
  refreshSession: async () => {
    const applySession = (session: AuthSession | null, isPending = false) => {
      set(state => getNextAuthStoreState(state, session, isPending))
    }

    const currentSession = get().user

    const result = await refreshSessionService(currentSession)

    if (!result.success) {
      clearStoredAuthSession()
      syncActiveAuthSession(null)
      applySession(null, false)
      return result
    }

    persistAuthSession(result.data)
    syncActiveAuthSession(result.data)
    applySession(result.data, false)

    return result
  },
  setSession: session => {
    persistAuthSession(session)
    syncActiveAuthSession(session)
    set(state => getNextAuthStoreState(state, session, false))
  },
  clearSession: () => {
    clearStoredAuthSession()
    syncActiveAuthSession(null)
    set(state => getNextAuthStoreState(state, null, false))
  },
}))

registerAuthSessionUpdater(session => {
  if (session) {
    persistAuthSession(session)
    useAuthStore.setState(state => getNextAuthStoreState(state, session, false))
    return
  }

  clearStoredAuthSession()
  useAuthStore.setState(state => getNextAuthStoreState(state, null, false))
})
