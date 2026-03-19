import { API_ENDPOINTS } from './apiEndpoints'
import type {
  AuthResponseDto,
  GuardianSignupRequestDto,
  LoginRequestDto,
  LogoutRequestDto,
  RefreshRequestDto,
  UserRole,
  WithdrawRequestDto,
} from '../types/auth'
import type {
  PatientSignupRequestDto,
  PatientSignupResponseDto,
  RegisterPatientInfoRequestDto,
  RegisterPatientInfoResponseDto,
  VerifiedTeamCode,
} from '../types/patient'
import { ApiError, type ApiTransport } from '../types/api'
import { normalizeTeamCode } from './authStorage'
import { isValidEmail } from '../utils/validators'

const MOCK_DATABASE_STORAGE_KEY = 'mockAuthDatabase:v2'
const MOCK_NETWORK_DELAY_MS = 420
const DEMO_GUARDIAN_EMAIL = 'care123@eyespeak.mock'
const DEMO_PATIENT_EMAIL = 'pat123@eyespeak.mock'
const DEMO_PASSWORD = 'e205e205@'
const DEMO_TEAM_CODE = 'TEAM123'

interface MockGuardianAccountRecord {
  userId: string
  email: string
  name: string
  password: string
  createdAt: string
  teamCode: string | null
  patientId: string | null
}

interface MockPatientProfileRecord {
  patientId: string
  guardianUserId: string
  name: string
  birthYear: number
  gender: 'M' | 'F'
  routines: RegisterPatientInfoRequestDto['survey']
  teamCode: string
  createdAt: string
}

interface MockPatientAccountRecord {
  userId: string
  patientId: string
  teamCode: string
  loginId: string
  name: string
  password: string
  createdAt: string
}

interface MockAuthDatabase {
  guardians: MockGuardianAccountRecord[]
  patientProfiles: MockPatientProfileRecord[]
  patientAccounts: MockPatientAccountRecord[]
}

function normalizePatientLoginId(value: string) {
  return value.trim().toLowerCase()
}

function migrateDatabase(database: MockAuthDatabase) {
  let didMutate = false

  database.guardians.forEach(guardian => {
    const normalizedEmail = guardian.email.trim().toLowerCase()

    if (guardian.email !== normalizedEmail) {
      guardian.email = normalizedEmail
      didMutate = true
    }
  })

  database.patientAccounts.forEach(patientAccount => {
    const normalizedLoginId =
      patientAccount.userId === 'patient-demo' && patientAccount.loginId === 'pat123'
        ? DEMO_PATIENT_EMAIL
        : normalizePatientLoginId(patientAccount.loginId)

    if (patientAccount.loginId !== normalizedLoginId) {
      patientAccount.loginId = normalizedLoginId
      didMutate = true
    }
  })

  return didMutate
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function delay(ms = MOCK_NETWORK_DELAY_MS) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms)
  })
}

function createSeedDatabase(): MockAuthDatabase {
  const guardianUserId = 'guardian-demo'
  const patientId = 'patient-profile-demo'

  return {
    guardians: [
      {
        userId: guardianUserId,
        email: DEMO_GUARDIAN_EMAIL,
        name: '보호자 데모',
        password: DEMO_PASSWORD,
        createdAt: '2026-03-19T00:00:00.000Z',
        teamCode: DEMO_TEAM_CODE,
        patientId,
      },
    ],
    patientProfiles: [
      {
        patientId,
        guardianUserId,
        name: '환자 데모',
        birthYear: 1992,
        gender: 'M',
        routines: {
          routines: [
            {
              slotId: 'morning',
              selectedTagIds: ['oral-care', 'medication'],
            },
          ],
        },
        teamCode: DEMO_TEAM_CODE,
        createdAt: '2026-03-19T00:00:00.000Z',
      },
    ],
    patientAccounts: [
      {
        userId: 'patient-demo',
        patientId,
        teamCode: DEMO_TEAM_CODE,
        loginId: DEMO_PATIENT_EMAIL,
        name: '환자 데모',
        password: DEMO_PASSWORD,
        createdAt: '2026-03-19T00:00:00.000Z',
      },
    ],
  }
}

function readDatabase(): MockAuthDatabase {
  if (!isBrowser()) {
    return createSeedDatabase()
  }

  const storedValue = localStorage.getItem(MOCK_DATABASE_STORAGE_KEY)

  if (!storedValue) {
    const seedDatabase = createSeedDatabase()
    localStorage.setItem(MOCK_DATABASE_STORAGE_KEY, JSON.stringify(seedDatabase))
    return seedDatabase
  }

  try {
    const parsedDatabase = JSON.parse(storedValue) as MockAuthDatabase

    if (migrateDatabase(parsedDatabase)) {
      localStorage.setItem(MOCK_DATABASE_STORAGE_KEY, JSON.stringify(parsedDatabase))
    }

    return parsedDatabase
  } catch {
    const seedDatabase = createSeedDatabase()
    localStorage.setItem(MOCK_DATABASE_STORAGE_KEY, JSON.stringify(seedDatabase))
    return seedDatabase
  }
}

