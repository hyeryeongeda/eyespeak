import type { Location } from 'react-router-dom'
import { getAuthPathByRole, getDefaultRouteByRole, ROUTE_PATHS } from '../../app/router/routePaths'
import { resolvePatientPostAuthFlow } from '../patient/input/services/calibration/patientCalibrationService'
import type { PatientPostAuthState } from '../../types/calibration'
import type {
  AuthEntryMode,
  AuthRedirectTarget,
  AuthRouteState,
  AuthSession,
  UserRole,
} from '../../types/auth'

export interface ResolvedAuthNavigation {
  path: string
  state?: unknown
  patientPostAuthState: PatientPostAuthState | null
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeRedirectTarget(value: unknown): AuthRedirectTarget | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const redirectTarget = value as Partial<AuthRedirectTarget>

  if (!isNonEmptyText(redirectTarget.pathname) || !redirectTarget.pathname.startsWith('/')) {
    return null
  }

  return {
    pathname: redirectTarget.pathname,
    search: typeof redirectTarget.search === 'string' ? redirectTarget.search : '',
    hash: typeof redirectTarget.hash === 'string' ? redirectTarget.hash : '',
  }
}

function isAuthPath(pathname: string) {
  return pathname === ROUTE_PATHS.AUTH_ROOT || pathname.startsWith(`${ROUTE_PATHS.AUTH_ROOT}/`)
}

function canRoleAccessPath(pathname: string, role: UserRole) {
  if (isAuthPath(pathname)) {
    return false
  }

  if (pathname === ROUTE_PATHS.HOME) {
    return true
  }

  return role === 'guardian'
    ? pathname.startsWith(ROUTE_PATHS.CARE_ROOT)
    : pathname.startsWith(ROUTE_PATHS.PATIENT_ROOT)
}

export function buildAuthRedirectTarget(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): AuthRedirectTarget {
  return {
    pathname: location.pathname,
    search: location.search || '',
    hash: location.hash || '',
  }
}

export function buildAuthRedirectState(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
): AuthRouteState {
  return {
    from: buildAuthRedirectTarget(location),
  }
}

export function getAuthRedirectTarget(state: unknown): AuthRedirectTarget | null {
  if (!state || typeof state !== 'object') {
    return null
  }

  return normalizeRedirectTarget((state as AuthRouteState).from)
}

export function stringifyAuthRedirectTarget(target: AuthRedirectTarget | null | undefined) {
  if (!target) {
    return null
  }

  return `${target.pathname}${target.search ?? ''}${target.hash ?? ''}`
}

export function resolveRedirectPathByRole(role: UserRole, locationState?: unknown) {
  const redirectTarget = getAuthRedirectTarget(locationState)

  if (redirectTarget && canRoleAccessPath(redirectTarget.pathname, role)) {
    return stringifyAuthRedirectTarget(redirectTarget) ?? getDefaultRouteByRole(role)
  }

  return getDefaultRouteByRole(role)
}

export function resolveAuthEntryRoute(mode: AuthEntryMode, role: UserRole, state?: unknown) {
  const redirectTarget = getAuthRedirectTarget(state)

  return {
    path: getAuthPathByRole(mode, role),
    state: redirectTarget ? ({ from: redirectTarget } satisfies AuthRouteState) : undefined,
  }
}

export async function resolveAuthSuccessNavigation(
  session: AuthSession,
  options: {
    entryPoint: AuthEntryMode
    locationState?: unknown
  },
): Promise<ResolvedAuthNavigation> {
  const redirectPath = resolveRedirectPathByRole(session.role, options.locationState)

  if (session.role === 'patient') {
    const resolvedPatientPostAuthFlow = await resolvePatientPostAuthFlow(session, {
      entryPoint: options.entryPoint,
      redirectPath,
    })

    return {
      path: resolvedPatientPostAuthFlow.destination.path,
      state: resolvedPatientPostAuthFlow.destination.state,
      patientPostAuthState: resolvedPatientPostAuthFlow.postAuthState,
    }
  }

  return {
    path: redirectPath,
    patientPostAuthState: null,
  }
}
