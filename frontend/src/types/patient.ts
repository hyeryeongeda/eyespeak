import type { AuthResponseDto } from './auth'

export type PatientGenderOption = 'male' | 'female' | ''

export type PatientGenderApiValue = 'M' | 'F'

export interface PatientProfileFormValues {
  name: string
  birthYear: string
  gender: PatientGenderOption
}

export interface PatientRoutineTagConfig {
  id: string
  label: string
}

export interface PatientRoutineSlotConfig {
  id: string
  label: string
  timeRange: string
  tags: PatientRoutineTagConfig[]
  allowEmpty?: boolean
  emptyHint?: string
}

export type PatientRoutinesFormValues = Record<string, string[]>

export interface RegisterPatientInfoRequestDto {
  name: string
  birthYear: number
  gender: PatientGenderApiValue
  survey: {
    routines: Array<{
      slotId: string
      selectedTagIds: string[]
    }>
  }
}

export interface RegisterPatientInfoResponseDto {
  patientId: string
  teamCode: string
  createdAt: string
}

export interface PatientAccountFormValues {
  name: string
  loginId: string
  password: string
  passwordConfirm: string
}

export interface PatientSignupRequestDto {
  teamCode: string
  name: string
  loginId: string
  password: string
}

export interface PatientSignupResponseDto extends AuthResponseDto {
  patientId: string
  teamCode: string
}

export interface VerifiedTeamCode {
  teamCode: string
  patientName: string
}