function writeDatabase(database: MockAuthDatabase) {
  if (!isBrowser()) {
    return
  }

  localStorage.setItem(MOCK_DATABASE_STORAGE_KEY, JSON.stringify(database))
}

function createAuthResponse(params: {
  id: string
  role: UserRole
  name: string
  email?: string
  teamCode?: string | null
}): AuthResponseDto {
  return {
    accessToken: `mock-access:${params.role}:${params.id}:${Date.now()}`,
    refreshToken: `mock-refresh:${params.role}:${params.id}`,
    user: {
      id: params.id,
      role: params.role,
      name: params.name,
      email: params.email,
      teamCode: params.teamCode ?? null,
    },
  }
}

function assertRequiredText(value: string | undefined, statusMessage: string) {
  if (!value?.trim()) {
    throw new ApiError({
      statusCode: 400,
      source: 'mock',
      message: statusMessage,
    })
  }
}

function extractUserIdFromToken(accessToken?: string | null) {
  if (!accessToken) {
    throw new ApiError({
      statusCode: 401,
      source: 'mock',
      message: '인증 정보가 없습니다.',
    })
  }

  const tokenParts = accessToken.split(':')
  const userId = tokenParts[2]

  if (!userId) {
    throw new ApiError({
      statusCode: 401,
      source: 'mock',
      message: '인증 정보가 올바르지 않습니다.',
    })
  }

  return userId
}

function createUniqueTeamCode(database: MockAuthDatabase) {
  let nextCode = DEMO_TEAM_CODE

  while (
    database.patientProfiles.some(patientProfile => patientProfile.teamCode === nextCode)
  ) {
    nextCode = `TEAM${Math.floor(1000 + Math.random() * 9000)}`
  }

  return nextCode
}

function handleLogin(request: LoginRequestDto) {
  assertRequiredText(request.identifier, '로그인 식별자를 입력해주세요.')
  assertRequiredText(request.password, '비밀번호를 입력해주세요.')

  const database = readDatabase()

  if (request.role === 'caregiver') {
    const guardianAccount = database.guardians.find(
      guardian => guardian.email.toLowerCase() === request.identifier.trim().toLowerCase(),
    )

    if (!guardianAccount || guardianAccount.password !== request.password) {
      throw new ApiError({
        statusCode: 401,
        source: 'mock',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      })
    }

    return createAuthResponse({
      id: guardianAccount.userId,
      role: 'caregiver',
      name: guardianAccount.name,
      email: guardianAccount.email,
      teamCode: guardianAccount.teamCode,
    })
  }

  const patientAccount = database.patientAccounts.find(
    patient => patient.loginId === normalizePatientLoginId(request.identifier),
  )

  if (!patientAccount || patientAccount.password !== request.password) {
    throw new ApiError({
      statusCode: 401,
      source: 'mock',
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    })
  }

  return createAuthResponse({
    id: patientAccount.userId,
    role: 'patient',
    name: patientAccount.name,
    email: patientAccount.loginId,
    teamCode: patientAccount.teamCode,
  })
}

function handleGuardianSignup(request: GuardianSignupRequestDto) {
  assertRequiredText(request.email, '이메일을 입력해주세요.')
  assertRequiredText(request.name, '보호자 이름을 입력해주세요.')
  assertRequiredText(request.password, '비밀번호를 입력해주세요.')

  const database = readDatabase()
  const normalizedEmail = request.email.trim().toLowerCase()

  if (database.guardians.some(guardian => guardian.email.toLowerCase() === normalizedEmail)) {
    throw new ApiError({
      statusCode: 409,
      source: 'mock',
      message: '이미 가입된 이메일입니다.',
      code: 'GUARDIAN_EMAIL_DUPLICATED',
    })
  }

  const guardianRecord: MockGuardianAccountRecord = {
    userId: createId('guardian'),
    email: normalizedEmail,
    name: request.name.trim(),
    password: request.password,
    createdAt: new Date().toISOString(),
    teamCode: null,
    patientId: null,
  }

  database.guardians.push(guardianRecord)
  writeDatabase(database)

  return createAuthResponse({
    id: guardianRecord.userId,
    role: 'caregiver',
    name: guardianRecord.name,
    email: guardianRecord.email,
  })
}

