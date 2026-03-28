import type { AuthSession } from '../types/auth'

type AuthSessionUpdater = (session: AuthSession | null) => void

// Bridge for non-React layers such as the API client.
let activeAuthSession: AuthSession | null = null
let authSessionUpdater: AuthSessionUpdater | null = null

export function getActiveAuthSession() {
  return activeAuthSession
}

export function syncActiveAuthSession(session: AuthSession | null) {
  activeAuthSession = session
}

export function registerAuthSessionUpdater(updater: AuthSessionUpdater) {
  authSessionUpdater = updater
}

export function applyActiveAuthSession(session: AuthSession | null) {
  activeAuthSession = session
  authSessionUpdater?.(session)
}
