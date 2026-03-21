import { create } from 'zustand'
import { clearStoredAuthSession, getStoredAuthSession, persistAuthSession } from '../services/authStorage'
import { login as loginService, logout as logoutService, refreshSession as refreshSessionService } from '../services/authService'
import {
  registerAuthSessionUpdater,
  syncActiveAuthSession,
} from '../services/authSessionRegistry'
import type { AuthSession, LoginFormValues } from '../types/auth'
import type { ServiceResult } from '../types/api'
import type { PatientPostAuthState } from '../types/calibration'

interface AuthStoreState {
  isAuthenticated: boolean
  user: AuthSession | null
  isPending: boolean
  patientPostAuth: PatientPostAuthState | null
  login: (payload: LoginFormValues) => Promise<ServiceResult<AuthSession>>
  logout: () => Promise<void>
  refreshSession: () => Promise<ServiceResult<AuthSession>>
  setSession: (session: AuthSession) => void
  clearSession: () => void
  setPatientPostAuth: (state: PatientPostAuthState | null) => void
  clearPatientPostAuth: () => void
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
    previous.authMode === next.authMode &&
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

function getNextPatientPostAuthState(
  state: AuthStoreState,
  session: AuthSession | null,
  nextPatientPostAuth?: PatientPostAuthState | null,
) {
  if (!session || session.role !== 'patient') {
    return null
  }

  if (nextPatientPostAuth !== undefined) {
    return nextPatientPostAuth
  }

  return state.patientPostAuth
}

const initialSession = getStoredAuthSession()
syncActiveAuthSession(initialSession)

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isAuthenticated: initialSession !== null,
  user: initialSession,
  isPending: false,
  patientPostAuth: null,
  login: async payload => {
    const applySession = (
      session: AuthSession | null,
      isPending = false,
      nextPatientPostAuth?: PatientPostAuthState | null,
    ) => {
      set(state => {
        const nextState = getNextAuthStoreState(state, session, isPending)
        const patientPostAuth = getNextPatientPostAuthState(
          state,
          session,
          nextPatientPostAuth,
        )

        if (nextState === state && state.patientPostAuth === patientPostAuth) {
          return state
        }

        return {
          ...nextState,
          patientPostAuth,
        }
      })
    }

    set({ isPending: true })

    const result = await loginService(payload)

    if (!result.success) {
      clearStoredAuthSession()
      syncActiveAuthSession(null)
      applySession(null, false, null)
      return result
    }

    persistAuthSession(result.data)
    syncActiveAuthSession(result.data)
    applySession(result.data, false, null)
    return result
  },
  logout: async () => {
    const applySession = (session: AuthSession | null, isPending = false) => {
      set(state => ({
        ...getNextAuthStoreState(state, session, isPending),
        patientPostAuth: getNextPatientPostAuthState(state, session, null),
      }))
    }

    const currentSession = get().user

    set({ isPending: true })
    await logoutService(currentSession)
    clearStoredAuthSession()
    syncActiveAuthSession(null)

    applySession(null, false)
  },
  refreshSession: async () => {
    const applySession = (
      session: AuthSession | null,
      isPending = false,
      nextPatientPostAuth?: PatientPostAuthState | null,
    ) => {
      set(state => ({
        ...getNextAuthStoreState(state, session, isPending),
        patientPostAuth: getNextPatientPostAuthState(
          state,
          session,
          nextPatientPostAuth,
        ),
      }))
    }

    const currentSession = get().user

    const result = await refreshSessionService(currentSession)

    if (!result.success) {
      clearStoredAuthSession()
      syncActiveAuthSession(null)
      applySession(null, false, null)
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
    set(state => ({
      ...getNextAuthStoreState(state, session, false),
      patientPostAuth: getNextPatientPostAuthState(state, session, null),
    }))
  },
  clearSession: () => {
    clearStoredAuthSession()
    syncActiveAuthSession(null)
    set(state => ({
      ...getNextAuthStoreState(state, null, false),
      patientPostAuth: null,
    }))
  },
  setPatientPostAuth: patientPostAuth => {
    set(state => {
      if ((state.user?.role ?? null) !== 'patient' && patientPostAuth !== null) {
        return state
      }

      if (state.patientPostAuth === patientPostAuth) {
        return state
      }

      return {
        ...state,
        patientPostAuth,
      }
    })
  },
  clearPatientPostAuth: () => {
    set(state =>
      state.patientPostAuth === null
        ? state
        : {
            ...state,
            patientPostAuth: null,
          },
    )
  },
}))

registerAuthSessionUpdater(session => {
  if (session) {
    persistAuthSession(session)
    useAuthStore.setState(state => ({
      ...getNextAuthStoreState(state, session, false),
      patientPostAuth: session.role === 'patient' ? state.patientPostAuth : null,
    }))
    return
  }

  clearStoredAuthSession()
  useAuthStore.setState(state => ({
    ...getNextAuthStoreState(state, null, false),
    patientPostAuth: null,
  }))
})