function handleRegisterPatientInfo(
  request: RegisterPatientInfoRequestDto,
  accessToken?: string | null,
) {
  assertRequiredText(request.name, '환자 이름을 입력해주세요.')

  if (!Number.isInteger(request.birthYear)) {
    throw new ApiError({
      statusCode: 400,
      source: 'mock',
      message: '출생연도 형식이 올바르지 않습니다.',
    })
  }

  if (request.gender !== 'M' && request.gender !== 'F') {
    throw new ApiError({
      statusCode: 400,
      source: 'mock',
      message: '성별 값이 올바르지 않습니다.',
    })
  }

  const guardianUserId = extractUserIdFromToken(accessToken)
  const database = readDatabase()
  const guardianRecord = database.guardians.find(guardian => guardian.userId === guardianUserId)

  if (!guardianRecord) {
    throw new ApiError({
      statusCode: 404,
      source: 'mock',
      message: '보호자 계정을 찾을 수 없습니다.',
    })
  }

  if (guardianRecord.patientId) {
    throw new ApiError({
      statusCode: 409,
      source: 'mock',
      message: '초기 설문은 최초 1회만 등록할 수 있습니다.',
      code: 'INITIAL_SURVEY_ALREADY_COMPLETED',
    })
  }

  const patientId = createId('patient-profile')
  const teamCode = createUniqueTeamCode(database)
  const patientProfile: MockPatientProfileRecord = {
    patientId,
    guardianUserId,
    name: request.name.trim(),
    birthYear: request.birthYear,
    gender: request.gender,
    routines: request.survey,
    teamCode,
    createdAt: new Date().toISOString(),
  }

  guardianRecord.patientId = patientId
  guardianRecord.teamCode = teamCode
  database.patientProfiles.push(patientProfile)
  writeDatabase(database)

  const response: RegisterPatientInfoResponseDto = {
    patientId,
    teamCode,
    createdAt: patientProfile.createdAt,
  }

  return response
}

function handlePatientSignup(request: PatientSignupRequestDto) {
  assertRequiredText(request.teamCode, '팀코드를 입력해주세요.')
  assertRequiredText(request.loginId, '로그인 이메일을 입력해주세요.')
  assertRequiredText(request.password, '비밀번호를 입력해주세요.')
  assertRequiredText(request.name, '환자 이름을 입력해주세요.')

  const database = readDatabase()
  const normalizedTeamCode = normalizeTeamCode(request.teamCode)
  const normalizedLoginId = normalizePatientLoginId(request.loginId)
  const patientProfile = database.patientProfiles.find(
    profile => profile.teamCode === normalizedTeamCode,
  )

  if (!isValidEmail(normalizedLoginId)) {
    throw new ApiError({
      statusCode: 400,
      source: 'mock',
      message: '올바른 이메일 형식의 로그인 이메일을 입력해주세요.',
    })
  }

  if (!patientProfile) {
    throw new ApiError({
      statusCode: 404,
      source: 'mock',
      message: '팀코드를 찾을 수 없습니다.',
      code: 'TEAM_CODE_NOT_FOUND',
    })
  }

  if (database.patientAccounts.some(account => account.teamCode === normalizedTeamCode)) {
    throw new ApiError({
      statusCode: 409,
      source: 'mock',
      message: '이미 연결된 환자 계정이 있습니다.',
      code: 'PATIENT_ACCOUNT_ALREADY_EXISTS',
    })
  }

  if (
    database.patientAccounts.some(
      account => account.loginId === normalizedLoginId,
    )
  ) {
    throw new ApiError({
      statusCode: 409,
      source: 'mock',
      message: '이미 사용 중인 로그인 이메일입니다.',
      code: 'PATIENT_LOGIN_ID_DUPLICATED',
    })
  }

  const patientAccount: MockPatientAccountRecord = {
    userId: createId('patient'),
    patientId: patientProfile.patientId,
    teamCode: normalizedTeamCode,
    loginId: normalizedLoginId,
    name: request.name.trim(),
    password: request.password,
    createdAt: new Date().toISOString(),
  }

  database.patientAccounts.push(patientAccount)
  writeDatabase(database)

  const response: PatientSignupResponseDto = {
    ...createAuthResponse({
      id: patientAccount.userId,
      role: 'patient',
      name: patientAccount.name,
      email: patientAccount.loginId,
      teamCode: patientAccount.teamCode,
    }),
    patientId: patientAccount.patientId,
    teamCode: patientAccount.teamCode,
  }

  return response
}

function handleLogout(_request: LogoutRequestDto) {
  return {
    success: true,
  }
}

