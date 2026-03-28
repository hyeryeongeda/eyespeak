import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type {
  PatientSignupRequestDto,
  PatientSignupResponseDto,
  RegisterPatientInfoRequestDto,
  RegisterPatientInfoResponseDto,
} from '../types/patient'

export function registerPatientInfoApi(
  request: RegisterPatientInfoRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<RegisterPatientInfoResponseDto, RegisterPatientInfoRequestDto>(
    API_ENDPOINTS.PATIENTS,
    request,
    {
      accessToken,
    },
  )
}

export function signUpPatientApi(request: PatientSignupRequestDto) {
  return apiClient.post<PatientSignupResponseDto, PatientSignupRequestDto>(
    API_ENDPOINTS.AUTH_SIGNUP_PATIENT,
    request,
  )
}
