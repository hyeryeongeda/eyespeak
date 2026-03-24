import { apiClient } from './apiClient'
import { API_ENDPOINTS } from './apiEndpoints'
import type { TtsAudioResponseDto, TtsSynthesizeRequestDto } from '../types/tts'
import type { TtsSettingsResponse } from '../types/care'
import { getActiveAuthSession } from './authSessionRegistry'

function getAccessToken(): string | null {
  return getActiveAuthSession()?.accessToken ?? null
}

// ========================
// 보호자 TTS 설정 API
// ========================

export function getTtsSettingsApi() {
  return apiClient.get<TtsSettingsResponse>(API_ENDPOINTS.TTS_SETTINGS, {
    accessToken: getAccessToken(),
  })
}

export function toggleTtsSettingsApi() {
  return apiClient.patch<TtsSettingsResponse>(API_ENDPOINTS.TTS_SETTINGS_TOGGLE, undefined, {
    accessToken: getAccessToken(),
  })
}

export function uploadTtsVoicesApi(files: File[]) {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })

  return apiClient.post<TtsSettingsResponse, FormData>(API_ENDPOINTS.TTS_VOICES, formData, {
    accessToken: getAccessToken(),
  })
}

export function deleteTtsVoiceApi(voiceFileId: number) {
  return apiClient.delete<TtsSettingsResponse>(`${API_ENDPOINTS.TTS_VOICES}/${voiceFileId}`, undefined, {
    accessToken: getAccessToken(),
  })
}

// ========================
// AI TTS API (환자 모드용 — 기존 유지)
// ========================

export function synthesizeTtsApi(
  request: TtsSynthesizeRequestDto,
  accessToken?: string | null,
) {
  return apiClient.post<TtsAudioResponseDto | string | Blob, TtsSynthesizeRequestDto>(
    API_ENDPOINTS.TTS_SYNTHESIZE,
    request,
    {
      accessToken,
    },
  )
}
