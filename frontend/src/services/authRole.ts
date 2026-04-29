import type { UserRole } from '../types/auth'

const AUTH_ROLE_ALIASES: Record<string, UserRole> = {
  patient: 'patient',
  guardian: 'guardian',
  caregiver: 'guardian',
  care: 'guardian',
}

export function normalizeAuthRole(role: string | null | undefined): UserRole | null {
  if (typeof role !== 'string') {
    return null
  }

  const normalizedRole = role.trim().toLowerCase()
  return AUTH_ROLE_ALIASES[normalizedRole] ?? null
}

export function requireAuthRole(role: string | null | undefined): UserRole {
  const normalizedRole = normalizeAuthRole(role)

  if (!normalizedRole) {
    throw new Error(`Unsupported user role: ${role ?? '(missing)'}`)
  }

  return normalizedRole
}

export function isGuardianRole(role: string | null | undefined) {
  return normalizeAuthRole(role) === 'guardian'
}

export function isPatientRole(role: string | null | undefined) {
  return normalizeAuthRole(role) === 'patient'
}