function handleRefresh(request: RefreshRequestDto) {
  assertRequiredText(request.refreshToken, '리프레시 토큰이 없습니다.')

  const [, role, userId] = request.refreshToken.split(':')

  if (!userId || (role !== 'caregiver' && role !== 'patient')) {
    throw new ApiError({
      statusCode: 401,
      source: 'mock',
      message: '세션이 만료되었습니다.',
    })
  }

  const database = readDatabase()

  if (role === 'caregiver') {
    const guardianRecord = database.guardians.find(guardian => guardian.userId === userId)

    if (!guardianRecord) {
      throw new ApiError({
        statusCode: 404,
        source: 'mock',
        message: '보호자 계정을 찾을 수 없습니다.',
      })
    }

    return createAuthResponse({
      id: guardianRecord.userId,
      role: 'caregiver',
      name: guardianRecord.name,
      email: guardianRecord.email,
      teamCode: guardianRecord.teamCode,
    })
  }

  const patientAccount = database.patientAccounts.find(patient => patient.userId === userId)

  if (!patientAccount) {
    throw new ApiError({
      statusCode: 404,
      source: 'mock',
      message: '환자 계정을 찾을 수 없습니다.',
    })
  }

  return createAuthResponse({
    id: patientAccount.userId,
    role: 'patient',
    name: patientAccount.name,
    email: patientAccount.loginId,
    teamCode: patientAccount.teamCode,
  })
}

function handleWithdraw(
  _request: WithdrawRequestDto,
  accessToken?: string | null,
) {
  const userId = extractUserIdFromToken(accessToken)
  const database = readDatabase()
  const guardianIndex = database.guardians.findIndex(guardian => guardian.userId === userId)

  if (guardianIndex >= 0) {
    const guardianRecord = database.guardians[guardianIndex]

    database.guardians.splice(guardianIndex, 1)

    if (guardianRecord.patientId) {
      database.patientProfiles = database.patientProfiles.filter(
        patientProfile => patientProfile.guardianUserId !== guardianRecord.userId,
      )
      database.patientAccounts = database.patientAccounts.filter(
        patientAccount => patientAccount.patientId !== guardianRecord.patientId,
      )
    }

    writeDatabase(database)
    return { success: true }
  }

  const patientIndex = database.patientAccounts.findIndex(patient => patient.userId === userId)

  if (patientIndex < 0) {
    throw new ApiError({
      statusCode: 404,
      source: 'mock',
      message: '탈퇴할 계정을 찾을 수 없습니다.',
    })
  }

  database.patientAccounts.splice(patientIndex, 1)
  writeDatabase(database)
  return { success: true }
}

export async function findMockTeamCode(
  teamCode: string,
): Promise<VerifiedTeamCode> {
  await delay(240)

  const database = readDatabase()
  const normalizedTeamCode = normalizeTeamCode(teamCode)
  const patientProfile = database.patientProfiles.find(
    profile => profile.teamCode === normalizedTeamCode,
  )

  if (!patientProfile) {
    throw new ApiError({
      statusCode: 404,
      source: 'mock',
      message: '팀코드를 찾을 수 없습니다.',
      code: 'TEAM_CODE_NOT_FOUND',
    })
  }

  return {
    teamCode: patientProfile.teamCode,
    patientName: patientProfile.name,
  }
}

export const mockApiTransport: ApiTransport = {
  async request<TResponse, TBody = unknown>({
    method,
    url,
    data,
    accessToken,
  }: {
    method: 'GET' | 'POST' | 'DELETE'
    url: string
    data?: TBody
    accessToken?: string | null
  }) {
    await delay()

    switch (`${method} ${url}`) {
      case `POST ${API_ENDPOINTS.AUTH_LOGIN}`:
        return handleLogin(data as LoginRequestDto) as TResponse
      case `POST ${API_ENDPOINTS.AUTH_SIGNUP_GUARDIAN}`:
        return handleGuardianSignup(data as GuardianSignupRequestDto) as TResponse
      case `POST ${API_ENDPOINTS.PATIENTS}`:
        return handleRegisterPatientInfo(
          data as RegisterPatientInfoRequestDto,
          accessToken,
        ) as TResponse
      case `POST ${API_ENDPOINTS.AUTH_SIGNUP_PATIENT}`:
        return handlePatientSignup(data as PatientSignupRequestDto) as TResponse
      case `POST ${API_ENDPOINTS.AUTH_LOGOUT}`:
        return handleLogout(data as LogoutRequestDto) as TResponse
      case `POST ${API_ENDPOINTS.AUTH_REFRESH}`:
        return handleRefresh(data as RefreshRequestDto) as TResponse
      case `DELETE ${API_ENDPOINTS.AUTH_WITHDRAW}`:
        return handleWithdraw(data as WithdrawRequestDto, accessToken) as TResponse
      default:
        throw new ApiError({
          statusCode: 404,
          source: 'mock',
          message: `Mock handler not found for ${method} ${url}`,
        })
    }
  },
}

export const MOCK_AUTH_DEMO_CREDENTIALS = {
  guardian: {
    email: DEMO_GUARDIAN_EMAIL,
    password: DEMO_PASSWORD,
  },
  patient: {
    loginId: DEMO_PATIENT_EMAIL,
    password: DEMO_PASSWORD,
    teamCode: DEMO_TEAM_CODE,
  },
} as const
