import type { AuthResponseDto } from './auth'

export type PatientGenderOption = 'male' | 'female' | ''

export type PatientGenderApiValue = 'M' | 'F'

export interface PatientProfileFormValues {
  name: string
  birthYear: string
  gender: PatientGenderOption
}

export interface PatientRoutineTagConfig {
  id: number
  label: string
}

export interface PatientRoutineSlotConfig {
  id: number
  label: string
  timeRange: string
  tags: PatientRoutineTagConfig[]
}

export type PatientRoutinesFormValues = Record<number, number | null>

export interface RegisterPatientInfoRequestDto {
  name: string
  birthYear: number
  gender: PatientGenderApiValue
}

export interface RegisterPatientInfoResponseDto {
  patientId: string
  teamCode: string
  createdAt: string
}

export interface RoutineCreateRequestDto {
  routines: Array<{
    timeSlotId: number
    activityTagId: number
  }>
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
  patientName: string | null
  verificationMode: 'lookup' | 'provisional'
}
